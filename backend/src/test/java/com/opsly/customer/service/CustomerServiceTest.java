package com.opsly.customer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.customer.dto.GrantPortalAccessRequest;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Regression test: a customer's portal login is the linked User account, and
 * authentication only reads the users row. Deleting a customer without touching
 * that row let the deleted customer keep signing in, so the login must be
 * soft-deleted with the profile (and restored with it).
 */
@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    private static final long CUSTOMER_ID = 3L;

    @Mock CustomerRepository customerRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;

    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        customerService = new CustomerService(
                customerRepository, userRepository, passwordEncoder, new ModelMapper());
    }

    @Test
    void deletingCustomerAlsoRevokesTheLinkedLogin() {
        User login = login(UserStatus.ACTIVE, false);
        Customer customer = customer(login, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
        when(customerRepository.save(customer)).thenReturn(customer);

        customerService.deleteCustomer(CUSTOMER_ID);

        assertTrue(customer.isDeleted());
        assertNotNull(customer.getDeletedAt());
        assertTrue(customer.isLoginDisabledByDelete());
        assertTrue(login.isDeleted());
        assertNotNull(login.getDeletedAt());
        assertEquals(UserStatus.INACTIVE, login.getStatus());
        // Both conditions must fail: an account is allowed only when ACTIVE and NOT deleted
        assertFalse(login.isEnabled());
        verify(userRepository).save(login);
    }

    @Test
    void restoringCustomerRestoresTheLoginItDisabled() {
        User login = login(UserStatus.INACTIVE, true);
        login.setDeletedAt(Instant.now());
        Customer customer = customer(login, true);
        customer.setDeletedAt(Instant.now());
        customer.setLoginDisabledByDelete(true);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
        when(customerRepository.save(customer)).thenReturn(customer);

        customerService.restoreCustomer(CUSTOMER_ID);

        assertFalse(customer.isDeleted());
        assertNull(customer.getDeletedAt());
        assertFalse(customer.isLoginDisabledByDelete());
        assertFalse(login.isDeleted());
        assertNull(login.getDeletedAt());
        assertEquals(UserStatus.ACTIVE, login.getStatus());
        assertTrue(login.isEnabled());
        verify(userRepository).save(login);
    }

    @Test
    void restoringCustomerKeepsPreviouslyInactiveLoginInactive() {
        // The login was INACTIVE before the delete — the delete only added the
        // soft-delete flag, so restore must lift the flag but NOT re-activate.
        User login = login(UserStatus.INACTIVE, true);
        login.setDeletedAt(Instant.now());
        Customer customer = customer(login, true);
        customer.setDeletedAt(Instant.now());
        customer.setLoginDisabledByDelete(false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
        when(customerRepository.save(customer)).thenReturn(customer);

        customerService.restoreCustomer(CUSTOMER_ID);

        assertFalse(login.isDeleted());
        assertNull(login.getDeletedAt());
        assertEquals(UserStatus.INACTIVE, login.getStatus());
        assertFalse(login.isEnabled());
        assertFalse(customer.isLoginDisabledByDelete());
        verify(userRepository).save(login);
    }

    @Test
    void deletingCustomerWithInactiveLoginLeavesItInactive() {
        User login = login(UserStatus.INACTIVE, false);
        Customer customer = customer(login, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
        when(customerRepository.save(customer)).thenReturn(customer);

        customerService.deleteCustomer(CUSTOMER_ID);

        assertTrue(customer.isDeleted());
        assertFalse(customer.isLoginDisabledByDelete());
        assertTrue(login.isDeleted());
        assertEquals(UserStatus.INACTIVE, login.getStatus());
        verify(userRepository).save(login);
    }

    @Test
    void deletingWalkInCustomerWithoutLoginTouchesNoUserRow() {
        Customer customer = customer(null, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
        when(customerRepository.save(customer)).thenReturn(customer);

        customerService.deleteCustomer(CUSTOMER_ID);

        verifyNoInteractions(userRepository);
    }

    @Test
    void grantPortalAccessIsRejectedForDeletedCustomer() {
        Customer customer = customer(null, true);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

        assertThrows(BadRequestException.class,
                () -> customerService.grantPortalAccess(CUSTOMER_ID, new GrantPortalAccessRequest()));
        verifyNoInteractions(userRepository);
    }

    @Test
    void deletedCustomerProfileIsNotServedToThePortal() {
        User caller = login(UserStatus.ACTIVE, false);
        when(customerRepository.findByUserAndDeletedFalse(caller)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> customerService.getMyProfile(caller));
    }

    @Test
    void suspendingPortalAccessOnlyFlipsTheStatus() {
        User login = login(UserStatus.ACTIVE, false);
        Customer customer = customer(login, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

        customerService.updateLoginStatus(CUSTOMER_ID, UserStatus.INACTIVE);

        assertEquals(UserStatus.INACTIVE, login.getStatus());
        // Suspend ≠ delete: the soft-delete flag must stay untouched
        assertFalse(login.isDeleted());
        assertNull(login.getDeletedAt());
        assertFalse(customer.isLoginDisabledByDelete());
        // The account can no longer sign in
        assertFalse(login.isEnabled());
        verify(userRepository).save(login);
    }

    @Test
    void reactivatingPortalAccessAllowsSignInAgain() {
        User login = login(UserStatus.INACTIVE, false);
        Customer customer = customer(login, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

        customerService.updateLoginStatus(CUSTOMER_ID, UserStatus.ACTIVE);

        assertEquals(UserStatus.ACTIVE, login.getStatus());
        assertFalse(login.isDeleted());
        assertTrue(login.isEnabled());
        verify(userRepository).save(login);
    }

    @Test
    void togglingLoginStatusIsRejectedWithoutALogin() {
        Customer customer = customer(null, false);
        when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

        assertThrows(BadRequestException.class,
                () -> customerService.updateLoginStatus(CUSTOMER_ID, UserStatus.INACTIVE));
        verifyNoInteractions(userRepository);
    }

    private User login(UserStatus status, boolean deleted) {
        User user = User.builder()
                .email("customer@example.com")
                .password("x")
                .role(Role.CUSTOMER)
                .status(status)
                .deleted(deleted)
                .build();
        ReflectionTestUtils.setField(user, "id", 5L);
        return user;
    }

    private Customer customer(User login, boolean deleted) {
        Customer customer = Customer.builder()
                .name("Acme")
                .phone("9876543210")
                .user(login)
                .deleted(deleted)
                .build();
        ReflectionTestUtils.setField(customer, "id", CUSTOMER_ID);
        return customer;
    }
}
