package com.opsly.invoice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class InvoiceRequest {
    @NotNull(message = "Job ID is required")
    private Long jobId;

    @NotNull
    @Positive(message = "Subtotal must be positive")
    private BigDecimal subtotal;

    private BigDecimal tax;
    private LocalDate dueDate;
}