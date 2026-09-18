package com.opsly.dashboard.service;

import com.opsly.customer.entity.Customer;
import com.opsly.customer.repository.CustomerRepository;
import com.opsly.dashboard.dto.DashboardSummaryResponse;
import com.opsly.dashboard.dto.DashboardSummaryResponse.ActivityItem;
import com.opsly.dashboard.dto.DashboardSummaryResponse.Overview;
import com.opsly.dashboard.dto.DashboardSummaryResponse.Stat;
import com.opsly.dashboard.dto.DashboardSummaryResponse.StatusCount;
import com.opsly.dashboard.dto.DashboardSummaryResponse.TopCustomer;
import com.opsly.invoice.entity.Invoice;
import com.opsly.invoice.repository.InvoiceRepository;
import com.opsly.job.entity.Job;
import com.opsly.job.entity.JobStatus;
import com.opsly.job.repository.JobRepository;
import com.opsly.payment.entity.Payment;
import com.opsly.payment.entity.PaymentStatus;
import com.opsly.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final DateTimeFormatter DAY_LABEL = DateTimeFormatter.ofPattern("MMM d");
    private static final Set<Integer> ALLOWED_RANGES = Set.of(7, 14, 30);
    private static final int SPARKLINE_DAYS = 7;

    private final JobRepository jobRepository;
    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(int requestedDays) {
        int days = ALLOWED_RANGES.contains(requestedDays) ? requestedDays : 7;
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime windowStart = today.minusDays(days - 1L).atStartOfDay();
        LocalDateTime weekStart = today.minusDays(SPARKLINE_DAYS - 1L).atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime lastMonthStart = today.withDayOfMonth(1).minusMonths(1).atStartOfDay();
        LocalDateTime monthEnd = today.plusDays(1).atStartOfDay();
        List<Job> windowJobs = jobRepository.findCreatedSince(windowStart);
        long totalJobs = jobRepository.count();
        long inProgress = jobRepository.countByStatus(JobStatus.IN_PROGRESS);
        long assigned = jobRepository.countByStatus(JobStatus.ASSIGNED);
        long activeJobs = inProgress + assigned;
        long totalCustomers = customerRepository.countByDeletedFalse();
        BigDecimal revenueThisMonth = paymentRepository.sumAmountByStatusAndPaidAtBetween(PaymentStatus.SUCCESS, monthStart, monthEnd);
        BigDecimal revenueLastMonth = paymentRepository.sumAmountByStatusAndPaidAtBetween(PaymentStatus.SUCCESS, lastMonthStart, monthStart);
        Map<LocalDate, EnumMap<JobStatus, Long>> perDay = emptyDayMap(today, days);
        for (Job job : windowJobs) {
            if (job.getCreatedAt() == null) {
                continue;
            }
            perDay.computeIfAbsent(job.getCreatedAt().toLocalDate(), this::newDayBucket).merge(job.getStatus(), 1L, Long::sum);
        }
        List<String> labels = new ArrayList<>();
        List<Long> completedSeries = new ArrayList<>();
        List<Long> inProgressSeries = new ArrayList<>();
        List<Long> pendingSeries = new ArrayList<>();
        for (Map.Entry<LocalDate, EnumMap<JobStatus, Long>> entry : perDay.entrySet()) {
            EnumMap<JobStatus, Long> bucket = entry.getValue();
            labels.add(entry.getKey().format(DAY_LABEL));
            completedSeries.add(bucket.get(JobStatus.COMPLETED) + bucket.get(JobStatus.CLOSED));
            inProgressSeries.add(bucket.get(JobStatus.ASSIGNED) + bucket.get(JobStatus.IN_PROGRESS));
            pendingSeries.add(bucket.get(JobStatus.PENDING));
        }
        List<Double> totalSpark = new ArrayList<>();
        List<Double> customerSpark = new ArrayList<>();
        for (int offset = SPARKLINE_DAYS - 1; offset >= 0; offset--) {
            LocalDateTime dayEnd = today.minusDays(offset).plusDays(1).atStartOfDay();
            totalSpark.add((double) jobRepository.countByCreatedAtBefore(dayEnd));
            customerSpark.add((double) customerRepository.countByDeletedFalseAndCreatedAtBefore(dayEnd));
        }
        List<Double> activeSpark = tailAsDoubles(inProgressSeries, SPARKLINE_DAYS);
        List<Double> pendingSpark = tailAsDoubles(pendingSeries, SPARKLINE_DAYS);
        Map<LocalDate, BigDecimal> revenueByDay = new HashMap<>();
        for (Payment payment : paymentRepository.findSuccessfulSince(PaymentStatus.SUCCESS, weekStart)) {
            if (payment.getPaidAt() != null) {
                revenueByDay.merge(payment.getPaidAt().toLocalDate(), payment.getAmount(), BigDecimal::add);
            }
        }
        List<Double> revenueSpark = new ArrayList<>();
        for (int offset = SPARKLINE_DAYS - 1; offset >= 0; offset--) {
            revenueSpark.add(revenueByDay.getOrDefault(today.minusDays(offset), BigDecimal.ZERO).doubleValue());
        }
        long newJobsThisWeek = jobRepository.countByCreatedAtAfter(weekStart);
        long newJobsToday = jobRepository.countByCreatedAtAfter(todayStart);
        long newCustomersThisMonth = customerRepository.countByDeletedFalseAndCreatedAtAfter(monthStart);
        List<Stat> stats = List.of(
                stat("total_jobs", "Total Jobs", totalJobs, signed(newJobsThisWeek) + " this week", newJobsThisWeek > 0, totalSpark),
                stat("active_jobs", "Active Jobs", activeJobs, inProgress + " in progress", activeJobs > 0, activeSpark),
                stat("pending_assignments", "Pending Assignments", pendingCount(windowJobs), signed(newJobsToday) + " new today", newJobsToday > 0, pendingSpark),
                stat("customers", "Customers", totalCustomers, signed(newCustomersThisMonth) + " this month", newCustomersThisMonth > 0, customerSpark),
                stat("monthly_revenue", "Monthly Revenue", revenueThisMonth.doubleValue(), revenueDelta(revenueThisMonth, revenueLastMonth), revenueTrend(revenueThisMonth, revenueLastMonth), revenueSpark));
        List<StatusCount> statusCounts = new ArrayList<>();
        for (JobRepository.StatusCountRow row : jobRepository.countGroupedByStatus()) {
            statusCounts.add(StatusCount.builder().status(row.getStatus().name()).count(row.getCount()).build());
        }
        long totalJobsForShare = Math.max(totalJobs, 1);
        List<TopCustomer> topCustomers = new ArrayList<>();
        for (Object[] row : jobRepository.countJobsByCustomerTop5()) {
            long jobs = ((Number) row[2]).longValue();
            topCustomers.add(TopCustomer.builder().id((Long) row[0]).name((String) row[1]).jobCount(jobs).share(round1(jobs * 100.0 / totalJobsForShare)).build());
        }
        List<ActivityItem> activity = new ArrayList<>();
        for (Job job : jobRepository.findTop4ByOrderByCreatedAtDesc()) {
            activity.add(ActivityItem.builder().type("JOB_CREATED").title("Job #" + job.getId() + " created for " + job.getCustomer().getName()).createdAt(job.getCreatedAt().toString()).build());
        }
        for (Invoice invoice : invoiceRepository.findTop3ByOrderByCreatedAtDesc()) {
            activity.add(ActivityItem.builder().type("INVOICE_CREATED").title("Invoice " + invoice.getInvoiceNumber() + " created").createdAt(invoice.getCreatedAt().toString()).build());
        }
        for (Payment payment : paymentRepository.findTop3ByOrderByCreatedAtDesc()) {
            activity.add(ActivityItem.builder().type("PAYMENT_RECEIVED").title("Payment of " + payment.getAmount() + " recorded").createdAt(payment.getCreatedAt().toString()).build());
        }
        for (Customer customer : customerRepository.findTop2ByDeletedFalseOrderByCreatedAtDesc()) {
            activity.add(ActivityItem.builder().type("CUSTOMER_ADDED").title("New customer registered - " + customer.getName()).createdAt(customer.getCreatedAt().toString()).build());
        }
        activity.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        if (activity.size() > 5) {
            activity = activity.subList(0, 5);
        }
        return DashboardSummaryResponse.builder().days(days).stats(stats).overview(Overview.builder().labels(labels).completed(completedSeries).inProgress(inProgressSeries).pending(pendingSeries).build()).statusCounts(statusCounts).topCustomers(topCustomers).recentActivity(activity).build();
    }

    private Map<LocalDate, EnumMap<JobStatus, Long>> emptyDayMap(LocalDate today, int days) {
        Map<LocalDate, EnumMap<JobStatus, Long>> map = new java.util.LinkedHashMap<>();
        for (int offset = days - 1; offset >= 0; offset--) {
            map.put(today.minusDays(offset), newDayBucket(today));
        }
        return map;
    }

    private EnumMap<JobStatus, Long> newDayBucket(LocalDate day) {
        EnumMap<JobStatus, Long> bucket = new EnumMap<>(JobStatus.class);
        for (JobStatus status : JobStatus.values()) {
            bucket.put(status, 0L);
        }
        return bucket;
    }

    private long pendingCount(List<Job> jobs) {
        return jobs.stream().filter(job -> job.getStatus() == JobStatus.PENDING).count();
    }

    private Stat stat(String key, String label, double value, String delta, Boolean up, List<Double> sparkline) {
        String trend = up == null ? "FLAT" : (up ? "UP" : "DOWN");
        return Stat.builder().key(key).label(label).value(value).delta(delta).trend(trend).sparkline(sparkline).build();
    }

    private String signed(long value) {
        return (value >= 0 ? "+" : "") + value;
    }

    private String revenueDelta(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return (current == null || current.compareTo(BigDecimal.ZERO) == 0) ? "No revenue yet" : "New this month";
        }
        BigDecimal diff = current.subtract(previous).divide(previous.abs(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
        return signed(diff.longValue()) + "% vs last month";
    }

    private Boolean revenueTrend(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) {
            return current != null && current.compareTo(BigDecimal.ZERO) > 0;
        }
        return current.compareTo(previous) >= 0;
    }

    private List<Double> tailAsDoubles(List<Long> series, int size) {
        List<Double> tail = new ArrayList<>();
        int start = Math.max(0, series.size() - size);
        for (int index = start; index < series.size(); index++) {
            tail.add(series.get(index).doubleValue());
        }
        while (tail.size() < size) {
            tail.add(0, 0.0);
        }
        return tail;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}

