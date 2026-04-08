"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/utils.ts
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
  if (!_optionalChain([ticketData, 'optionalAccess', _ => _.responses]) || !ticketData.creation) {
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
    facilities: _optionalChain([response, 'access', _2 => _2.facilities, 'optionalAccess', _3 => _3.map, 'call', _4 => _4((f) => f.name)]) || [],
    responseCreation: response.creation,
    ticketId: response.ticketId,
    ticketNumber: response.ticketNumber
  }));
}







exports.TEXAS811_ACTION_LOCK_HOURS = TEXAS811_ACTION_LOCK_HOURS; exports.getTexas811TicketEligibility = getTexas811TicketEligibility; exports.hasVendorResponded = hasVendorResponded; exports.isVendorUnresponsive = isVendorUnresponsive; exports.getUnresponsiveVendors = getUnresponsiveVendors;
