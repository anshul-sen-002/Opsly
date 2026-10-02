package com.opsly.dashboard.service;

import com.opsly.customer.repository.CustomerRepository;
import com.opsly.dashboard.dto.DashboardSummaryResponse;
import com.opsly.dashboard.dto.DashboardSummaryResponse.Stat;
import com.opsly.invoice.repository.InvoiceRepository;
import com.opsly.job.repository.JobRepository;
import com.opsly.payment.entity.PaymentStatus;
import com.opsly.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock JobRepository jobRepository;
    @Mock CustomerRepository customerRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock PaymentRepository paymentRepository;
    @InjectMocks DashboardService dashboardService;

    /**
     * Payments recorded outside the current calendar month make the Monthly
     * Revenue card read zero — the card must keep its existing key so the
     * dashboard summary keeps rendering.
     */
    @Test
    void summaryReportsZeroMonthlyRevenueWhenThisMonthHasNoPayments() {
        when(paymentRepository.sumAmountByStatusAndPaidAtBetween(eq(PaymentStatus.SUCCESS), any(), any()))
                .thenReturn(BigDecimal.ZERO);

        DashboardSummaryResponse summary = dashboardService.getSummary(7);

        Stat monthlyRevenue = stat(summary, "monthly_revenue");
        assertEquals(0.0, monthlyRevenue.getValue());
    }

    private Stat stat(DashboardSummaryResponse summary, String key) {
        return summary.getStats().stream()
                .filter(s -> key.equals(s.getKey()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing stat: " + key));
    }
}