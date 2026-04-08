import { NextRequest, NextResponse } from 'next/server';
export { j as ApiError, A as ApiResponse, k as TEXAS811_ACTION_LOCK_HOURS, l as Texas811AuthResponse, i as Texas811CreateResponse, h as Texas811CreateTicketData, m as Texas811EligibilityErrorDetails, n as Texas811Excavator, o as Texas811ItemAttribute, p as Texas811ItemAttributeValue, g as Texas811NoResponseResponse, f as Texas811NoResponseVendor, T as Texas811SearchParams, a as Texas811SearchResponse, q as Texas811SearchResult, r as Texas811TicketEligibility, b as Texas811TicketHtmlData, c as Texas811TicketResponse, d as Texas811TicketUpdateParams, s as Texas811UnresponsiveVendor, e as Texas811UpdateResponse, t as Texas811VendorResponse, u as Texas811WorkSite, v as getTexas811TicketEligibility, w as getUnresponsiveVendors, x as hasVendorResponded, y as isVendorUnresponsive } from './utils-CWxncFAo.js';

interface Texas811RoutesConfig {
    /** Service account email — REQUIRED */
    email: string;
    /** Service account password — REQUIRED */
    password: string;
    /** Service account username — injected into takenBy + callerEmail on create */
    username: string;
    /** Texas 811 base URL (default: "https://txgc.texas811.org") */
    baseUrl?: string;
    /** Request timeout in ms (default: 30000) */
    timeoutMs?: number;
    /** User-Agent string (default: "Texas811Client/1.0") */
    userAgent?: string;
    /** Optional auth verification callback — return false to reject with 401 */
    verifyAuth?: (request: Request) => Promise<boolean>;
}
declare function createTexas811Routes(config: Texas811RoutesConfig): {
    search: {
        GET(request: NextRequest): Promise<NextResponse<unknown>>;
    };
    tickets: {
        GET(request: NextRequest): Promise<NextResponse<unknown>>;
    };
    "tickets/create": {
        POST(request: Request): Promise<NextResponse<unknown>>;
    };
    "tickets/update": {
        POST(request: Request): Promise<NextResponse<unknown>>;
    };
    "tickets/no-response": {
        POST(request: Request): Promise<NextResponse<unknown>>;
    };
};
type Texas811Routes = ReturnType<typeof createTexas811Routes>;

export { type Texas811Routes, type Texas811RoutesConfig, createTexas811Routes };
