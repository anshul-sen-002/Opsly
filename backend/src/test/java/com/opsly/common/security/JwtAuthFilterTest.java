package com.opsly.common.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import com.opsly.user.entity.UserStatus;
import com.opsly.user.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Regression test: an account that is gone (or no longer ACTIVE + not deleted)
 * must never receive API access, and a missing account must not blow up the
 * filter chain as a server error — it is simply unauthenticated.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    private static final String TOKEN = "abc";

    @Mock JwtUtil jwtUtil;
    @Mock UserDetailsServiceImpl userDetailsService;
    @Mock FilterChain chain;

    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter(jwtUtil, userDetailsService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deletedAccountBehindValidTokenIsUnauthenticated() throws Exception {
        when(jwtUtil.isTokenValid(TOKEN)).thenReturn(true);
        when(jwtUtil.extractEmail(TOKEN)).thenReturn("gone@example.com");
        when(userDetailsService.loadUserByUsername("gone@example.com"))
                .thenThrow(new UsernameNotFoundException("User not found"));

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        verify(chain).doFilter(any(), any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void deactivatedLoginGetsNoAuthentication() throws Exception {
        User user = login(UserStatus.INACTIVE, false);
        when(jwtUtil.isTokenValid(TOKEN)).thenReturn(true);
        when(jwtUtil.extractEmail(TOKEN)).thenReturn(user.getEmail());
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(user);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        verify(chain).doFilter(any(), any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void softDeletedLoginGetsNoAuthentication() throws Exception {
        User user = login(UserStatus.INACTIVE, true);
        when(jwtUtil.isTokenValid(TOKEN)).thenReturn(true);
        when(jwtUtil.extractEmail(TOKEN)).thenReturn(user.getEmail());
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(user);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        verify(chain).doFilter(any(), any());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void activeLoginIsAuthenticated() throws Exception {
        User user = login(UserStatus.ACTIVE, false);
        when(jwtUtil.isTokenValid(TOKEN)).thenReturn(true);
        when(jwtUtil.extractEmail(TOKEN)).thenReturn(user.getEmail());
        when(userDetailsService.loadUserByUsername(user.getEmail())).thenReturn(user);

        filter.doFilter(request(), new MockHttpServletResponse(), chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(user.getEmail(), SecurityContextHolder.getContext().getAuthentication().getName());
    }

    private MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + TOKEN);
        return request;
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
}
