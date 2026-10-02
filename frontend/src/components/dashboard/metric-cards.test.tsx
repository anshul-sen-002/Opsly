import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricCards } from "@/components/dashboard/metric-cards";
import type { DashboardStat } from "@/types";

afterEach(cleanup);

/**
 * The metric cards must render the monthly revenue stat formatted as INR
 * currency, while plain counts stay unformatted numbers.
 */
const stats: DashboardStat[] = [
  { key: "total_jobs", label: "Total Jobs", value: 12, delta: "+5 this week", trend: "UP", sparkline: [1, 2] },
  { key: "monthly_revenue", label: "Monthly Revenue", value: 2620, delta: "+20% vs last month", trend: "UP", sparkline: [0, 0] },
];

describe("MetricCards", () => {
  it("formats revenue stats as INR currency and keeps counts numeric", () => {
    render(<MetricCards stats={stats} />);
    expect(screen.getByText("₹2,620")).toBeTruthy(); // monthly_revenue
    expect(screen.getByText("12")).toBeTruthy(); // total_jobs
  });

  it("renders the Monthly Revenue card with its label and delta", () => {
    render(<MetricCards stats={stats} />);
    expect(screen.getByText("Monthly Revenue")).toBeTruthy();
    // Trend marker and delta render as sibling text nodes inside one <p>.
    expect(screen.getByText("▲ +20% vs last month")).toBeTruthy();
  });
});