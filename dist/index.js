import {
  TEXAS811_ACTION_LOCK_HOURS,
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  hasVendorResponded,
  isVendorUnresponsive
} from "./chunk-MJMAOZHR.js";

// src/client.ts
async function fetchJson(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = {
        status: res.status,
        message: body.error ?? res.statusText,
        details: body.details
      };
      return { ok: false, status: res.status, error };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data };
  } catch (e) {
    clearTimeout(timeout);
    const message = e instanceof Error && e.name === "AbortError" ? "Request timed out" : e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      status: 0,
      error: { status: 0, message }
    };
  }
}
function createTexas811Client(config) {
  const { baseUrl, headers: defaultHeaders = {}, timeoutMs = 3e4 } = config;
  function get(path, params) {
    const url = new URL(
      `${baseUrl}${path}`,
      typeof window !== "undefined" ? window.location.origin : void 0
    );
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    return fetchJson(
      url.toString(),
      {
        method: "GET",
        headers: { Accept: "application/json", ...defaultHeaders }
      },
      timeoutMs
    );
  }
  function post(path, body) {
    const url = `${baseUrl}${path}`;
    return fetchJson(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...defaultHeaders
        },
        body: JSON.stringify(body)
      },
      timeoutMs
    );
  }
  return {
    searchTickets(params) {
      const queryParams = {};
      if (params?.ticketNumber) queryParams.ticketNumber = params.ticketNumber;
      if (params?.startDate) queryParams.startDate = params.startDate;
      if (params?.endDate) queryParams.endDate = params.endDate;
      if (params?.user) queryParams.user = params.user;
      if (params?.excavatorName)
        queryParams.excavatorName = params.excavatorName;
      return get("/texas811/search", queryParams);
    },
    getTicketByNumber(ticketNumber) {
      return get("/texas811/tickets", {
        ticketNumber
      });
    },
    getTicketById(ticketId) {
      return get("/texas811/tickets", { ticketId });
    },
    updateTicket(ticketId, updates) {
      return post("/texas811/tickets/update", {
        ticketId,
        ...updates
      });
    },
    submitNoResponse(ticketId, vendors) {
      return post(
        "/texas811/tickets/no-response",
        { ticketId, vendors }
      );
    }
  };
}
export {
  TEXAS811_ACTION_LOCK_HOURS,
  createTexas811Client,
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  hasVendorResponded,
  isVendorUnresponsive
};
