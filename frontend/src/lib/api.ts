import type { ApiResponse, AuthResponse, ChatResponse, CreateStaffInput, CreateJobInput, CreateInvoiceInput, CreatePaymentInput, UpdateStaffInput, Customer, CustomerInput, Paged, Staff, DashboardSummary, Job, Invoice, Payment, Technician, JobStatus, InvoiceStatus, PaymentMethod, AppNotification } from "@/types"


const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

/** Error thrown for every failed API call */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Bridge between this module and AuthProvider.
 * Keeps api.ts free of React imports while still reading/refreshing the token.
 */
interface AuthBridge {
  getAccessToken(): string | null;
  setAuth(auth: AuthResponse): void;
  onSessionExpired(): void;
}

let bridge: AuthBridge | null = null;

export function bindAuthBridge(authBridge: AuthBridge): void {
  bridge = authBridge;
}

/** Shared in-flight refresh â€” concurrent 401s reuse a single refresh call */
let refreshInFlight: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        // Refresh token travels in the HttpOnly cookie
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiResponse<AuthResponse>;
        if (!body.success || !body.data?.accessToken) return false;
        bridge?.setAuth(body.data);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

/** POST/PUT a multipart FormData body (file upload) — no JSON content-type */
async function uploadRequest<T>(path: string, formData: FormData, method: "POST" | "PUT" = "POST"): Promise<T> {
  const headers: Record<string, string> = {};
  const token = bridge?.getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: formData,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
  }

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshTokens();
    if (refreshed) return uploadRequest<T>(path, formData, method);
    bridge?.onSessionExpired();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new ApiError(payload?.message ?? `Request failed (${res.status})`, res.status);
  }
  if (payload && payload.success === false) {
    throw new ApiError(payload.message ?? "Request failed", res.status);
  }
  return payload?.data as T;
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = bridge?.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the server. Please check your connection and try again.", 0);
  }

  // Access token expired â†’ try one silent refresh, then retry the original call
  if (res.status === 401 && auth && retry && !path.startsWith("/auth/")) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, options, false);
    bridge?.onSessionExpired();
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    // Backend returns validation errors as a fieldâ†’message map in `data`
    const data = payload?.data;
    const fieldErrors =
      payload && data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, string>)
        : undefined;
    const message =
      payload?.success === false || payload?.message
        ? payload.message ?? `Request failed (${res.status})`
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, fieldErrors);
  }

  if (payload && payload.success === false) {
    throw new ApiError(payload.message ?? "Request failed", res.status);
  }

  return payload?.data as T;
}

export const authApi = {
  staffLogin: (email: string, password: string) =>
    request<AuthResponse>("/auth/staff/login", { method: "POST", body: { email, password }, auth: false }),
  customerLogin: (email: string, password: string) =>
    request<AuthResponse>("/auth/customer/login", { method: "POST", body: { email, password }, auth: false }),
  registerCustomer: (input: { name: string; email: string; password: string; phone?: string }) =>
    request<AuthResponse>("/auth/customer/register", { method: "POST", body: input, auth: false }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

export const staffApi = {
  list: (page = 0, size = 10, sort = "createdAt,desc", deleted = false) =>
    request<Paged<Staff>>(
      `/admin/staff?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}&deleted=${deleted}`
    ),
  getById: (id: number | string) => request<Staff>(`/admin/staff/${id}`),
  create: (input: CreateStaffInput) => request<Staff>("/admin/staff", { method: "POST", body: input }),
  update: (id: number | string, input: UpdateStaffInput) =>
    request<Staff>(`/admin/staff/${id}`, { method: "PUT", body: input }),
  activate: (id: number | string) => request<Staff>(`/admin/staff/${id}/activate`, { method: "PUT" }),
  deactivate: (id: number | string) => request<Staff>(`/admin/staff/${id}/deactivate`, { method: "PUT" }),
  remove: (id: number | string) => request<Staff>(`/admin/staff/${id}`, { method: "DELETE" }),
  restore: (id: number | string) => request<Staff>(`/admin/staff/${id}/restore`, { method: "PUT" }),
};

export const customerApi = {
  list: (page = 0, size = 10, sort = "createdAt,desc", deleted = false) =>
    request<Paged<Customer>>(
      `/customers?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}&deleted=${deleted}`
    ),
  getById: (id: number | string) => request<Customer>(`/customers/${id}`),
  /** CUSTOMER: own customer profile — identity derived from the JWT */
  updateMyProfile: (input: CustomerInput) =>
    request<Customer>("/customers/me", { method: "PUT", body: input }),
  me: () => request<Customer>("/customers/me"),
  create: (input: CustomerInput) => request<Customer>("/customers", { method: "POST", body: input }),
  update: (id: number | string, input: CustomerInput) =>
    request<Customer>(`/customers/${id}`, { method: "PUT", body: input }),
  remove: (id: number | string) => request<Customer>(`/customers/${id}`, { method: "DELETE" }),
  restore: (id: number | string) => request<Customer>(`/customers/${id}/restore`, { method: "PUT" }),
  /** ADMIN/MANAGER: create a login account for a staff-created customer */
  grantAccess: (id: number | string, input: { email: string; password: string }) =>
    request<Customer>(`/customers/${id}/grant-access`, { method: "POST", body: input }),
};


export const aiApi = {
  chat: (message: string) => request<ChatResponse>("/ai/chat", { method: "POST", body: { message } }),
};

export const dashboardApi = {
  summary: (days = 7) => request<DashboardSummary>(`/dashboard/summary?days=${days}`),
};

export const jobApi = {
  list: (page = 0, size = 10, sort = "createdAt,desc", status?: JobStatus) =>
    request<Paged<Job>>(
      `/jobs?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}${status ? `&status=${status}` : ""}`
    ),
  getById: (id: number | string) => request<Job>(`/jobs/${id}`),
  /** TECHNICIAN: own assigned jobs - identity derived from JWT */
  myJobs: (page = 0, size = 10, sort = "createdAt,desc") =>
    request<Paged<Job>>(`/jobs/my-jobs?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  /** CUSTOMER: own service requests - identity derived from JWT */
  myRequests: (page = 0, size = 10, sort = "createdAt,desc") =>
    request<Paged<Job>>(`/jobs/my-requests?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  /** CUSTOMER: single own service request - ownership enforced server-side */
  myRequest: (id: number | string) => request<Job>(`/jobs/my-requests/${id}`),
  create: (input: CreateJobInput) => request<Job>("/jobs", { method: "POST", body: input }),
  assignTechnician: (id: number | string, technicianId: number) =>
    request<Job>(`/jobs/${id}/assign`, { method: "PUT", body: { technicianId } }),
  start: (id: number | string) => request<Job>(`/jobs/${id}/start`, { method: "PUT" }),
  complete: (id: number | string) => request<Job>(`/jobs/${id}/complete`, { method: "PUT" }),
  close: (id: number | string) => request<Job>(`/jobs/${id}/close`, { method: "PUT" }),
};

export const invoiceApi = {
  list: (page = 0, size = 10, sort = "createdAt,desc") =>
    request<Paged<Invoice>>(`/invoices?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  getById: (id: number | string) => request<Invoice>(`/invoices/${id}`),
  /** CUSTOMER: own invoices - identity derived from JWT */
  myInvoices: (page = 0, size = 10, sort = "createdAt,desc") =>
    request<Paged<Invoice>>(`/invoices/my-invoices?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  /** CUSTOMER: single own invoice - ownership enforced server-side */
  myInvoice: (id: number | string) => request<Invoice>(`/invoices/my-invoices/${id}`),
  create: (input: CreateInvoiceInput) => request<Invoice>("/invoices", { method: "POST", body: input }),
  issue: (id: number | string) => request<Invoice>(`/invoices/${id}/issue`, { method: "PUT" }),
  uploadFile: (id: number | string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<Invoice>(`/invoices/${id}/file`, formData);
  },
};

export const userProfileApi = {
  me: () => request<Staff>("/users/me"),
  update: (input: Pick<UpdateStaffInput, "name" | "phone" | "specialization">) =>
    request<Staff>("/users/me", { method: "PUT", body: input }),
  /** Replace the caller's own profile image — identity comes from the JWT */
  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<Staff>("/users/me/profile-image", formData);
  },
};

export const paymentApi = {
  list: (page = 0, size = 10, sort = "createdAt,desc") =>
    request<Paged<Payment>>(`/payments?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  listByInvoice: (invoiceId: number | string) =>
    request<Payment[]>(`/payments/invoice/${invoiceId}`),
  myPayments: (page = 0, size = 10) =>
    request<Paged<Payment>>(`/payments/my-payments?page=${page}&size=${size}&sort=createdAt,desc`),
  update: (id: number | string, input: CreatePaymentInput) =>
    request<Payment>(`/payments/${id}`, { method: "PUT", body: input }),
  delete: (id: number | string) => request<null>(`/payments/${id}`, { method: "DELETE" }),
  getById: (id: number | string) => request<Payment>(`/payments/${id}`),
  create: (input: CreatePaymentInput) => request<Payment>("/payments", { method: "POST", body: input }),
};

export const technicianApi = {
  list: (page = 0, size = 10, sort = "name,asc") =>
    request<Paged<Technician>>(`/technicians?page=${page}&size=${size}&sort=${encodeURIComponent(sort)}`),
  getById: (id: number | string) => request<Technician>(`/technicians/${id}`),
  /** TECHNICIAN: own profile — identity derived from JWT */
  getMyProfile: () => request<Technician>("/technicians/me"),
};

/** Bell notifications — always scoped to the authenticated user (identity from JWT) */
export const notificationApi = {
  list: (page = 0, size = 15) =>
    request<Paged<AppNotification>>(
      `/notifications?page=${page}&size=${size}&sort=${encodeURIComponent("createdAt,desc")}`
    ),
  unreadCount: () => request<number>(`/notifications/unread-count`),
  markRead: (id: number) => request<null>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () => request<null>(`/notifications/read-all`, { method: "PUT" }),
};
