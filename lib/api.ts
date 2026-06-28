// ============================================================
// 🌐 API WRAPPER
// ============================================================
// Fetch wrapper dengan error handling standar.
// Semua panggilan API lewat sini, jangan pake fetch manual.
// ============================================================

import type { ApiResponse } from "@/types";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
} as const;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Abort controller signal */
  signal?: AbortSignal;
  /** Jangan lempar error, balikin response aja */
  throwOnError?: boolean;
};

/**
 * Fetch wrapper dengan error handling.
 *
 * @example
 * ```ts
 * const { data, error } = await api("/api/users");
 * const { data } = await api("/api/users", { method: "POST", body: { name: "John" } });
 * ```
 */
export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers, signal, throwOnError = true } = options;

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { ...DEFAULT_HEADERS, ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal,
      next: {
        revalidate: method === "GET" ? 60 : undefined, // cache GET 60 detik
      },
    });

    // Response kosong (204 No Content)
    if (response.status === 204) {
      return { success: true };
    }

    const json: ApiResponse<T> = await response.json();

    if (!response.ok) {
      const errorMessage = json.message ?? json.error ?? `HTTP ${response.status}`;

      if (throwOnError) {
        throw new Error(errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
        message: json.message,
      };
    }

    return {
      success: true,
      data: json.data,
      message: json.message,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { success: false, error: "Request dibatalkan" };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui";

    if (throwOnError) {
      throw error;
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Helper untuk GET request.
 */
export async function get<T = unknown>(
  endpoint: string,
  options?: Omit<RequestOptions, "method">,
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, { ...options, method: "GET" });
}

/**
 * Helper untuk POST request.
 */
export async function post<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, { ...options, method: "POST", body });
}

/**
 * Helper untuk PUT request.
 */
export async function put<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, { ...options, method: "PUT", body });
}

/**
 * Helper untuk PATCH request.
 */
export async function patch<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "body">,
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, { ...options, method: "PATCH", body });
}

/**
 * Helper untuk DELETE request.
 */
export async function del<T = unknown>(
  endpoint: string,
  options?: Omit<RequestOptions, "method">,
): Promise<ApiResponse<T>> {
  return api<T>(endpoint, { ...options, method: "DELETE" });
}