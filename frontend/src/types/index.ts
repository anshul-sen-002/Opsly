export type Role = "ADMIN" | "MANAGER" | "TECHNICIAN" | "CUSTOMER";

export type StaffRole = Exclude<Role, "CUSTOMER">;

export type UserStatus = "ACTIVE" | "INACTIVE";

/** Standard backend response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/** Spring Data page serialization */
export interface Paged<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** Body of login / register / refresh responses */
export interface AuthResponse {
  accessToken: string;
  role: Role;
  userId: number;
  email: string;
  /** Cloudinary profile image URL — lets the shell render the real photo on login/refresh */
  profileImageUrl?: string | null;
}

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  profileImageUrl?: string | null;
}

/** GET /api/admin/staff list item â€” User entity has no name field */
export interface Staff {
  id: number;
  email: string;
  role: Role;
  status: UserStatus;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  profileImageUrl?: string | null;
  /** Technician profile fields - only present for TECHNICIAN accounts */
  name?: string | null;
  phone?: string | null;
  specialization?: string | null;
}


export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  phone?: string;
  specialization?: string;
}

export interface UpdateStaffInput {
  name: string;
  email: string;
  role: StaffRole;
  phone?: string;
  specialization?: string;
}

// ─── Job types ──────────────────────────────────────────────────────

export type JobStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";

export interface Job {
  id: number;
  customerId: number;
  customerName: string;
  technicianId: number | null;
  technicianName: string | null;
  status: JobStatus;
  description: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  customerId: number;
  description: string;
  scheduledAt?: string;
}

export interface AssignTechnicianInput {
  technicianId: number;
}

// ─── Invoice types ──────────────────────────────────────────────────

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";

export interface Invoice {
  id: number;
  jobId: number;
  customerId: number;
  customerName: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  fileUrl?: string | null;
}

export interface CreateInvoiceInput {
  jobId: number;
  subtotal: number;
  tax?: number;
  dueDate?: string;
}

// ─── Payment types ──────────────────────────────────────────────────

export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Payment {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreatePaymentInput {
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
}

// ─── Technician types ───────────────────────────────────────────────

export interface Technician {
  id: number;
  name: string;
  phone: string | null;
  specialization: string | null;
  email: string;
  /** Id of the linked staff User account */
  userId: number;
  createdAt: string;
}

export interface ChatResponse {
  message: string;
  toolCalls?: Array<{
    tool: string;
    result: string;
    success: boolean;
  }>;
}

/** GET /api/customers list item */
/** Notification type — mirrors backend NotificationType enum */
export type NotificationType =
  | "JOB_CREATED"
  | "JOB_ASSIGNED"
  | "JOB_STARTED"
  | "JOB_COMPLETED"
  | "JOB_CLOSED"
  | "INVOICE_ISSUED"
  | "PAYMENT_RECEIVED"
  | "CUSTOMER_REGISTERED";

/** One bell notification for the signed-in user */
export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  /** Frontend route to open when clicked — null when there is nothing to open */
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  hasLoginAccount: boolean;
  /** Id of the linked login account — null when the customer has no login */
  userId?: number | null;
  /** Status of the linked login account — null when the customer has no login */
  loginStatus?: "ACTIVE" | "INACTIVE" | null;
  /** true when the linked login account is soft-deleted */
  loginDeleted?: boolean;
  /** Cloudinary profile image of the linked login account */
  profileImageUrl?: string | null;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
}

/** Body for customer create / update */
export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  companyName?: string;
  address?: string;
  city?: string;
}

/** GET /api/dashboard/summary */
export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  delta: string;
  trend: "UP" | "DOWN" | "FLAT";
  sparkline: number[];
}

export interface DashboardOverview {
  labels: string[];
  completed: number[];
  inProgress: number[];
  pending: number[];
}

export interface DashboardStatusCount {
  status: string;
  count: number;
}

export interface DashboardTopCustomer {
  id: number;
  name: string;
  jobCount: number;
  share: number;
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  createdAt: string;
}

export interface DashboardSummary {
  days: number;
  stats: DashboardStat[];
  overview: DashboardOverview;
  statusCounts: DashboardStatusCount[];
  topCustomers: DashboardTopCustomer[];
  recentActivity: DashboardActivityItem[];
}

