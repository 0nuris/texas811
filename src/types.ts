// Texas 811 API Types

// === Generic API Response ===

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: ApiError;
}

// === Authentication ===

export interface Texas811AuthResponse {
  token: string;
  [key: string]: unknown;
}

// === Search ===

export interface Texas811SearchParams {
  ticketNumber?: string;
  startDate?: string;
  endDate?: string;
  user?: string;
  excavatorName?: string;
}

export interface Texas811SearchResult {
  [key: string]: unknown;
}

export type Texas811SearchResponse = Texas811SearchResult[];

// === Ticket Detail (from HTML parse) ===

export interface Texas811TicketHtmlData {
  ticket?: Record<string, unknown>;
  saSnapshots?: unknown[];
  customData?: Record<string, unknown>;
  _parseError?: boolean;
  _rawHtmlLength?: number;
}

// === Vendor Response ===

export interface Texas811VendorResponse {
  organizationId?: number;
  organizationName?: string;
  code?: string;
  codeId?: number;
  facilities?: Array<{ name: string }>;
  creation?: string;
  ticketId?: number;
  ticketNumber?: string;
  lastAction?: { name: string } | null;
  lastActionId?: number;
}

// === Ticket Detail (from JSON API) ===

export interface Texas811TicketResponse {
  id?: number;
  number?: string;
  creation?: string;
  responses?: Texas811VendorResponse[];
  [key: string]: unknown;
}

// === Ticket History (update chain) ===

/**
 * One ticket in a chain's history, as returned by the history endpoint. When a
 * Texas 811 ticket is updated it becomes a NEW ticket (new id + number) that
 * links back to the previous one via `oldNumber` — there is no forward pointer,
 * which is why the history bundle is the only way to get from a stale ticket to
 * the current one. We don't track these as versions; the chain is just how we
 * find the current ticket to catch the DB up to.
 */
export interface Texas811TicketHistoryEntry {
  /** Internal ticket id (the `<ticket id="...">` attribute). */
  ticketId: string;
  /** Public ticket number for this entry. */
  ticketNumber: string | null;
  /** Previous ticket's number, or null for the original ticket. */
  oldNumber: string | null;
  /** ISO creation timestamp. */
  creation: string | null;
}

/**
 * Full history chain for a ticket. The history endpoint returns the SAME bundle
 * regardless of which member id is queried, so `chain` holds every ticket in
 * the chain and `current` is the one to catch up to (the tip — the entry no
 * other entry supersedes).
 */
export interface Texas811TicketHistory {
  /** The ticket id that was queried. */
  requestedTicketId: string;
  /** Every ticket in the chain, in the order returned (oldest→newest). */
  chain: Texas811TicketHistoryEntry[];
  /** The current ticket to catch up to (null only if the chain came back empty). */
  current: Texas811TicketHistoryEntry | null;
  /** Raw XML response body, for debugging. */
  rawResponse?: string;
}

export interface Texas811TicketEligibility {
  createdAt: string | null;
  eligibleAt: string | null;
  hoursRemaining: number | null;
  isLocked: boolean;
  canCancel: boolean;
  canUpdate: boolean;
  canUpdateRemark: boolean;
  canNoResponse: boolean;
}

export interface Texas811EligibilityErrorDetails {
  createdAt: string | null;
  eligibleAt: string | null;
  hoursRemaining: number | null;
}

// === Ticket Update ===

export interface Texas811TicketUpdateParams {
  comment?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactCallback?: string;
  updateOnly?: boolean;
  cancel?: boolean;
}

export interface Texas811UpdateResponse {
  newTicketNumber: string | null;
  oldTicketNumber: string | null;
  latestTicketId?: string;
  isOutdatedTicket: boolean;
  rawResponse?: string;
}

// === No Response ===

export interface Texas811NoResponseVendor {
  code: string;
  name: string;
  facilities?: string[];
  lastAction?: { name: string } | null;
  reason?: string;
}

export interface Texas811NoResponseResponse extends Texas811UpdateResponse {
  vendorCount: number;
}

// === Unresponsive Vendors (computed from ticket data) ===

export interface Texas811UnresponsiveVendor {
  organizationId?: number;
  organizationName?: string;
  code?: string;
  codeId?: number;
  facilities: string[];
  responseCreation?: string;
  ticketId?: number;
  ticketNumber?: string;
}

// === Ticket Creation ===

export interface Texas811Excavator {
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

export interface Texas811WorkSite {
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

export interface Texas811ItemAttribute {
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

export interface Texas811ItemAttributeValue {
  itemId?: string;
  itemAttribute?: Texas811ItemAttribute;
  value?: string;
}

export interface Texas811CreateTicketData {
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

export interface Texas811CreateResponse {
  ticketId: string | null;
  ticketNumber: string | null;
  rawResponse?: string;
}
