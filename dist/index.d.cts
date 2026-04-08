import { T as Texas811SearchParams, A as ApiResponse, a as Texas811SearchResponse, b as Texas811TicketHtmlData, c as Texas811TicketResponse, d as Texas811TicketUpdateParams, e as Texas811UpdateResponse, f as Texas811NoResponseVendor, g as Texas811NoResponseResponse } from './utils-RrZdWXkF.cjs';
export { h as ApiError, i as TEXAS811_ACTION_LOCK_HOURS, j as Texas811AuthResponse, k as Texas811CreateResponse, l as Texas811CreateTicketData, m as Texas811EligibilityErrorDetails, n as Texas811Excavator, o as Texas811ItemAttribute, p as Texas811ItemAttributeValue, q as Texas811SearchResult, r as Texas811TicketEligibility, s as Texas811UnresponsiveVendor, t as Texas811VendorResponse, u as Texas811WorkSite, v as getTexas811TicketEligibility, w as getUnresponsiveVendors, x as hasVendorResponded, y as isVendorUnresponsive } from './utils-RrZdWXkF.cjs';

interface Texas811ClientConfig {
    /** Base URL for API routes, e.g. "/api" or "https://myapp.com/api" */
    baseUrl: string;
    /** Default headers to include on every request (e.g. auth tokens) */
    headers?: Record<string, string>;
    /** Request timeout in ms (default: 30000) */
    timeoutMs?: number;
}
declare function createTexas811Client(config: Texas811ClientConfig): {
    searchTickets(params?: Texas811SearchParams): Promise<ApiResponse<Texas811SearchResponse>>;
    getTicketByNumber(ticketNumber: string): Promise<ApiResponse<Texas811TicketHtmlData>>;
    getTicketById(ticketId: string): Promise<ApiResponse<Texas811TicketResponse>>;
    updateTicket(ticketId: string, updates: Texas811TicketUpdateParams): Promise<ApiResponse<Texas811UpdateResponse>>;
    submitNoResponse(ticketId: string, vendors: Texas811NoResponseVendor[]): Promise<ApiResponse<Texas811NoResponseResponse>>;
};
type Texas811Client = ReturnType<typeof createTexas811Client>;

export { ApiResponse, type Texas811Client, type Texas811ClientConfig, Texas811NoResponseResponse, Texas811NoResponseVendor, Texas811SearchParams, Texas811SearchResponse, Texas811TicketHtmlData, Texas811TicketResponse, Texas811TicketUpdateParams, Texas811UpdateResponse, createTexas811Client };
