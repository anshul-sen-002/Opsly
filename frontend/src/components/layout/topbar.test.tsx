"use client";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Topbar } from "@/components/layout/topbar";
import type { AuthUser } from "@/types";

/**
 * Regression test: the top-right account button must show the signed-in user's
 * uploaded profile photo. It previously hard-coded the default gradient tile,
 * so the photo appeared everywhere except here.
 */

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  user: null as AuthUser | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: mocks.user, logout: vi.fn() }),
}));

vi.mock("@/components/layout/notification-bell", () => ({
  NotificationBell: () => null,
}));

const PHOTO = "https://res.cloudinary.com/demo/image/upload/ravi.jpg";

/**
 * Resolves the actual <img> for the account avatar. With a photo the element
 * carrying the role IS the <img>; on the gradient fallback the role sits on the
 * wrapper <span> and the <img> inside it is aria-hidden.
 */
function avatarImg(name: string): HTMLImageElement {
  const labelled = screen.getByRole("img", { name });
  const img = (labelled.tagName === "IMG" ? labelled : labelled.querySelector("img")) as
    | HTMLImageElement
    | null;
  if (!img) throw new Error(`No <img> found for avatar "${name}"`);
  return img;
}

beforeEach(() => {
  mocks.push.mockClear();
  mocks.user = { userId: 1, email: "ravi@example.com", role: "TECHNICIAN" };
});

afterEach(cleanup);

describe("Topbar account avatar", () => {
  it("renders the uploaded profile image when the session has one", () => {
    mocks.user = { ...mocks.user!, profileImageUrl: PHOTO };
    render(<Topbar onMenuClick={vi.fn()} />);

    expect(avatarImg("ravi@example.com").getAttribute("src")).toBe(PHOTO);
  });

  it("falls back to the default avatar when no photo was uploaded", () => {
    mocks.user = { ...mocks.user!, profileImageUrl: null };
    render(<Topbar onMenuClick={vi.fn()} />);

    expect(avatarImg("ravi@example.com").getAttribute("src")).toBe("/user-image.svg");
  });

  it("picks up a photo added to the session after the initial render", () => {
    const { rerender } = render(<Topbar onMenuClick={vi.fn()} />);
    expect(avatarImg("ravi@example.com").getAttribute("src")).toBe("/user-image.svg");

    // Simulates the auth provider being patched right after an upload
    mocks.user = { ...mocks.user!, profileImageUrl: PHOTO };
    rerender(<Topbar onMenuClick={vi.fn()} />);

    expect(avatarImg("ravi@example.com").getAttribute("src")).toBe(PHOTO);
  });
});