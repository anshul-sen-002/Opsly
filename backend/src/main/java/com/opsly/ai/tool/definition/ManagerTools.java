package com.opsly.ai.tool.definition;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.opsly.ai.tool.Schema;
import com.opsly.ai.tool.ToolDefinition;
import com.opsly.customer.dto.CustomerRequest;
import com.opsly.customer.dto.CustomerResponse;
import com.opsly.customer.dto.GrantPortalAccessRequest;
import com.opsly.customer.service.CustomerService;
import com.opsly.invoice.dto.InvoiceRequest;
import com.opsly.invoice.dto.InvoiceResponse;
import com.opsly.invoice.service.InvoiceService;
import com.opsly.job.dto.AssignTechnicianRequest;
import com.opsly.job.dto.JobResponse;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.service.JobService;
import com.opsly.payment.dto.PaymentRequest;
import com.opsly.payment.dto.PaymentResponse;
import com.opsly.payment.entity.PaymentMethod;
import com.opsly.payment.service.PaymentService;
import com.opsly.technician.dto.TechnicianResponse;
import com.opsly.technician.service.TechnicianService;
import com.opsly.user.entity.Role;
import com.opsly.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tools available to ADMIN and MANAGER roles.
 *
 * Domains covered: customers, technicians, jobs (assign/close), invoices, payments.
 */
@Component
@RequiredArgsConstructor
public class ManagerTools {

    private static final Set<Role> ADMIN_MANAGER = Set.of(Role.ADMIN, Role.MANAGER);

    private final CustomerService customerService;
    private final TechnicianService technicianService;
    private final JobService jobService;
    private final InvoiceService invoiceService;
    private final PaymentService paymentService;
    private final ObjectMapper mapper;

    public List<ToolDefinition> getTools() {
        return List.of(
                // Customers
                createCustomer(), listCustomers(), getCustomer(), updateCustomer(), grantPortalAccess(),
                // Technicians
                listTechnicians(), getTechnician(),
                // Jobs
                listJobs(), getJob(), assignTechnician(), closeJob(),
                // Invoices
                createInvoice(), listInvoices(), getInvoice(), issueInvoice(),
                // Payments
                recordPayment(), listPayments()
        );
    }

    // ===== CUSTOMER TOOLS =====

    private ToolDefinition createCustomer() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("name",         Schema.string(mapper, "Customer full name"));
        props.put("phone",        Schema.string(mapper, "Phone number"));
        props.put("email",        Schema.string(mapper, "Email address (required — used for portal login and invoices)"));
        props.put("company_name", Schema.string(mapper, "Company name (optional)"));
        props.put("address",      Schema.string(mapper, "Address (optional)"));
        props.put("city",         Schema.string(mapper, "City (optional)"));
        return new ToolDefinition(
                "create_customer",
                "Create a customer record without a login account. Use grant_portal_access to add login later.",
                Schema.object(mapper, props, List.of("name", "phone", "email")),
                ADMIN_MANAGER,
                this::execCreateCustomer
        );
    }

    private String execCreateCustomer(JsonNode args, User caller) {
        CustomerRequest req = new CustomerRequest();
        req.setName(Schema.getString(args, "name"));
        req.setPhone(Schema.getString(args, "phone"));
        req.setEmail(Schema.getString(args, "email"));
        req.setCompanyName(Schema.getStringOrNull(args, "company_name"));
        req.setAddress(Schema.getStringOrNull(args, "address"));
        req.setCity(Schema.getStringOrNull(args, "city"));
        CustomerResponse r = customerService.createCustomer(req);
        return String.format("Customer created — ID: %d | Name: %s | Has login: %s",
                r.getId(), r.getName(), r.isHasLoginAccount());
    }

    private ToolDefinition listCustomers() {
        return new ToolDefinition(
                "list_customers",
                "List all customers with their basic info and whether they have a login account.",
                Schema.noParams(mapper),
                ADMIN_MANAGER,
                this::execListCustomers
        );
    }

    private String execListCustomers(JsonNode args, User caller) {
        // AI tools list active customers only — deleted records stay out of chat results
        Page<CustomerResponse> page = customerService.getAllCustomers(PageRequest.of(0, 50), false);
        if (page.isEmpty()) return "No customers found.";
        StringBuilder sb = new StringBuilder("Customers (" + page.getTotalElements() + " total):\n");
        for (CustomerResponse c : page.getContent()) {
            sb.append(String.format("  #%d | %s | %s | Login: %s\n",
                    c.getId(), c.getName(), c.getPhone(), c.isHasLoginAccount() ? "Yes" : "No"));
        }
        return sb.toString();
    }

    private ToolDefinition getCustomer() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("customer_id", Schema.integer(mapper, "The customer ID"));
        return new ToolDefinition(
                "get_customer",
                "Get full details of a specific customer.",
                Schema.object(mapper, props, List.of("customer_id")),
                ADMIN_MANAGER,
                this::execGetCustomer
        );
    }

    private String execGetCustomer(JsonNode args, User caller) {
        CustomerResponse c = customerService.getCustomerById(Schema.getLong(args, "customer_id"));
        return String.format("Customer #%d | Name: %s | Company: %s | Phone: %s | Email: %s | City: %s | Login: %s",
                c.getId(), c.getName(),
                nvl(c.getCompanyName()), c.getPhone(),
                nvl(c.getEmail()), nvl(c.getCity()),
                c.isHasLoginAccount() ? "Yes" : "No");
    }

    private ToolDefinition updateCustomer() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("customer_id",  Schema.integer(mapper, "The customer ID to update"));
        props.put("name",         Schema.string(mapper, "Customer full name"));
        props.put("phone",        Schema.string(mapper, "Phone number"));
        props.put("email",        Schema.string(mapper, "Email address (required — used for portal login and invoices)"));
        props.put("company_name", Schema.string(mapper, "Company name (optional)"));
        props.put("address",      Schema.string(mapper, "Address (optional)"));
        props.put("city",         Schema.string(mapper, "City (optional)"));
        return new ToolDefinition(
                "update_customer",
                "Update an existing customer record. Supply all fields, not just changed ones.",
                Schema.object(mapper, props, List.of("customer_id", "name", "phone", "email")),
                ADMIN_MANAGER,
                this::execUpdateCustomer
        );
    }

    private String execUpdateCustomer(JsonNode args, User caller) {
        CustomerRequest req = new CustomerRequest();
        req.setName(Schema.getString(args, "name"));
        req.setPhone(Schema.getString(args, "phone"));
        req.setEmail(Schema.getString(args, "email"));
        req.setCompanyName(Schema.getStringOrNull(args, "company_name"));
        req.setAddress(Schema.getStringOrNull(args, "address"));
        req.setCity(Schema.getStringOrNull(args, "city"));
        CustomerResponse r = customerService.updateCustomer(Schema.getLong(args, "customer_id"), req);
        return String.format("Customer updated — ID: %d | Name: %s", r.getId(), r.getName());
    }

    private ToolDefinition grantPortalAccess() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("customer_id", Schema.integer(mapper, "Customer ID to grant portal access to"));
        props.put("email",       Schema.string(mapper, "Login email for the new account"));
        props.put("password",    Schema.string(mapper, "Initial password"));
        return new ToolDefinition(
                "grant_portal_access",
                "Create a login account for an existing customer who has no login yet. Role is always set to CUSTOMER.",
                Schema.object(mapper, props, List.of("customer_id", "email", "password")),
                ADMIN_MANAGER,
                this::execGrantPortalAccess
        );
    }

    private String execGrantPortalAccess(JsonNode args, User caller) {
        GrantPortalAccessRequest req = new GrantPortalAccessRequest();
        req.setEmail(Schema.getString(args, "email"));
        req.setPassword(Schema.getString(args, "password"));
        CustomerResponse r = customerService.grantPortalAccess(Schema.getLong(args, "customer_id"), req);
        return String.format("Portal access granted — Customer #%d | Name: %s can now log in.", r.getId(), r.getName());
    }

    // ===== TECHNICIAN TOOLS =====

    private ToolDefinition listTechnicians() {
        return new ToolDefinition(
                "list_technicians",
                "List all technicians with their specialization and contact info.",
                Schema.noParams(mapper),
                ADMIN_MANAGER,
                this::execListTechnicians
        );
    }

    private String execListTechnicians(JsonNode args, User caller) {
        Page<TechnicianResponse> page = technicianService.getAllTechnicians(PageRequest.of(0, 50));
        if (page.isEmpty()) return "No technicians found.";
        StringBuilder sb = new StringBuilder("Technicians (" + page.getTotalElements() + " total):\n");
        for (TechnicianResponse t : page.getContent()) {
            sb.append(String.format("  #%d | %s | %s | %s\n",
                    t.getId(), t.getName(), nvl(t.getSpecialization()), t.getEmail()));
        }
        return sb.toString();
    }

    private ToolDefinition getTechnician() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("technician_id", Schema.integer(mapper, "The technician ID"));
        return new ToolDefinition(
                "get_technician",
                "Get details of a specific technician.",
                Schema.object(mapper, props, List.of("technician_id")),
                ADMIN_MANAGER,
                this::execGetTechnician
        );
    }

    private String execGetTechnician(JsonNode args, User caller) {
        TechnicianResponse t = technicianService.getTechnicianById(Schema.getLong(args, "technician_id"));
        return String.format("Technician #%d | Name: %s | Email: %s | Specialization: %s | Phone: %s",
                t.getId(), t.getName(), t.getEmail(), nvl(t.getSpecialization()), nvl(t.getPhone()));
    }

    // ===== JOB TOOLS =====

    private ToolDefinition listJobs() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("status", Schema.enumOf(mapper, "Filter by status (optional)",
                "PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED"));
        return new ToolDefinition(
                "list_jobs",
                "List all jobs. Optionally filter by status.",
                Schema.object(mapper, props, List.of()),
                ADMIN_MANAGER,
                this::execListJobs
        );
    }

    private String execListJobs(JsonNode args, User caller) {
        String statusStr = Schema.getStringOrNull(args, "status");
        Page<JobResponse> page = statusStr != null
                ? jobService.getJobsByStatus(JobStatus.valueOf(statusStr.toUpperCase()), PageRequest.of(0, 50))
                : jobService.getAllJobs(PageRequest.of(0, 50));
        if (page.isEmpty()) return "No jobs found.";
        StringBuilder sb = new StringBuilder("Jobs (" + page.getTotalElements() + " total):\n");
        for (JobResponse j : page.getContent()) {
            sb.append(String.format("  #%d | %s | Customer: %s | Technician: %s\n",
                    j.getId(), j.getStatus(), j.getCustomerName(),
                    j.getTechnicianName() != null ? j.getTechnicianName() : "Unassigned"));
        }
        return sb.toString();
    }

    private ToolDefinition getJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "The job ID"));
        return new ToolDefinition(
                "get_job",
                "Get full details of a specific job.",
                Schema.object(mapper, props, List.of("job_id")),
                ADMIN_MANAGER,
                this::execGetJob
        );
    }

    private String execGetJob(JsonNode args, User caller) {
        JobResponse j = jobService.getJobById(Schema.getLong(args, "job_id"));
        return String.format("Job #%d | Status: %s | Customer: %s | Technician: %s | Desc: %s | Scheduled: %s",
                j.getId(), j.getStatus(), j.getCustomerName(),
                j.getTechnicianName() != null ? j.getTechnicianName() : "Unassigned",
                j.getDescription(), j.getScheduledAt() != null ? j.getScheduledAt() : "Not set");
    }

    private ToolDefinition assignTechnician() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id",        Schema.integer(mapper, "Job ID to assign"));
        props.put("technician_id", Schema.integer(mapper, "Technician ID to assign"));
        return new ToolDefinition(
                "assign_technician",
                "Assign a technician to a PENDING job. Transitions job status to ASSIGNED.",
                Schema.object(mapper, props, List.of("job_id", "technician_id")),
                ADMIN_MANAGER,
                this::execAssignTechnician
        );
    }

    private String execAssignTechnician(JsonNode args, User caller) {
        AssignTechnicianRequest req = new AssignTechnicianRequest();
        req.setTechnicianId(Schema.getLong(args, "technician_id"));
        JobResponse r = jobService.assignTechnician(Schema.getLong(args, "job_id"), req);
        return String.format("Technician assigned to Job #%d | Status: %s | Technician: %s",
                r.getId(), r.getStatus(), r.getTechnicianName());
    }

    private ToolDefinition closeJob() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id", Schema.integer(mapper, "Job ID to close"));
        return new ToolDefinition(
                "close_job",
                "Close a COMPLETED job after verifying the work. Transitions status to CLOSED.",
                Schema.object(mapper, props, List.of("job_id")),
                ADMIN_MANAGER,
                this::execCloseJob
        );
    }

    private String execCloseJob(JsonNode args, User caller) {
        JobResponse r = jobService.closeJob(Schema.getLong(args, "job_id"));
        return String.format("Job #%d closed. Status: %s", r.getId(), r.getStatus());
    }

    // ===== INVOICE TOOLS =====

    private ToolDefinition createInvoice() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("job_id",   Schema.integer(mapper, "ID of the CLOSED job to invoice"));
        props.put("subtotal", Schema.number(mapper, "Subtotal amount before tax"));
        props.put("tax",      Schema.number(mapper, "Tax amount (optional, defaults to 0)"));
        props.put("due_date", Schema.string(mapper, "Due date ISO format YYYY-MM-DD (optional)"));
        return new ToolDefinition(
                "create_invoice",
                "Create an invoice for a CLOSED job. Only one invoice per job is allowed.",
                Schema.object(mapper, props, List.of("job_id", "subtotal")),
                ADMIN_MANAGER,
                this::execCreateInvoice
        );
    }

    private String execCreateInvoice(JsonNode args, User caller) {
        InvoiceRequest req = new InvoiceRequest();
        req.setJobId(Schema.getLong(args, "job_id"));
        req.setSubtotal(new BigDecimal(Schema.getString(args, "subtotal")));
        String taxStr = Schema.getStringOrNull(args, "tax");
        if (taxStr != null) req.setTax(new BigDecimal(taxStr));
        String due = Schema.getStringOrNull(args, "due_date");
        if (due != null) req.setDueDate(LocalDate.parse(due));
        InvoiceResponse r = invoiceService.createInvoice(req);
        return String.format("Invoice created — ID: %d | Number: %s | Total: %s | Status: %s",
                r.getId(), r.getInvoiceNumber(), r.getTotalAmount(), r.getStatus());
    }

    private ToolDefinition listInvoices() {
        return new ToolDefinition(
                "list_invoices",
                "List all invoices with their status and total amount.",
                Schema.noParams(mapper),
                ADMIN_MANAGER,
                this::execListInvoices
        );
    }

    private String execListInvoices(JsonNode args, User caller) {
        Page<InvoiceResponse> page = invoiceService.getAllInvoices(PageRequest.of(0, 50));
        if (page.isEmpty()) return "No invoices found.";
        StringBuilder sb = new StringBuilder("Invoices (" + page.getTotalElements() + " total):\n");
        for (InvoiceResponse i : page.getContent()) {
            sb.append(String.format("  #%d (%s) | Customer: %s | Total: %s | Status: %s\n",
                    i.getId(), i.getInvoiceNumber(), i.getCustomerName(), i.getTotalAmount(), i.getStatus()));
        }
        return sb.toString();
    }

    private ToolDefinition getInvoice() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("invoice_id", Schema.integer(mapper, "The invoice ID"));
        return new ToolDefinition(
                "get_invoice",
                "Get full details of a specific invoice.",
                Schema.object(mapper, props, List.of("invoice_id")),
                ADMIN_MANAGER,
                this::execGetInvoice
        );
    }

    private String execGetInvoice(JsonNode args, User caller) {
        InvoiceResponse i = invoiceService.getInvoiceById(Schema.getLong(args, "invoice_id"));
        return String.format("Invoice #%d (%s) | Customer: %s | Subtotal: %s | Tax: %s | Total: %s | Status: %s | Due: %s",
                i.getId(), i.getInvoiceNumber(), i.getCustomerName(),
                i.getSubtotal(), i.getTax(), i.getTotalAmount(), i.getStatus(),
                i.getDueDate() != null ? i.getDueDate() : "Not set");
    }

    private ToolDefinition issueInvoice() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("invoice_id", Schema.integer(mapper, "Invoice ID to issue"));
        return new ToolDefinition(
                "issue_invoice",
                "Issue a DRAFT invoice to the customer (transitions to ISSUED).",
                Schema.object(mapper, props, List.of("invoice_id")),
                ADMIN_MANAGER,
                this::execIssueInvoice
        );
    }

    private String execIssueInvoice(JsonNode args, User caller) {
        InvoiceResponse r = invoiceService.issueInvoice(Schema.getLong(args, "invoice_id"));
        return String.format("Invoice #%d issued. Status: %s | Issued on: %s", r.getId(), r.getStatus(), r.getIssuedAt());
    }

    // ===== PAYMENT TOOLS =====

    private ToolDefinition recordPayment() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("invoice_id",           Schema.integer(mapper, "Invoice ID to record payment against"));
        props.put("amount",               Schema.number(mapper, "Payment amount"));
        props.put("payment_method",       Schema.enumOf(mapper, "Payment method", "CASH", "UPI", "CARD", "BANK_TRANSFER"));
        props.put("transaction_reference",Schema.string(mapper, "Optional transaction reference (UPI ID, card last 4, etc.)"));
        return new ToolDefinition(
                "record_payment",
                "Record a payment against an invoice. Invoice status is updated automatically (PARTIALLY_PAID or PAID).",
                Schema.object(mapper, props, List.of("invoice_id", "amount", "payment_method")),
                ADMIN_MANAGER,
                this::execRecordPayment
        );
    }

    private String execRecordPayment(JsonNode args, User caller) {
        PaymentRequest req = new PaymentRequest();
        req.setInvoiceId(Schema.getLong(args, "invoice_id"));
        req.setAmount(new BigDecimal(Schema.getString(args, "amount")));
        req.setPaymentMethod(PaymentMethod.valueOf(Schema.getString(args, "payment_method").toUpperCase()));
        req.setTransactionReference(Schema.getStringOrNull(args, "transaction_reference"));
        PaymentResponse r = paymentService.recordPayment(req);
        return String.format("Payment recorded — ID: %d | Amount: %s | Method: %s | Invoice: %s | Status: %s",
                r.getId(), r.getAmount(), r.getPaymentMethod(), r.getInvoiceNumber(), r.getStatus());
    }

    private ToolDefinition listPayments() {
        Map<String, ObjectNode> props = new LinkedHashMap<>();
        props.put("invoice_id", Schema.integer(mapper, "Invoice ID to list payments for"));
        return new ToolDefinition(
                "list_payments",
                "List all payments recorded against a specific invoice.",
                Schema.object(mapper, props, List.of("invoice_id")),
                ADMIN_MANAGER,
                this::execListPayments
        );
    }

    private String execListPayments(JsonNode args, User caller) {
        var payments = paymentService.getPaymentsByInvoice(Schema.getLong(args, "invoice_id"));
        if (payments.isEmpty()) return "No payments found for this invoice.";
        StringBuilder sb = new StringBuilder("Payments (" + payments.size() + "):\n");
        for (PaymentResponse p : payments) {
            sb.append(String.format("  #%d | Amount: %s | Method: %s | Status: %s | Ref: %s\n",
                    p.getId(), p.getAmount(), p.getPaymentMethod(), p.getStatus(),
                    nvl(p.getTransactionReference())));
        }
        return sb.toString();
    }

    private String nvl(String v) { return v != null ? v : "N/A"; }
}