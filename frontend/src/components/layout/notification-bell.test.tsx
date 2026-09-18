"use client";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/layout/notification-bell";

/**
 * Notification bell behaviour.
 * The dropdown feed must contain UNREAD rows only: after an entry is marked
 * read it disappears from the feed and never reappears on the next open.
 */

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  unreadCount: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 1, email: "admin@example.com", role: "ADMIN" } }),
}));

vi.mock("@/components/providers/notification-provider", () => ({
  useNotifications: () => ({ unreadCount: 2, refresh: mocks.refresh }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    notificationApi: {
      ...actual.notificationApi,
      list: mocks.list,
      markRead: mocks.markRead,
      markAllRead: mocks.markAllRead,
      unreadCount: mocks.unreadCount,
    },
  };
});

type FeedItem = { id: number; type: string; title: string; message: string | null; link: string | null; read: boolean; createdAt: string };

const item = (id: number, read: boolean): FeedItem => ({
  id,
  type: "CUSTOMER_REGISTERED",
  title: "New customer registered",
  message: `customer-${id}@test.com joined the portal.`,
  link: "/customers",
  read,
  createdAt: new Date().toISOString(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("NotificationBell dropdown feed", () => {
  it("renders the feed rows with an unread badge for unread entries", async () => {
    // The backend returns unread rows only; read rows that slip through are
    // styled read and counted out of the "new" badge.
    mocks.list.mockResolvedValue({
      content: [item(1, false), item(2, true), item(3, false)],
      totalPages: 1,
      totalElements: 3,
    });
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(0, 15));
    expect((await screen.findAllByText("New customer registered")).length).toBe(3);
    expect(screen.getByText("2 new")).toBeTruthy();
  });

  it("marks an entry read on click so it will not reappear next open", async () => {
    mocks.markRead.mockResolvedValue(null);
    mocks.list.mockResolvedValue({
      content: [item(1, false)],
      totalPages: 1,
      totalElements: 1,
    });
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    const entry = await screen.findByRole("button", { name: /new customer registered/i });
    await userEvent.click(entry);
    await waitFor(() => expect(mocks.markRead).toHaveBeenCalledWith(1));
    // Panel closes after the click
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Reopening refetches — the (backend-filtered) feed is now empty
    mocks.list.mockResolvedValue({ content: [], totalPages: 1, totalElements: 0 });
    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("You're all caught up")).toBeTruthy();
  });

  it("shows the empty state when there are no unread entries", async () => {
    mocks.list.mockResolvedValue({ content: [], totalPages: 1, totalElements: 0 });
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(await screen.findByText("You're all caught up")).toBeTruthy();
  });
});
