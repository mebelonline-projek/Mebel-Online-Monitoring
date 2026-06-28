// ============================================================
// 📦 SHARED TYPES
// ============================================================
// Semua shared types di sini biar AI agent gak perlu cari-cari.
// ============================================================

// --- Response API standar ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// --- Pagination ---
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// --- Action state untuk form / server actions ---
export interface ActionState<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  fieldValues?: Record<string, unknown>;
}

// --- Dropdown option ---
export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

// --- Breadcrumb ---
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// --- Nav item ---
export interface NavItem {
  title: string;
  href: string;
  external?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}