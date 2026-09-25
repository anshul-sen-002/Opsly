"use client";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import type { DashboardSummary } from "@/types";

/**
 * Both dashboards must show a visual skeleton placeholder while their initial
 * data request is in flight, and must swap it for real content once the data
 * arrives.
 */

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  myRequests: vi.fn(),
  myInvoices: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    dashboardApi: { ...actual.dashboardApi, summary: mocks.summary },
    jobApi: { ...actual.jobApi, myRequests: mocks.myRequests },
    invoiceApi: { ...actual.invoiceApi, myInvoices: mocks.myInvoices },
  };
});

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 1, email: "admin@example.com", role: "ADMIN" } }),
}));

vi.mock("@/components/providers/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const summary: DashboardSummary = {
  days: 7,
  stats: [
    { key: "total_jobs", label: "Total jobs", value: 12, delta: "+5", trend: "UP", sparkline: [1, 3, 2, 6] },
    { key: "monthly_revenue", label: "Revenue", value: 4200, delta: "+0", trend: "FLAT", sparkline: [0, 0, 0, 0] },
  ],
  overview: { labels: ["Mon"], completed: [1], inProgress: [1], pending: [0] },
  statusCounts: [{ status: "COMPLETED", count: 5 }],
  topCustomers: [{ id: 1, name: "Acme", jobCount: 3, share: 0.3 }],
  recentActivity: [{ type: "JOB", title: "Job closed", createdAt: "2026-01-01T00:00:00Z" }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DashboardSkeleton", () => {
  it("announces loading to assistive tech", () => {
    render(<DashboardSkeleton />);
    const root = screen.getByTestId("dashboard-skeleton");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading dashboard…")).toBeTruthy();
  });

  it("uses the customer label and layout for the customer variant", () => {
    render(<DashboardSkeleton variant="customer" />);
    expect(screen.getByText("Loading your dashboard…")).toBeTruthy();
  });
});

describe("Staff dashboard loading state", () => {
  it("shows the skeleton instead of real content before data arrives", async () => {
    let resolveSummary: (value: typeof summary) => void = () => {};
    mocks.summary.mockReturnValue(
      new Promise<typeof summary>((resolve) => {
        resolveSummary = resolve;
      })
    );

    const { default: Page } = await import("@/app/(staff)/dashboard/page");
    render(<Page />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeTruthy();
    expect(screen.queryByText("Jobs Overview")).toBeNull();

    resolveSummary(summary);
    await waitFor(() => expect(screen.queryByTestId("dashboard-skeleton")).toBeNull());
    expect(screen.getByText("Jobs Overview")).toBeTruthy();
  });

  it("keeps existing content visible and flags 'Updating' when the range is switched", async () => {
    mocks.summary.mockResolvedValue(summary);
    const { default: Page } = await import("@/app/(staff)/dashboard/page");
    render(<Page />);

    await waitFor(() => expect(screen.getByText("Jobs Overview")).toBeTruthy());

    mocks.summary.mockReturnValueOnce(new Promise(() => {}));
    await userEvent.click(screen.getByRole("button", { name: "14D" }));

    // Content stays on screen — only a small busy hint is shown, no skeleton flash.
    expect(screen.queryByTestId("dashboard-skeleton")).toBeNull();
    expect(screen.getByText("Jobs Overview")).toBeTruthy();
    expect(screen.getByText("Updating")).toBeTruthy();
  });
});

describe("Customer dashboard loading state", () => {
  it("shows the customer skeleton before jobs and invoices arrive", async () => {
    let resolveJobs: (value: unknown) => void = () => {};
    mocks.myRequests.mockReturnValue(
      new Promise((resolve) => {
        resolveJobs = resolve;
      })
    );
    mocks.myInvoices.mockResolvedValue({ content: [] });

    const { default: Page } = await import("@/app/customer/dashboard/page");
    render(<Page />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeTruthy();
    expect(screen.getByText("Loading your dashboard…")).toBeTruthy();

    resolveJobs({ content: [] });
    await waitFor(() => expect(screen.queryByTestId("dashboard-skeleton")).toBeNull());
    expect(screen.getByText("Raise a new service request")).toBeTruthy();
  });
});
