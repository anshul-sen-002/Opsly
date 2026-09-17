package com.opsly.invoice.repository;

import com.opsly.invoice.entity.Invoice;
import com.opsly.job.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByJob(Job job);

    // Check if invoice already exists for a job before creating a new one
    boolean existsByJob(Job job);

    // Customer: see only their own invoices
    org.springframework.data.domain.Page<Invoice> findByCustomerId(Long customerId, org.springframework.data.domain.Pageable pageable);

    // Dashboard: latest invoices for the recent activity feed
    List<Invoice> findTop3ByOrderByCreatedAtDesc();
}

