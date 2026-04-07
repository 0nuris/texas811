// Texas 811 pure utility functions (safe for client-side import)

import type {
  Texas811TicketEligibility,
  Texas811VendorResponse,
  Texas811TicketResponse,
  Texas811UnresponsiveVendor,
} from "./types";

export const TEXAS811_ACTION_LOCK_HOURS = 72;

function parseCreationDate(
  creation: string | null | undefined
): Date | null {
  if (!creation) {
    return null;
  }

  const parsed = new Date(creation);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getTexas811TicketEligibility(
  creation: string | null | undefined,
  now: Date = new Date()
): Texas811TicketEligibility {
  const createdAtDate = parseCreationDate(creation);

  if (!createdAtDate) {
    return {
      createdAt: null,
      eligibleAt: null,
      hoursRemaining: null,
      isLocked: true,
      canCancel: true,
      canUpdate: false,
      canUpdateRemark: false,
      canNoResponse: false,
    };
  }

  const eligibleAtDate = new Date(
    createdAtDate.getTime() + TEXAS811_ACTION_LOCK_HOURS * 60 * 60 * 1000
  );
  const remainingMs = eligibleAtDate.getTime() - now.getTime();
  const hoursRemaining =
    remainingMs > 0 ? Number((remainingMs / (1000 * 60 * 60)).toFixed(2)) : 0;
  const isLocked = remainingMs > 0;

  return {
    createdAt: createdAtDate.toISOString(),
    eligibleAt: eligibleAtDate.toISOString(),
    hoursRemaining,
    isLocked,
    canCancel: true,
    canUpdate: !isLocked,
    canUpdateRemark: !isLocked,
    canNoResponse: !isLocked,
  };
}

/**
 * Check if a vendor has submitted any response (including overdue responses).
 * Distinct from !isVendorUnresponsive(), which also treats "Response Overdue" as unresponsive.
 */
export function hasVendorResponded(response: Texas811VendorResponse): boolean {
  return (
    response.lastAction !== null &&
    response.lastAction !== undefined &&
    response.lastActionId != null &&
    response.lastActionId !== 0
  );
}

/**
 * Check if a vendor response indicates the vendor has NOT responded
 */
export function isVendorUnresponsive(response: Texas811VendorResponse): boolean {
  const hasNoResponse =
    response.lastAction === null || response.lastActionId === 0;
  const isResponseOverdue =
    response.lastAction !== null &&
    response.lastAction !== undefined &&
    response.lastAction.name === "Response Overdue";
  return hasNoResponse || isResponseOverdue;
}

/**
 * Get list of vendors that haven't responded within the specified hours from ticket creation
 */
export function getUnresponsiveVendors(
  ticketData: Texas811TicketResponse,
  hours: number = TEXAS811_ACTION_LOCK_HOURS
): Texas811UnresponsiveVendor[] {
  if (!ticketData?.responses || !ticketData.creation) {
    return [];
  }

  const creationDate = new Date(ticketData.creation);
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation < hours) {
    return [];
  }

  return ticketData.responses
    .filter((response) => isVendorUnresponsive(response))
    .map((response) => ({
      organizationId: response.organizationId,
      organizationName: response.organizationName,
      code: response.code,
      codeId: response.codeId,
      facilities: response.facilities?.map((f) => f.name) || [],
      responseCreation: response.creation,
      ticketId: response.ticketId,
      ticketNumber: response.ticketNumber,
    }));
}
