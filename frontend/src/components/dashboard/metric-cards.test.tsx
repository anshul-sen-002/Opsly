import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricCards } from "@/components/dashboard/metric-cards";
import type { DashboardStat } from "@/types";

afterEach(cleanup);

/**
 * The metric cards must render the all-time "Total Collected" stat alongside
 * the monthly revenue stat, both formatted as INR currency, while plain counts
 * stay unformatted numbers.
 */
const stats: DashboardStat[] = [
  { key: "total_jobs", label: "Total Jobs", value: 12, delta: "+5 this week", trend: "UP", sparkline: [1, 2] },
  { key: "monthly_revenue", label: "Monthly Revenue", value: 0, delta: "-100% vs last month", trend: "DOWN", sparkline: [0, 0] },
  { key: "total_collected", label: "Total Collected", value: 2620, delta: "+2620 this month", trend: "UP", sparkline: [0, 0] },
];

describe("MetricCards", () => {
  it("formats revenue stats as INR currency and keeps counts numeric", () => {
    render(<MetricCards stats={stats} />);
    expect(screen.getByText("₹2,620")).toBeTruthy(); // total_collected
    expect(screen.getByText("₹0")).toBeTruthy(); // monthly_revenue
    expect(screen.getByText("12")).toBeTruthy(); // total_jobs
  });

  it("renders the Total Collected card with its label and delta", () => {
    render(<MetricCards stats={stats} />);
    expect(screen.getByText("Total Collected")).toBeTruthy();
    // Trend marker and delta render as sibling text nodes inside one <p>.
    expect(screen.getByText("▲ +2620 this month")).toBeTruthy();
  });
});