import {
  getTexas811TicketEligibility,
  TEXAS811_ACTION_LOCK_HOURS,
  hasVendorResponded,
  isVendorUnresponsive,
  getUnresponsiveVendors,
} from "../utils";

describe("getTexas811TicketEligibility", () => {
  const now = new Date("2026-03-31T12:00:00.000Z");

  it("locks update, update remark, and no response when the ticket is under 72 hours old", () => {
    const eligibility = getTexas811TicketEligibility(
      "2026-03-30T12:00:00.000Z",
      now
    );

    expect(eligibility.isLocked).toBe(true);
    expect(eligibility.canCancel).toBe(true);
    expect(eligibility.canUpdate).toBe(false);
    expect(eligibility.canUpdateRemark).toBe(false);
    expect(eligibility.canNoResponse).toBe(false);
    expect(eligibility.hoursRemaining).toBe(48);
  });

  it("unlocks actions exactly 72 hours after creation", () => {
    const eligibility = getTexas811TicketEligibility(
      "2026-03-28T12:00:00.000Z",
      now
    );

    expect(eligibility.isLocked).toBe(false);
    expect(eligibility.canUpdate).toBe(true);
    expect(eligibility.canUpdateRemark).toBe(true);
    expect(eligibility.canNoResponse).toBe(true);
    expect(eligibility.hoursRemaining).toBe(0);
  });

  it("keeps actions unlocked after 72 hours have passed", () => {
    const eligibility = getTexas811TicketEligibility(
      "2026-03-27T09:30:00.000Z",
      now
    );

    expect(eligibility.isLocked).toBe(false);
    expect(eligibility.canUpdate).toBe(true);
    expect(eligibility.canUpdateRemark).toBe(true);
    expect(eligibility.canNoResponse).toBe(true);
    expect(eligibility.hoursRemaining).toBe(0);
  });

  it("fails closed for missing or invalid creation timestamps", () => {
    const missing = getTexas811TicketEligibility(null, now);
    const invalid = getTexas811TicketEligibility("not-a-date", now);

    [missing, invalid].forEach((eligibility) => {
      expect(eligibility.createdAt).toBeNull();
      expect(eligibility.eligibleAt).toBeNull();
      expect(eligibility.hoursRemaining).toBeNull();
      expect(eligibility.isLocked).toBe(true);
      expect(eligibility.canCancel).toBe(true);
      expect(eligibility.canUpdate).toBe(false);
      expect(eligibility.canUpdateRemark).toBe(false);
      expect(eligibility.canNoResponse).toBe(false);
    });
  });

  it("always allows cancellation regardless of ticket age", () => {
    const youngEligibility = getTexas811TicketEligibility(
      "2026-03-31T11:00:00.000Z",
      now
    );
    const missingEligibility = getTexas811TicketEligibility(undefined, now);

    expect(youngEligibility.canCancel).toBe(true);
    expect(missingEligibility.canCancel).toBe(true);
    expect(TEXAS811_ACTION_LOCK_HOURS).toBe(72);
  });
});

describe("hasVendorResponded", () => {
  it("returns true when vendor has a response action", () => {
    expect(
      hasVendorResponded({
        lastAction: { name: "Clear" },
        lastActionId: 5,
      })
    ).toBe(true);
  });

  it("returns false when lastAction is null", () => {
    expect(
      hasVendorResponded({ lastAction: null, lastActionId: 0 })
    ).toBe(false);
  });

  it("returns false when lastActionId is 0", () => {
    expect(
      hasVendorResponded({
        lastAction: { name: "Response Overdue" },
        lastActionId: 0,
      })
    ).toBe(false);
  });
});

describe("isVendorUnresponsive", () => {
  it("returns true when lastAction is null", () => {
    expect(isVendorUnresponsive({ lastAction: null })).toBe(true);
  });

  it("returns true when response is overdue", () => {
    expect(
      isVendorUnresponsive({
        lastAction: { name: "Response Overdue" },
        lastActionId: 3,
      })
    ).toBe(true);
  });

  it("returns false when vendor has responded", () => {
    expect(
      isVendorUnresponsive({
        lastAction: { name: "Clear" },
        lastActionId: 5,
      })
    ).toBe(false);
  });
});

describe("getUnresponsiveVendors", () => {
  it("returns empty array when no responses", () => {
    expect(getUnresponsiveVendors({ responses: [] })).toEqual([]);
  });

  it("returns empty array when creation is missing", () => {
    expect(
      getUnresponsiveVendors({
        responses: [{ lastAction: null }],
      })
    ).toEqual([]);
  });

  it("returns unresponsive vendors after lock period", () => {
    const creation = new Date(
      Date.now() - 73 * 60 * 60 * 1000
    ).toISOString();

    const result = getUnresponsiveVendors({
      creation,
      responses: [
        {
          organizationId: 1,
          organizationName: "Test Vendor",
          code: "TV",
          lastAction: null,
          lastActionId: 0,
          facilities: [{ name: "Gas" }],
        },
        {
          organizationId: 2,
          organizationName: "Responded Vendor",
          code: "RV",
          lastAction: { name: "Clear" },
          lastActionId: 5,
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].organizationName).toBe("Test Vendor");
    expect(result[0].facilities).toEqual(["Gas"]);
  });
});
