import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersList } from "./users-list";
import { CustomersList } from "../customers/customers-list";
import { UserForm } from "./user-form";

const mocks = vi.hoisted(() => ({
  role: "TECHNICIAN",
  staffList: vi.fn(),
  customerList: vi.fn(),
  updateProfile: vi.fn(),
  updateStaff: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { userId: 7, email: "tech@example.com", role: mocks.role } }),
}));
vi.mock("@/components/providers/toast-provider", () => ({
  useToast: () => ({ success: mocks.success, error: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    staffApi: { ...actual.staffApi, list: mocks.staffList, update: mocks.updateStaff },
    customerApi: { ...actual.customerApi, list: mocks.customerList },
    userProfileApi: { ...actual.userProfileApi, update: mocks.updateProfile },
  };
});

const staff = {
  id: 7, name: "Test Technician", email: "tech@example.com", role: "TECHNICIAN",
  status: "ACTIVE", deleted: false, deletedAt: null, createdAt: "2026-09-01T10:00:00",
  phone: "1234567890", specialization: "Electrical",
};
const customer = {
  id: 4, name: "Test Customer", email: "customer@example.com", phone: "1234567890",
  city: "Delhi", companyName: null, hasLoginAccount: false, deleted: false,
  deletedAt: null, createdAt: "2026-09-01T10:00:00",
};
const page = <T,>(content: T[]) => ({ content, totalPages: 1, totalElements: content.length });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "TECHNICIAN";
  mocks.staffList.mockResolvedValue(page([staff]));
  mocks.customerList.mockImplementation((_page, _size, _sort, deleted) =>
    Promise.resolve(page(deleted ? [] : [customer])));
  mocks.updateProfile.mockResolvedValue(staff);
});
afterEach(cleanup);

describe("Technician read-only lists and own profile", () => {
  it("shows users without desktop or mobile actions", async () => {
    render(<UsersList />);
    expect((await screen.findAllByText("Test Technician")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add User" })).toBeNull();
    expect(screen.queryByText("View Details")).toBeNull();
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
  });

  it("shows customers without desktop or mobile actions", async () => {
    render(<CustomersList />);
    expect((await screen.findAllByText("Test Customer")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Customer" })).toBeNull();
    expect(screen.queryByText("View Details")).toBeNull();
    expect(screen.queryByText("Grant Access")).toBeNull();
  });

  it("renders the API phone in both the desktop table and mobile user card", async () => {
    mocks.role = "ADMIN";
    render(<UsersList />);
    const phones = await screen.findAllByText(staff.phone);
    expect(phones).toHaveLength(2);
    expect(phones.some((phone) => phone.closest("td") !== null)).toBe(true);
    expect(phones.some((phone) => phone.tagName === "DD")).toBe(true);
  });

  it("preserves administrator user actions", async () => {
    mocks.role = "ADMIN";
    render(<UsersList />);
    await screen.findAllByText("Test Technician");
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add User" })).toBeTruthy();
  });

  it("saves only self-service fields, not role or email, through the own-profile API", async () => {
    render(<UserForm userId={7} selfService submitLabel="Save Profile" defaultValues={{
      name: staff.name, email: staff.email, role: "TECHNICIAN",
      phone: staff.phone, specialization: staff.specialization,
    }} />);
    expect((screen.getByLabelText(/Email address/) as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByRole("combobox")).toBeNull();
    await userEvent.clear(screen.getByLabelText(/Full name/));
    await userEvent.type(screen.getByLabelText(/Full name/), "Updated Technician");
    await userEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({
      name: "Updated Technician", phone: staff.phone, specialization: staff.specialization,
    }));
    expect(mocks.updateStaff).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/users/7");
  });
});
