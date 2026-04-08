// src/utils.ts
var TEXAS811_ACTION_LOCK_HOURS = 72;
function parseCreationDate(creation) {
  if (!creation) {
    return null;
  }
  const parsed = new Date(creation);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}
function getTexas811TicketEligibility(creation, now = /* @__PURE__ */ new Date()) {
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
      canNoResponse: false
    };
  }
  const eligibleAtDate = new Date(
    createdAtDate.getTime() + TEXAS811_ACTION_LOCK_HOURS * 60 * 60 * 1e3
  );
  const remainingMs = eligibleAtDate.getTime() - now.getTime();
  const hoursRemaining = remainingMs > 0 ? Number((remainingMs / (1e3 * 60 * 60)).toFixed(2)) : 0;
  const isLocked = remainingMs > 0;
  return {
    createdAt: createdAtDate.toISOString(),
    eligibleAt: eligibleAtDate.toISOString(),
    hoursRemaining,
    isLocked,
    canCancel: true,
    canUpdate: !isLocked,
    canUpdateRemark: !isLocked,
    canNoResponse: !isLocked
  };
}
function hasVendorResponded(response) {
  return response.lastAction !== null && response.lastAction !== void 0 && response.lastActionId != null && response.lastActionId !== 0;
}
function isVendorUnresponsive(response) {
  const hasNoResponse = response.lastAction === null || response.lastActionId === 0;
  const isResponseOverdue = response.lastAction !== null && response.lastAction !== void 0 && response.lastAction.name === "Response Overdue";
  return hasNoResponse || isResponseOverdue;
}
function getUnresponsiveVendors(ticketData, hours = TEXAS811_ACTION_LOCK_HOURS) {
  if (!ticketData?.responses || !ticketData.creation) {
    return [];
  }
  const creationDate = new Date(ticketData.creation);
  const now = /* @__PURE__ */ new Date();
  const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1e3 * 60 * 60);
  if (hoursSinceCreation < hours) {
    return [];
  }
  return ticketData.responses.filter((response) => isVendorUnresponsive(response)).map((response) => ({
    organizationId: response.organizationId,
    organizationName: response.organizationName,
    code: response.code,
    codeId: response.codeId,
    facilities: response.facilities?.map((f) => f.name) || [],
    responseCreation: response.creation,
    ticketId: response.ticketId,
    ticketNumber: response.ticketNumber
  }));
}

export {
  TEXAS811_ACTION_LOCK_HOURS,
  getTexas811TicketEligibility,
  hasVendorResponded,
  isVendorUnresponsive,
  getUnresponsiveVendors
};
