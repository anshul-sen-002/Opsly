package com.opsly.customer.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ConflictException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.customer.dto.CustomerRequest;
import com.opsly.customer.dto.CustomerResponse;
import com.opsly.customer.dto.GrantPortalAccessRequest;
import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Customer service handles CRUD for Customer records.
 *
 * Two ways a Customer can get a login account:
 *   1. Self-registration via POST /api/auth/customer/register
 *   2. Staff grants access via POST /api/customers/{id}/grant-access
 */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ModelMapper modelMapper;

    // Staff creates a customer without a login account (user_id = null)
    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        Customer customer = modelMapper.map(request, Customer.class);
        customer.setUser(null);
        return toResponse(customerRepository.save(customer));
    }

    public Page<CustomerResponse> getAllCustomers(Pageable pageable, boolean deleted) {
        // deleted=false → active customers, deleted=true → trash (restorable)
        return customerRepository.findByDeleted(deleted, pageable).map(this::toResponse);
    }

    public CustomerResponse getCustomerById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        Customer customer = findById(id);
        if (customer.isDeleted()) {
            throw new BadRequestException("Cannot update a deleted customer. Restore it first.");
        }
        modelMapper.map(request, customer);
        return toResponse(customerRepository.save(customer));
    }

    /**
     * Customer's own profile — resolved from the authenticated User, never from
     * a client-supplied id. Used by the customer portal "My Profile" page.
     */
    @Transactional
    public CustomerResponse updateMyProfile(User caller, CustomerRequest request) {
        Customer customer = findByUser(caller);
        return updateCustomer(customer.getId(), request);
    }

    public CustomerResponse getMyProfile(User caller) {
        return toResponse(findByUser(caller));
    }

    /**
     * Soft deletes a customer record.
     * The row is kept (deleted = true) so it can be restored later.
     */
    @Transactional
    public CustomerResponse deleteCustomer(Long id) {
        Customer customer = findById(id);
        if (customer.isDeleted()) {
            throw new BadRequestException("Customer is already deleted");
        }

        customer.setDeleted(true);
        customer.setDeletedAt(LocalDateTime.now());
        return toResponse(customerRepository.save(customer));
    }

    // Restore a soft-deleted customer record
    @Transactional
    public CustomerResponse restoreCustomer(Long id) {
        Customer customer = findById(id);
        if (!customer.isDeleted()) {
            throw new BadRequestException("Customer is not deleted");
        }

        customer.setDeleted(false);
        customer.setDeletedAt(null);
        return toResponse(customerRepository.save(customer));
    }

    /**
     * Grants portal login access to an existing staff-created customer.
     *
     * Flow:
     *   Find Customer (must have user_id = null)
     *     -> Create User (role = CUSTOMER)
     *     -> Link customer.user = new User
     *     -> Commit (both writes in one transaction)
     *
     * After this, customer can log in via POST /api/auth/customer/login.
     */
    @Transactional
    public CustomerResponse grantPortalAccess(Long customerId, GrantPortalAccessRequest request) {
        Customer customer = findById(customerId);

        // Already has a login account — nothing to do
        if (customer.getUser() != null) {
            throw new BadRequestException("Customer already has a login account");
        }

        // Email must not be taken by any existing User
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email is already registered");
        }

        // Create User account — role always CUSTOMER, never from client
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();
        user = userRepository.save(user);

        // Link the User to the Customer profile
        customer.setUser(user);
        return toResponse(customerRepository.save(customer));
    }

    // Ppackage-visible helper used by other services (e.g. JobService)
    public Customer findById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }

    // Resolve the customer profile linked to an authenticated User
    private Customer findByUser(User caller) {
        return customerRepository.findByUser(caller)
                .orElseThrow(() -> new ResourceNotFoundException("No customer profile linked to this account"));
    }

    private CustomerResponse toResponse(Customer customer) {
        CustomerResponse response = modelMapper.map(customer, CustomerResponse.class);
        User user = customer.getUser();
        response.setHasLoginAccount(user != null);
        response.setUserId(user != null ? user.getId() : null);
        response.setProfileImageUrl(user != null ? user.getProfileImageUrl() : null);
        return response;
    }
}