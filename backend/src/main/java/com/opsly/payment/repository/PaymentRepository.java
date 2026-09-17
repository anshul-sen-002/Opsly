package com.opsly.payment.repository;

import com.opsly.invoice.entity.Invoice;
import com.opsly.payment.entity.Payment;
import com.opsly.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    org.springframework.data.domain.Page<Payment> findByInvoiceCustomerId(
            Long customerId, org.springframework.data.domain.Pageable pageable);

    List<Payment> findByInvoice(Invoice invoice);

    // Sum of all successful payments for an invoice — used to update invoice status
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.invoice = :invoice AND p.status = :status")
    BigDecimal sumAmountByInvoiceAndStatus(Invoice invoice, PaymentStatus status);

    // ---- Dashboard aggregations ----

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p " +
           "WHERE p.status = :status AND p.paidAt >= :since AND p.paidAt < :until")
    BigDecimal sumAmountByStatusAndPaidAtBetween(
            @Param("status") PaymentStatus status,
            @Param("since") LocalDateTime since,
            @Param("until") LocalDateTime until);

    /** Successful payments since the given moment — bucketed per day by the dashboard service */
    @Query("SELECT p FROM Payment p WHERE p.status = :status AND p.paidAt >= :since")
    List<Payment> findSuccessfulSince(@Param("status") PaymentStatus status, @Param("since") LocalDateTime since);

    List<Payment> findTop3ByOrderByCreatedAtDesc();
}

