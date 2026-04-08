interface ApiError {
    status: number;
    message: string;
    details?: unknown;
}
interface ApiResponse<T> {
    ok: boolean;
    status: number;
    data?: T;
    error?: ApiError;
}
interface Texas811AuthResponse {
    token: string;
    [key: string]: unknown;
}
interface Texas811SearchParams {
    ticketNumber?: string;
    startDate?: string;
    endDate?: string;
    user?: string;
    excavatorName?: string;
}
interface Texas811SearchResult {
    [key: string]: unknown;
}
type Texas811SearchResponse = Texas811SearchResult[];
interface Texas811TicketHtmlData {
    ticket?: Record<string, unknown>;
    saSnapshots?: unknown[];
    customData?: Record<string, unknown>;
    _parseError?: boolean;
    _rawHtmlLength?: number;
}
interface Texas811VendorResponse {
    organizationId?: number;
    organizationName?: string;
    code?: string;
    codeId?: number;
    facilities?: Array<{
        name: string;
    }>;
    creation?: string;
    ticketId?: number;
    ticketNumber?: string;
    lastAction?: {
        name: string;
    } | null;
    lastActionId?: number;
}
interface Texas811TicketResponse {
    id?: number;
    number?: string;
    creation?: string;
    responses?: Texas811VendorResponse[];
    [key: string]: unknown;
}
interface Texas811TicketEligibility {
    createdAt: string | null;
    eligibleAt: string | null;
    hoursRemaining: number | null;
    isLocked: boolean;
    canCancel: boolean;
    canUpdate: boolean;
    canUpdateRemark: boolean;
    canNoResponse: boolean;
}
interface Texas811EligibilityErrorDetails {
    createdAt: string | null;
    eligibleAt: string | null;
    hoursRemaining: number | null;
}
interface Texas811TicketUpdateParams {
    comment?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactCallback?: string;
    updateOnly?: boolean;
    cancel?: boolean;
}
interface Texas811UpdateResponse {
    newTicketNumber: string | null;
    oldTicketNumber: string | null;
    latestTicketId?: string;
    isOutdatedTicket: boolean;
    rawResponse?: string;
}
interface Texas811NoResponseVendor {
    code: string;
    name: string;
    facilities?: string[];
    lastAction?: {
        name: string;
    } | null;
    reason?: string;
}
interface Texas811NoResponseResponse extends Texas811UpdateResponse {
    vendorCount: number;
}
interface Texas811UnresponsiveVendor {
    organizationId?: number;
    organizationName?: string;
    code?: string;
    codeId?: number;
    facilities: string[];
    responseCreation?: string;
    ticketId?: number;
    ticketNumber?: string;
}
interface Texas811Excavator {
    phone: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    fax?: string;
    caller: string;
    callerPhone: string;
    callerPhoneExtension?: string;
    callerEmail?: string;
    contact: string;
    contactPhone: string;
    contactPhoneExtension?: string;
    contactEmail: string;
    callback: string;
}
interface Texas811WorkSite {
    callerSuppliedPoints?: string;
    latitude: number;
    longitude: number;
    secondaryLatitude: number;
    secondaryLongitude: number;
    viewAreaExtent: string;
    workAreaExtent: string;
    workArea: string;
    workAreaBuffer: string;
}
interface Texas811ItemAttribute {
    id?: string;
    itemTypeId?: string;
    name?: string;
    display?: string;
    dataType?: string;
    validationRegex?: string;
    isUpdatable?: boolean;
    creation?: string;
    isActive?: boolean;
}
interface Texas811ItemAttributeValue {
    itemId?: string;
    itemAttribute?: Texas811ItemAttribute;
    value?: string;
}
interface Texas811CreateTicketData {
    started: string;
    takenBy?: string;
    hoursNotice?: number;
    compliance?: string;
    workDoneFor: string;
    extent?: string;
    faxCopyToCaller?: boolean;
    emailCopyToCaller?: boolean;
    excavator: Texas811Excavator;
    ticketType?: string;
    workType: string;
    workOn: string;
    workState: string;
    workCounty: string;
    workPlace: string;
    workAddress2?: string;
    workStreetAddress: string;
    workStreetPrefix?: string;
    workStreetName: string;
    workStreetType?: string;
    workStreetSuffix?: string;
    workIntersection: string;
    workSite: Texas811WorkSite;
    remarks: string;
    drivingDirections: string;
    markingInstructions: string;
    isWhitePaint?: boolean;
    isExplosives?: boolean;
    isDirectionalBoring?: boolean;
    isAddressInRemarks?: boolean;
    isGridsCallerSupplied?: boolean;
    itemAttributeValues?: Texas811ItemAttributeValue[];
    suspendedCount?: number;
    suspendedCategory?: string;
    source?: string;
}
interface Texas811CreateResponse {
    ticketId: string | null;
    ticketNumber: string | null;
    rawResponse?: string;
}

declare const TEXAS811_ACTION_LOCK_HOURS = 72;
declare function getTexas811TicketEligibility(creation: string | null | undefined, now?: Date): Texas811TicketEligibility;
/**
 * Check if a vendor has submitted any response (including overdue responses).
 * Distinct from !isVendorUnresponsive(), which also treats "Response Overdue" as unresponsive.
 */
declare function hasVendorResponded(response: Texas811VendorResponse): boolean;
/**
 * Check if a vendor response indicates the vendor has NOT responded
 */
declare function isVendorUnresponsive(response: Texas811VendorResponse): boolean;
/**
 * Get list of vendors that haven't responded within the specified hours from ticket creation
 */
declare function getUnresponsiveVendors(ticketData: Texas811TicketResponse, hours?: number): Texas811UnresponsiveVendor[];

export { type ApiResponse as A, type Texas811SearchParams as T, type Texas811SearchResponse as a, type Texas811TicketHtmlData as b, type Texas811TicketResponse as c, type Texas811TicketUpdateParams as d, type Texas811UpdateResponse as e, type Texas811NoResponseVendor as f, type Texas811NoResponseResponse as g, type ApiError as h, TEXAS811_ACTION_LOCK_HOURS as i, type Texas811AuthResponse as j, type Texas811CreateResponse as k, type Texas811CreateTicketData as l, type Texas811EligibilityErrorDetails as m, type Texas811Excavator as n, type Texas811ItemAttribute as o, type Texas811ItemAttributeValue as p, type Texas811SearchResult as q, type Texas811TicketEligibility as r, type Texas811UnresponsiveVendor as s, type Texas811VendorResponse as t, type Texas811WorkSite as u, getTexas811TicketEligibility as v, getUnresponsiveVendors as w, hasVendorResponded as x, isVendorUnresponsive as y };
