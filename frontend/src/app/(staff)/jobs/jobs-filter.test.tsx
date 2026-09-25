"use client";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobsPage from "./page";
import type { Job, JobStatus } from "@/types";

/**
 * The jobs list filter is driven by the `?status=` query param, so the
 * dashboard's "Review pending work" deep link (/jobs?status=PENDING) lands on
 * a pre-filtered list, and the dropdown stays in sync with the URL.
 */

const mocks = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
  list: vi.fn(),
  myJobs: vi.fn(),
  role: "ADMIN",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/jobs",
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 1, email: "admin@example.com", role: mocks.role } }),
}));

vi.mock("./job-actions", () => ({
  useJobActions: () => ({
    dialog: null,
    requestAssign: vi.fn(),
    request: vi.fn(),
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    jobApi: { ...actual.jobApi, list: mocks.list, myJobs: mocks.myJobs },
  };
});

const job = (id: number, status: JobStatus): Job => ({
  id,
  customerId: 7,
  customerName: `Customer ${id}`,
  technicianId: status === "PENDING" ? null : 3,
  technicianName: status === "PENDING" ? null : "Sam Tech",
  status,
  description: `Fix the boiler #${id}`,
  scheduledAt: null,
  createdAt: "2026-09-20T10:00:00Z",
  updatedAt: "2026-09-20T10:00:00Z",
});

const page = (content: Job[]) => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  number: 0,
  size: 10,
  first: true,
  last: true,
  empty: content.length === 0,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = "";
  mocks.role = "ADMIN";
  mocks.list.mockResolvedValue(page([]));
  mocks.myJobs.mockResolvedValue(page([]));
});

afterEach(cleanup);

describe("Jobs page status filter from the URL", () => {
  it("applies ?status=PENDING on arrival and shows it in the dropdown", async () => {
    mocks.search = "status=PENDING";
    mocks.list.mockResolvedValue(page([job(1, "PENDING")]));

    render(<JobsPage />);

    await waitFor(() =>
      expect(mocks.list).toHaveBeenCalledWith(0, 10, "createdAt,desc", "PENDING")
    );
    expect((screen.getByLabelText("Filter by status") as HTMLSelectElement).value).toBe("PENDING");
    // ResponsiveTable renders both a desktop table and a mobile card list,
    // so the description shows twice.
    expect((await screen.findAllByText("Fix the boiler #1")).length).toBeGreaterThan(0);
  });

  it("requests every status when the param is absent", async () => {
    render(<JobsPage />);

    await waitFor(() =>
      expect(mocks.list).toHaveBeenCalledWith(0, 10, "createdAt,desc", undefined)
    );
    expect((screen.getByLabelText("Filter by status") as HTMLSelectElement).value).toBe("ALL");
  });

  it("ignores an unknown status and falls back to all jobs", async () => {
    mocks.search = "status=NOT_A_STATUS";

    render(<JobsPage />);

    await waitFor(() =>
      expect(mocks.list).toHaveBeenCalledWith(0, 10, "createdAt,desc", undefined)
    );
  });

  it("pushes the chosen status into the URL without scrolling", async () => {
    render(<JobsPage />);
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "COMPLETED");

    expect(mocks.replace).toHaveBeenCalledWith("/jobs?status=COMPLETED", { scroll: false });
  });

  it("drops the param again when All statuses is picked", async () => {
    mocks.search = "status=PENDING";
    render(<JobsPage />);
    await waitFor(() => expect(mocks.list).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "ALL");

    expect(mocks.replace).toHaveBeenCalledWith("/jobs", { scroll: false });
  });

  it("explains an empty filtered list instead of claiming there are no jobs at all", async () => {
    mocks.search = "status=PENDING";
    mocks.list.mockResolvedValue(page([]));

    render(<JobsPage />);

    expect(await screen.findByText("No pending jobs")).toBeTruthy();
    expect(screen.getByText("No jobs are currently pending.")).toBeTruthy();
    expect(screen.queryByText("No jobs yet")).toBeNull();
  });

  it("filters a technician's own jobs client-side and hides the dropdown", async () => {
    mocks.role = "TECHNICIAN";
    mocks.search = "status=COMPLETED";
    mocks.myJobs.mockResolvedValue(page([job(1, "COMPLETED"), job(2, "ASSIGNED")]));

    render(<JobsPage />);

    await waitFor(() => expect(mocks.myJobs).toHaveBeenCalledWith(0, 10));
    expect(mocks.list).not.toHaveBeenCalled();
    expect((await screen.findAllByText("Fix the boiler #1")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Fix the boiler #2")).toBeNull();
    expect(screen.queryByLabelText("Filter by status")).toBeNull();
  });
});
