// Texas 811 client-side API facade (browser-safe)

import type {
  ApiResponse,
  ApiError,
  Texas811SearchParams,
  Texas811SearchResponse,
  Texas811TicketHtmlData,
  Texas811TicketResponse,
  Texas811TicketUpdateParams,
  Texas811UpdateResponse,
  Texas811NoResponseVendor,
  Texas811NoResponseResponse,
} from "./types";

export interface Texas811ClientConfig {
  /** Base URL for API routes, e.g. "/api" or "https://myapp.com/api" */
  baseUrl: string;
  /** Default headers to include on every request (e.g. auth tokens) */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error: ApiError = {
        status: res.status,
        message:
          (body as Record<string, unknown>).error as string ??
          res.statusText,
        details: (body as Record<string, unknown>).details,
      };
      return { ok: false, status: res.status, error };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (e) {
    clearTimeout(timeout);
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "Request timed out"
        : e instanceof Error
          ? e.message
          : "Unknown error";
    return {
      ok: false,
      status: 0,
      error: { status: 0, message },
    };
  }
}

export function createTexas811Client(config: Texas811ClientConfig) {
  const { baseUrl, headers: defaultHeaders = {}, timeoutMs = 30000 } = config;

  function get<T>(
    path: string,
    params?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    const url = new URL(
      `${baseUrl}${path}`,
      typeof window !== "undefined" ? window.location.origin : undefined
    );
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    return fetchJson<T>(
      url.toString(),
      {
        method: "GET",
        headers: { Accept: "application/json", ...defaultHeaders },
      },
      timeoutMs
    );
  }

  function post<T>(
    path: string,
    body: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${baseUrl}${path}`;
    return fetchJson<T>(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...defaultHeaders,
        },
        body: JSON.stringify(body),
      },
      timeoutMs
    );
  }

  return {
    searchTickets(params?: Texas811SearchParams) {
      const queryParams: Record<string, string | undefined> = {};
      if (params?.ticketNumber) queryParams.ticketNumber = params.ticketNumber;
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.user) queryParams.user = params.user;
      if (params?.excavatorName)
        queryParams.excavatorName = params.excavatorName;
      return get<Texas811SearchResponse>("/texas811/search", queryParams);
    },

    getTicketByNumber(ticketNumber: string) {
      return get<Texas811TicketHtmlData>("/texas811/tickets", {
        ticketNumber,
      });
    },

    getTicketById(ticketId: string) {
      return get<Texas811TicketResponse>("/texas811/tickets", { ticketId });
    },

    updateTicket(ticketId: string, updates: Texas811TicketUpdateParams) {
      return post<Texas811UpdateResponse>("/texas811/tickets/update", {
        ticketId,
        ...updates,
      });
    },

    submitNoResponse(
      ticketId: string,
      vendors: Texas811NoResponseVendor[]
    ) {
      return post<Texas811NoResponseResponse>(
        "/texas811/tickets/no-response",
        { ticketId, vendors }
      );
    },
  };
}

export type Texas811Client = ReturnType<typeof createTexas811Client>;
