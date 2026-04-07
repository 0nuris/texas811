// @moveearth/texas811 — main entry point (browser-safe)

export { createTexas811Client } from "./client";
export type { Texas811Client, Texas811ClientConfig } from "./client";

export type { ApiResponse, ApiError } from "./types";

export type {
  Texas811AuthResponse,
  Texas811SearchParams,
  Texas811SearchResult,
  Texas811SearchResponse,
  Texas811TicketHtmlData,
  Texas811VendorResponse,
  Texas811TicketResponse,
  Texas811TicketEligibility,
  Texas811EligibilityErrorDetails,
  Texas811TicketUpdateParams,
  Texas811UpdateResponse,
  Texas811NoResponseVendor,
  Texas811NoResponseResponse,
  Texas811UnresponsiveVendor,
  Texas811Excavator,
  Texas811WorkSite,
  Texas811ItemAttribute,
  Texas811ItemAttributeValue,
  Texas811CreateTicketData,
  Texas811CreateResponse,
} from "./types";

export {
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  isVendorUnresponsive,
  hasVendorResponded,
  TEXAS811_ACTION_LOCK_HOURS,
} from "./utils";
