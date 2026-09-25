"use client";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DetailSkeleton, FormSkeleton, ProfileSkeleton } from "@/components/ui/states";

afterEach(cleanup);

/**
 * Detail and form screens must show a visual skeleton (not a bare spinner)
 * while their initial fetch is in flight, and each skeleton must announce
 * itself to assistive tech per the repository accessibility rules.
 */

describe("ProfileSkeleton", () => {
  it("announces loading and shows the tab strip by default", () => {
    render(<ProfileSkeleton />);
    const root = screen.getByTestId("profile-skeleton");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(root.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Loading profile…")).toBeTruthy();
    expect(screen.getByTestId("profile-skeleton-tabs")).toBeTruthy();
  });

  it("supports a custom label and can omit the tab strip", () => {
    render(<ProfileSkeleton label="Loading technician" showTabs={false} />);
    expect(screen.getByText("Loading technician…")).toBeTruthy();
    expect(screen.queryByTestId("profile-skeleton-tabs")).toBeNull();
  });
});

describe("DetailSkeleton", () => {
  it("announces loading with an optional custom label", () => {
    render(<DetailSkeleton label="Loading job" />);
    const root = screen.getByTestId("detail-skeleton");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading job…")).toBeTruthy();
  });

  it("falls back to the default label", () => {
    render(<DetailSkeleton />);
    expect(screen.getByText("Loading details…")).toBeTruthy();
  });
});

describe("FormSkeleton", () => {
  it("announces loading and renders the default six fields", () => {
    const { container } = render(<FormSkeleton />);
    const root = screen.getByTestId("form-skeleton");
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading form…")).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="form-skeleton-field"]')).toHaveLength(6);
  });

  it("renders a custom label and field count", () => {
    const { container } = render(<FormSkeleton label="Loading customer form" fields={4} />);
    expect(screen.getByText("Loading customer form…")).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="form-skeleton-field"]')).toHaveLength(4);
  });
});
