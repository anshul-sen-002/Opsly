package com.opsly.customer.repository;

import com.opsly.customer.entity.Customer;
import com.opsly.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByUser(User user);

    boolean existsByEmail(String email);

    // Customer list for a specific trash state (false = active, true = deleted)
    org.springframework.data.domain.Page<Customer> findByDeleted(boolean deleted, org.springframework.data.domain.Pageable pageable);

    // ---- Dashboard aggregations ----

    long countByDeletedFalse();

    long countByDeletedFalseAndCreatedAtAfter(LocalDateTime since);

    long countByDeletedFalseAndCreatedAtBefore(LocalDateTime before);

    List<Customer> findTop2ByDeletedFalseOrderByCreatedAtDesc();
}


