package com.opsly.payment.dto;

import com.opsly.payment.entity.PaymentMethod;
import com.opsly.payment.entity.PaymentStatus;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
public class PaymentResponse {
    private Long id;
    private Long invoiceId;
    private String invoiceNumber;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String transactionReference;
    private Instant paidAt;
    private Instant createdAt;
}