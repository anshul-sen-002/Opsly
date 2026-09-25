package com.opsly.invoice.dto;

import com.opsly.invoice.entity.InvoiceStatus;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;

@Getter
@Setter
public class InvoiceResponse {
    private Long id;
    private Long jobId;
    private Long customerId;
    private String customerName;
    private String invoiceNumber;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private InvoiceStatus status;
    private LocalDate issuedAt;
    private LocalDate dueDate;
    private Instant createdAt;
    private String fileUrl;
}