package com.opsly.payment.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.invoice.entity.Invoice;
import com.opsly.invoice.entity.InvoiceStatus;
import com.opsly.invoice.service.InvoiceService;
import com.opsly.notification.event.NotificationEvents;
import com.opsly.payment.dto.PaymentRequest;
import com.opsly.payment.dto.PaymentResponse;
import com.opsly.payment.entity.Payment;
import com.opsly.payment.entity.PaymentStatus;
import com.opsly.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * PaymentService records payments and updates invoice status atomically.
 *
 * Flow:
 *   Record Payment (SUCCESS)
 *     -> Calculate total paid
 *     -> Update Invoice (PARTIALLY_PAID or PAID)
 *     -> Commit both in one transaction
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceService invoiceService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PaymentResponse recordPayment(PaymentRequest request) {
        Invoice invoice = invoiceService.findById(request.getInvoiceId());

        // Cannot add payments to already-paid invoices
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BadRequestException("Invoice is already fully paid");
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.SUCCESS)
                .transactionReference(request.getTransactionReference())
                .paidAt(Instant.now())
                .build();

        payment = paymentRepository.save(payment);

        // Recalculate total paid and update invoice status atomically
        BigDecimal totalPaid = paymentRepository.sumAmountByInvoiceAndStatus(invoice, PaymentStatus.SUCCESS);
        invoiceService.updateInvoiceStatusForPayment(invoice, totalPaid);

        // Notify admins/managers (after commit)
        eventPublisher.publishEvent(new NotificationEvents.PaymentReceivedEvent(
                invoice.getId(), invoice.getInvoiceNumber(), payment.getAmount()));

        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> getCustomerPayments(Long customerId, Pageable pageable) {
        return paymentRepository.findByInvoiceCustomerId(customerId, pageable).map(this::toResponse);
    }

    @Transactional
    public PaymentResponse updatePayment(Long id, PaymentRequest request) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", id));
        Invoice invoice = payment.getInvoice();
        if (!invoice.getId().equals(request.getInvoiceId())) {
            throw new BadRequestException("A payment cannot be moved to another invoice");
        }
        payment.setAmount(request.getAmount());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setTransactionReference(request.getTransactionReference());
        paymentRepository.saveAndFlush(payment);
        invoiceService.updateInvoiceStatusForPayment(invoice,
                paymentRepository.sumAmountByInvoiceAndStatus(invoice, PaymentStatus.SUCCESS));
        return toResponse(payment);
    }

    @Transactional
    public void deletePayment(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", id));
        Invoice invoice = payment.getInvoice();
        paymentRepository.delete(payment);
        paymentRepository.flush();
        invoiceService.updateInvoiceStatusForPayment(invoice,
                paymentRepository.sumAmountByInvoiceAndStatus(invoice, PaymentStatus.SUCCESS));
    }

    public List<PaymentResponse> getPaymentsByInvoice(Long invoiceId) {
        Invoice invoice = invoiceService.findById(invoiceId);
        return paymentRepository.findByInvoice(invoice).stream()
                .map(this::toResponse)
                .toList();
    }

    public Page<PaymentResponse> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(this::toResponse);
    }

    public PaymentResponse getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", id));
        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setInvoiceId(payment.getInvoice().getId());
        response.setInvoiceNumber(payment.getInvoice().getInvoiceNumber());
        response.setAmount(payment.getAmount());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setStatus(payment.getStatus());
        response.setTransactionReference(payment.getTransactionReference());
        response.setPaidAt(payment.getPaidAt());
        response.setCreatedAt(payment.getCreatedAt());
        return response;
    }
}