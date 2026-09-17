import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyPaymentsPage from "./payments/page";
import MyInvoicesPage from "./invoices/page";
import EditMyProfilePage from "./profile/edit/page";

const mocks = vi.hoisted(() => ({
  myPayments: vi.fn(), myInvoices: vi.fn(), me: vi.fn(), updateMyProfile: vi.fn(),
  staffPayments: vi.fn(), staffInvoices: vi.fn(), updateCustomer: vi.fn(), push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/providers/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual,
    paymentApi: { ...actual.paymentApi, myPayments: mocks.myPayments, list: mocks.staffPayments },
    invoiceApi: { ...actual.invoiceApi, myInvoices: mocks.myInvoices, list: mocks.staffInvoices },
    customerApi: { ...actual.customerApi, me: mocks.me, updateMyProfile: mocks.updateMyProfile, update: mocks.updateCustomer },
  };
});
const customer = { id: 7, name: "Test Customer", phone: "1234567890", email: "customer@example.com", deleted: false };
const page = <T,>(content: T[]) => ({ content, totalPages: 1, totalElements: content.length });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.myPayments.mockResolvedValue(page([{ id: 1, invoiceNumber: "INV-OWN", amount: 50, paymentMethod: "CASH", status: "SUCCESS", paidAt: null }]));
  mocks.myInvoices.mockResolvedValue(page([{ id: 2, invoiceNumber: "INV-OWN", jobId: 3, totalAmount: 100, paidAmount: 50, status: "PARTIALLY_PAID" }]));
  mocks.me.mockResolvedValue(customer);
  mocks.updateMyProfile.mockResolvedValue(customer);
});
afterEach(cleanup);

describe("Customer billing and profile routes", () => {
  it("loads payments through the own-customer API without write controls", async () => {
    render(<MyPaymentsPage />);
    await screen.findAllByText("INV-OWN");
    expect(mocks.myPayments).toHaveBeenCalledWith(0, 10);
    expect(mocks.staffPayments).not.toHaveBeenCalled();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit|delete|record payment/i })).toBeNull();
  });
  it("loads read-only invoices through the own-customer API", async () => {
    render(<MyInvoicesPage />);
    await screen.findByText("INV-OWN");
    expect(mocks.myInvoices).toHaveBeenCalledWith(0, 10);
    expect(mocks.staffInvoices).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /edit|delete|issue|create/i })).toBeNull();
  });
  it("renders the missing edit route and saves via the self-service endpoint", async () => {
    render(<EditMyProfilePage />);
    const name = await screen.findByLabelText(/Full name/);
    await userEvent.clear(name);
    await userEvent.type(name, "Updated Customer");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.updateMyProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated Customer" })));
    expect(mocks.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith("/customer/profile");
  });
});
