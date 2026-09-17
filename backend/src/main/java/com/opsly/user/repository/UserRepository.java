package com.opsly.user.repository;

import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Used by admin bootstrap to check if any ADMIN already exists
    boolean existsByRole(Role role);

    // Staff list excludes CUSTOMER accounts
    org.springframework.data.domain.Page<User> findByRoleNot(Role role, org.springframework.data.domain.Pageable pageable);

    // Staff list for a specific trash state (false = active accounts, true = deleted accounts)
    org.springframework.data.domain.Page<User> findByRoleNotAndDeleted(Role role, boolean deleted, org.springframework.data.domain.Pageable pageable);

    // Exclude soft-deleted accounts from login lookups
    Optional<User> findByEmailAndDeletedFalse(String email);

    // Notification recipients for a set of staff roles (excludes deleted accounts)
    java.util.List<User> findByRoleInAndDeletedFalse(java.util.List<Role> roles);
}

