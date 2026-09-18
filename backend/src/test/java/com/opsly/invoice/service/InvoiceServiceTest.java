package com.opsly.invoice.service;

import com.opsly.common.upload.CloudinaryService;
import com.opsly.customer.entity.Customer;
import com.opsly.invoice.dto.InvoiceRequest;
import com.opsly.invoice.dto.InvoiceResponse;
import com.opsly.invoice.entity.Invoice;
import com.opsly.invoice.entity.InvoiceSequence;
import com.opsly.invoice.entity.InvoiceStatus;
import com.opsly.invoice.repository.InvoiceRepository;
import com.opsly.job.entity.Job;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.payment.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {
    @Mock InvoiceRepository invoiceRepository;
    @Mock InvoiceSequence invoiceSequence;
    @Mock JobService jobService;
    @Mock PaymentRepository paymentRepository;
    @Mock CloudinaryService cloudinaryService;
    @Mock ApplicationEventPublisher eventPublisher;
    @InjectMocks InvoiceService invoiceService;

    @Test
    void createDraftAssignsInvoiceNumberBeforeSaving() {
        Customer customer = Customer.builder().id(3L).name("Test Customer").build();
        Job job = Job.builder().id(1L).customer(customer).status(JobStatus.CLOSED).build();
        InvoiceRequest request = new InvoiceRequest();
        request.setJobId(job.getId());
        request.setSubtotal(new BigDecimal("2500.00"));
        request.setTax(new BigDecimal("245.00"));
        request.setDueDate(LocalDate.of(2026, 9, 18));
        when(jobService.findById(job.getId())).thenReturn(job);
        when(invoiceSequence.nextNumber()).thenReturn("INV-2026-0004");
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            // Assert at the persistence boundary, not after a later update.
            assertEquals("INV-2026-0004", invoice.getInvoiceNumber());
            assertEquals(InvoiceStatus.DRAFT, invoice.getStatus());
            invoice.setId(4L);
            return invoice;
        });

        InvoiceResponse response = invoiceService.createInvoice(request);

        assertEquals("INV-2026-0004", response.getInvoiceNumber());
        assertEquals(InvoiceStatus.DRAFT, response.getStatus());
        assertEquals(new BigDecimal("2745.00"), response.getTotalAmount());
        assertEquals(request.getDueDate(), response.getDueDate());
        var order = inOrder(invoiceSequence, invoiceRepository);
        order.verify(invoiceSequence).nextNumber();
        order.verify(invoiceRepository).save(any(Invoice.class));
    }
}
