import { T as Texas811SearchParams, a as Texas811SearchResponse, b as Texas811TicketHtmlData, c as Texas811TicketResponse, z as Texas811TicketHistory, d as Texas811TicketUpdateParams, e as Texas811UpdateResponse, f as Texas811NoResponseVendor, g as Texas811NoResponseResponse, h as Texas811CreateTicketData, i as Texas811CreateResponse, B as Texas811TicketHistoryEntry } from './utils-CGID7aBr.cjs';
export { j as ApiError, A as ApiResponse, k as TEXAS811_ACTION_LOCK_HOURS, l as Texas811AuthResponse, m as Texas811EligibilityErrorDetails, n as Texas811Excavator, o as Texas811ItemAttribute, p as Texas811ItemAttributeValue, q as Texas811SearchResult, r as Texas811TicketEligibility, s as Texas811UnresponsiveVendor, t as Texas811VendorResponse, u as Texas811WorkSite, v as getTexas811TicketEligibility, w as getUnresponsiveVendors, x as hasVendorResponded, y as isVendorUnresponsive } from './utils-CGID7aBr.cjs';

declare const UPDATE_ONLY_FLAG = "$!UPD8T$ONLY!$";
declare const CANCEL_FLAG = "CAN$CAN$";
declare const NO_RESPONSE_PREFIX = "NR$";
declare const NO_RESPONSE_SUFFIX = "$NR";
/**
 * Parse the `<tickets>` history bundle into the chain of tickets it contains.
 * The endpoint returns XML (even with `format=json`); we extract each
 * top-level `<ticket id="...">` and read its own number/oldNumber/creation.
 *
 * The ticket-level fields appear before the nested `<responses>` block (which
 * has its own `creation`/`number`-like fields), so we read them from the head
 * of each block to avoid picking up a vendor-response value.
 */
declare function parseTicketHistory(xml: string): Texas811TicketHistoryEntry[];
/**
 * Find the current ticket in a history chain — the tip that no other entry
 * supersedes (its `ticketNumber` is not any other entry's `oldNumber`). This is
 * order-independent; if the tip is ambiguous (it never should be for a linear
 * chain) we fall back to the entry with the latest `creation`.
 */
declare function findCurrentTicket(chain: Texas811TicketHistoryEntry[]): Texas811TicketHistoryEntry | null;
interface Texas811Config {
    /** Texas 811 base URL (default: "https://txgc.texas811.org") */
    baseUrl?: string;
    /** Request timeout in ms (default: 30000) */
    timeoutMs?: number;
    /** Service account email — REQUIRED */
    email: string;
    /** Service account password — REQUIRED */
    password: string;
    /** User-Agent string (default: "Texas811Client/1.0") */
    userAgent?: string;
}
declare function createTexas811Server(config: Texas811Config): Texas811Server;
interface Texas811Server {
    getToken(): Promise<string>;
    clearToken(): void;
    searchTickets(token: string, options?: Texas811SearchParams): Promise<Texas811SearchResponse>;
    getTicketByNumberHtml(token: string, ticketNumber: string): Promise<Texas811TicketHtmlData>;
    getTicketById(token: string, ticketId: string): Promise<Texas811TicketResponse>;
    getTicketHistory(token: string, ticketId: string): Promise<Texas811TicketHistory>;
    getWorkTypes(token: string): Promise<string[]>;
    getEquipmentTypes(token: string): Promise<string[]>;
    updateTicket(token: string, ticketId: string, updates?: Texas811TicketUpdateParams): Promise<Texas811UpdateResponse>;
    submitNoResponse(token: string, ticketId: string, vendors: Texas811NoResponseVendor[]): Promise<Texas811NoResponseResponse>;
    createTicketWithSession(token: string, ticketData: Texas811CreateTicketData, temporaryTicketId?: string): Promise<Texas811CreateResponse>;
}

export { CANCEL_FLAG, NO_RESPONSE_PREFIX, NO_RESPONSE_SUFFIX, type Texas811Config, Texas811CreateResponse, Texas811CreateTicketData, Texas811NoResponseResponse, Texas811NoResponseVendor, Texas811SearchParams, Texas811SearchResponse, type Texas811Server, Texas811TicketHistory, Texas811TicketHistoryEntry, Texas811TicketHtmlData, Texas811TicketResponse, Texas811TicketUpdateParams, Texas811UpdateResponse, UPDATE_ONLY_FLAG, createTexas811Server, findCurrentTicket, parseTicketHistory };
