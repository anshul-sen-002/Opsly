package com.opsly.invoice.service;

import com.opsly.common.exception.BadRequestException;
import com.opsly.common.exception.ConflictException;
import com.opsly.common.exception.ForbiddenException;
import com.opsly.common.exception.ResourceNotFoundException;
import com.opsly.common.upload.CloudinaryService;
import com.opsly.common.upload.UploadResult;
import com.opsly.invoice.dto.InvoiceRequest;
import com.opsly.invoice.dto.InvoiceResponse;
import com.opsly.invoice.entity.Invoice;
import com.opsly.invoice.entity.InvoiceStatus;
import com.opsly.invoice.repository.InvoiceRepository;
import com.opsly.job.entity.Job;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.notification.event.NotificationEvents;
import com.opsly.payment.entity.PaymentStatus;
import com.opsly.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Invoice service — creates and manages invoices for closed jobs.
 * Invoice creation is only allowed after the Job is CLOSED.
 */
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final JobService jobService;
    private final PaymentRepository paymentRepository;
    private final CloudinaryService cloudinaryService;
    private final ApplicationEventPublisher eventPublisher;

    // Simple in-memory sequence for invoice numbers — use DB sequence in production
    private final AtomicLong invoiceSequence = new AtomicLong(1);

    @Transactional
    public InvoiceResponse createInvoice(InvoiceRequest request) {
        Job job = jobService.findById(request.getJobId());

        // Invoice should only be created for closed jobs
        if (job.getStatus() != JobStatus.CLOSED) {
            throw new BadRequestException("Invoice can only be created for CLOSED jobs");
        }

        if (invoiceRepository.existsByJob(job)) {
            throw new ConflictException("Invoice already exists for this job");
        }

        BigDecimal tax = request.getTax() != null ? request.getTax() : BigDecimal.ZERO;
        BigDecimal total = request.getSubtotal().add(tax);
        String invoiceNumber = generateInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .job(job)
                .customer(job.getCustomer())
                .invoiceNumber(invoiceNumber)
                .subtotal(request.getSubtotal())
                .tax(tax)
                .totalAmount(total)
                .status(InvoiceStatus.DRAFT)
                .dueDate(request.getDueDate())
                .build();

        return toResponse(invoiceRepository.save(invoice));
    }

    public Page<InvoiceResponse> getAllInvoices(Pageable pageable) {
        return invoiceRepository.findAll(pageable).map(this::toResponse);
    }

    public InvoiceResponse getInvoiceById(Long id) {
        return toResponse(findById(id));
    }

    // Issue an invoice (DRAFT -> ISSUED)
    @Transactional
    public InvoiceResponse issueInvoice(Long id) {
        Invoice invoice = findById(id);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BadRequestException("Only DRAFT invoices can be issued");
        }
        invoice.setStatus(InvoiceStatus.ISSUED);
        invoice.setIssuedAt(LocalDate.now());
        Invoice saved = invoiceRepository.save(invoice);

        // Notify the customer's account (after commit) — skipped when no login exists
        if (saved.getCustomer().getUser() != null) {
            eventPublisher.publishEvent(new NotificationEvents.InvoiceIssuedEvent(
                    saved.getId(),
                    saved.getCustomer().getUser().getId(),
                    saved.getInvoiceNumber(),
                    saved.getTotalAmount(),
                    saved.getStatus()
            ));
        }
        return toResponse(saved);
    }

    /**
     * Uploads or replaces the invoice file (PDF/scan) on Cloudinary.
     * The stored secure_url and public_id are saved on the invoice;
     * replacing a file deletes the previous Cloudinary asset.
     */
    @Transactional
    public InvoiceResponse uploadFile(Long id, MultipartFile file) {
        Invoice invoice = findById(id);
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        UploadResult uploaded = cloudinaryService.upload(file, "opsly/invoice-files");
        String previousPublicId = invoice.getFilePublicId();
        invoice.setFileUrl(uploaded.getSecureUrl());
        invoice.setFilePublicId(uploaded.getPublicId());
        InvoiceResponse response = toResponse(invoiceRepository.save(invoice));
        cloudinaryService.deleteQuietly(previousPublicId);
        return response;
    }

    public Invoice findById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
    }

    /**
     * Customer: list only their own invoices.
     * customerId is derived from the authenticated user's Customer profile — never from client input.
     */
    public Page<InvoiceResponse> getMyInvoices(Long customerId, Pageable pageable) {
        return invoiceRepository.findByCustomerId(customerId, pageable).map(this::toResponse);
    }

    /**
     * Customer: get a single invoice — ownership check enforced.
     * Throws ForbiddenException if the invoice does not belong to this customer.
     */
    public InvoiceResponse getMyInvoiceById(Long invoiceId, Long customerId) {
        Invoice invoice = findById(invoiceId);
        if (!invoice.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("You do not have access to this invoice");
        }
        return toResponse(invoice);
    }

    // Called by PaymentService when payment is recorded to update invoice status
    @Transactional
    public void updateInvoiceStatusForPayment(Invoice invoice, BigDecimal totalPaid) {
        if (totalPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        } else if (invoice.getIssuedAt() == null) {
            invoice.setStatus(InvoiceStatus.DRAFT);
        } else if (invoice.getDueDate() != null && invoice.getDueDate().isBefore(LocalDate.now())) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
        } else {
            invoice.setStatus(InvoiceStatus.ISSUED);
        }
        invoiceRepository.save(invoice);
    }

    private String generateInvoiceNumber() {
        int year = LocalDate.now().getYear();
        return String.format("INV-%d-%04d", year, invoiceSequence.getAndIncrement());
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        InvoiceResponse response = new InvoiceResponse();
        response.setId(invoice.getId());
        response.setJobId(invoice.getJob().getId());
        response.setCustomerId(invoice.getCustomer().getId());
        response.setCustomerName(invoice.getCustomer().getName());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setSubtotal(invoice.getSubtotal());
        response.setTax(invoice.getTax());
        response.setTotalAmount(invoice.getTotalAmount());
        response.setPaidAmount(paymentRepository.sumAmountByInvoiceAndStatus(invoice, PaymentStatus.SUCCESS));
        response.setStatus(invoice.getStatus());
        response.setIssuedAt(invoice.getIssuedAt());
        response.setDueDate(invoice.getDueDate());
        response.setCreatedAt(invoice.getCreatedAt());
        response.setFileUrl(invoice.getFileUrl());
        return response;
    }
}