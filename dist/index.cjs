"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }





var _chunkLB337HDPcjs = require('./chunk-LB337HDP.cjs');

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
        message: _nullishCoalesce(body.error, () => ( res.statusText)),
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
      if (_optionalChain([params, 'optionalAccess', _ => _.ticketNumber])) queryParams.ticketNumber = params.ticketNumber;
      if (_optionalChain([params, 'optionalAccess', _2 => _2.startDate])) queryParams.startDate = params.startDate;
      if (_optionalChain([params, 'optionalAccess', _3 => _3.endDate])) queryParams.endDate = params.endDate;
      if (_optionalChain([params, 'optionalAccess', _4 => _4.user])) queryParams.user = params.user;
      if (_optionalChain([params, 'optionalAccess', _5 => _5.excavatorName]))
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
    },
    createTicket(ticketData, temporaryTicketId) {
      return post("/texas811/tickets/create", {
        ticketData,
        temporaryTicketId
      });
    }
  };
}







exports.TEXAS811_ACTION_LOCK_HOURS = _chunkLB337HDPcjs.TEXAS811_ACTION_LOCK_HOURS; exports.createTexas811Client = createTexas811Client; exports.getTexas811TicketEligibility = _chunkLB337HDPcjs.getTexas811TicketEligibility; exports.getUnresponsiveVendors = _chunkLB337HDPcjs.getUnresponsiveVendors; exports.hasVendorResponded = _chunkLB337HDPcjs.hasVendorResponded; exports.isVendorUnresponsive = _chunkLB337HDPcjs.isVendorUnresponsive;
