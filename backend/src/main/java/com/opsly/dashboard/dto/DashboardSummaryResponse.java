package com.opsly.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Aggregated dashboard data for ADMIN/MANAGER home screen.
 * All values are computed from real application data — no client-side mocking.
 */
@Getter
@Builder
public class DashboardSummaryResponse {

    private final int days;

    /** Ordered stat cards: total_jobs, active_jobs, pending_assignments, customers, monthly_revenue */
    private final List<Stat> stats;

    /** Jobs-created-per-day series for the overview chart */
    private final Overview overview;

    private final List<StatusCount> statusCounts;

    private final List<TopCustomer> topCustomers;

    private final List<ActivityItem> recentActivity;

    @Getter
    @Builder
    public static class Stat {
        private final String key;
        private final String label;
        private final double value;
        /** Human readable change text, e.g. "+3 this week" */
        private final String delta;
        /** UP | DOWN | FLAT */
        private final String trend;
        /** Oldest → newest mini trend, always last 7 days */
        private final List<Double> sparkline;
    }

    @Getter
    @Builder
    public static class Overview {
        private final List<String> labels;
        private final List<Long> completed;
        private final List<Long> inProgress;
        private final List<Long> pending;
    }

    @Getter
    @Builder
    public static class StatusCount {
        private final String status;
        private final long count;
    }

    @Getter
    @Builder
    public static class TopCustomer {
        private final Long id;
        private final String name;
        private final long jobCount;
        /** Percentage of all jobs, rounded to 1 decimal */
        private final double share;
    }

    @Getter
    @Builder
    public static class ActivityItem {
        /** JOB_CREATED | JOB_COMPLETED | INVOICE_CREATED | PAYMENT_RECEIVED | CUSTOMER_ADDED */
        private final String type;
        private final String title;
        /** ISO-8601 timestamp */
        private final String createdAt;
    }
}
