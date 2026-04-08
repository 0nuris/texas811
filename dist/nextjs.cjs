"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

var _chunkGOBA6KQ3cjs = require('./chunk-GOBA6KQ3.cjs');






var _chunkLB337HDPcjs = require('./chunk-LB337HDP.cjs');

// src/nextjs.ts
var _server = require('next/server');
var _zod = require('zod');
var itemAttributeSchema = _zod.z.object({
  id: _zod.z.string().optional(),
  itemTypeId: _zod.z.string().optional(),
  name: _zod.z.string().optional(),
  display: _zod.z.string().optional(),
  dataType: _zod.z.string().optional(),
  validationRegex: _zod.z.string().optional(),
  isUpdatable: _zod.z.boolean().optional(),
  creation: _zod.z.string().optional(),
  isActive: _zod.z.boolean().optional()
}).passthrough();
var itemAttributeValueSchema = _zod.z.object({
  itemId: _zod.z.string().optional(),
  itemAttribute: itemAttributeSchema.optional(),
  value: _zod.z.string().optional()
}).passthrough();
var excavatorSchema = _zod.z.object({
  phone: _zod.z.string().min(1),
  name: _zod.z.string().min(1),
  address: _zod.z.string().min(1),
  city: _zod.z.string().min(1),
  state: _zod.z.string().min(1),
  zip: _zod.z.string().min(1),
  fax: _zod.z.string().optional(),
  caller: _zod.z.string().min(1),
  callerPhone: _zod.z.string().min(1),
  callerPhoneExtension: _zod.z.string().optional(),
  callerEmail: _zod.z.string().optional(),
  contact: _zod.z.string().min(1),
  contactPhone: _zod.z.string().min(1),
  contactPhoneExtension: _zod.z.string().optional(),
  contactEmail: _zod.z.string().min(1),
  callback: _zod.z.string().min(1)
}).passthrough();
var workSiteSchema = _zod.z.object({
  callerSuppliedPoints: _zod.z.string().optional(),
  latitude: _zod.z.number().gte(-90).lte(90),
  longitude: _zod.z.number().gte(-180).lte(180),
  secondaryLatitude: _zod.z.number().gte(-90).lte(90),
  secondaryLongitude: _zod.z.number().gte(-180).lte(180),
  viewAreaExtent: _zod.z.string().min(1),
  workAreaExtent: _zod.z.string().min(1),
  workArea: _zod.z.string().min(1),
  workAreaBuffer: _zod.z.string()
}).passthrough();
var ticketDataSchema = _zod.z.object({
  started: _zod.z.string().min(1),
  takenBy: _zod.z.string().optional(),
  hoursNotice: _zod.z.number().optional(),
  compliance: _zod.z.string().optional(),
  workDoneFor: _zod.z.string(),
  extent: _zod.z.string().optional(),
  faxCopyToCaller: _zod.z.boolean().optional(),
  emailCopyToCaller: _zod.z.boolean().optional(),
  excavator: excavatorSchema,
  ticketType: _zod.z.string().optional(),
  workType: _zod.z.string().min(1),
  workOn: _zod.z.string().min(1),
  workState: _zod.z.string().min(1),
  workCounty: _zod.z.string().min(1),
  workPlace: _zod.z.string().min(1),
  workAddress2: _zod.z.string().optional(),
  workStreetAddress: _zod.z.string(),
  workStreetPrefix: _zod.z.string().optional(),
  workStreetName: _zod.z.string().min(1),
  workStreetType: _zod.z.string().optional(),
  workStreetSuffix: _zod.z.string().optional(),
  workIntersection: _zod.z.string().min(1),
  workSite: workSiteSchema,
  remarks: _zod.z.string(),
  drivingDirections: _zod.z.string(),
  markingInstructions: _zod.z.string(),
  isWhitePaint: _zod.z.boolean().optional(),
  isExplosives: _zod.z.boolean().optional(),
  isDirectionalBoring: _zod.z.boolean().optional(),
  isAddressInRemarks: _zod.z.boolean().optional(),
  isGridsCallerSupplied: _zod.z.boolean().optional(),
  itemAttributeValues: _zod.z.array(itemAttributeValueSchema).optional(),
  suspendedCount: _zod.z.number().optional(),
  suspendedCategory: _zod.z.string().optional(),
  source: _zod.z.string().optional()
}).passthrough();
var createRequestSchema = _zod.z.object({
  ticketData: ticketDataSchema,
  temporaryTicketId: _zod.z.string().optional()
});
function buildEligibilityDetails(createdAt, eligibleAt, hoursRemaining) {
  return {
    createdAt: _nullishCoalesce(createdAt, () => ( null)),
    eligibleAt: _nullishCoalesce(eligibleAt, () => ( null)),
    hoursRemaining: _nullishCoalesce(hoursRemaining, () => ( null))
  };
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}
function isTimeoutError(error) {
  return getErrorMessage(error).toLowerCase().includes("timed out");
}
function isUpstreamTexas811Error(error) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("texas 811") || message.includes("ticket creation failed") || message.includes("authentication failed");
}
function createTexas811Routes(config) {
  const server = _chunkGOBA6KQ3cjs.createTexas811Server.call(void 0, {
    email: config.email,
    password: config.password,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    userAgent: config.userAgent
  });
  const { username, verifyAuth } = config;
  async function checkAuth(request) {
    if (verifyAuth) {
      const authorized = await verifyAuth(request);
      if (!authorized) {
        return _server.NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }
    return null;
  }
  return {
    search: {
      async GET(request) {
        const authError = await checkAuth(request);
        if (authError) return authError;
        try {
          const searchParams = request.nextUrl.searchParams;
          const token = await server.getToken();
          const data = await server.searchTickets(token, {
            ticketNumber: searchParams.get("ticketNumber") || void 0,
            startDate: searchParams.get("startDate") || void 0,
            endDate: searchParams.get("endDate") || void 0,
            user: searchParams.get("user") || void 0,
            excavatorName: searchParams.get("excavatorName") || void 0
          });
          return _server.NextResponse.json(data);
        } catch (error) {
          console.error("Texas 811 search error:", error);
          return _server.NextResponse.json(
            {
              error: error instanceof Error ? error.message : "Failed to search tickets"
            },
            { status: 500 }
          );
        }
      }
    },
    tickets: {
      async GET(request) {
        const authError = await checkAuth(request);
        if (authError) return authError;
        try {
          const searchParams = request.nextUrl.searchParams;
          const ticketNumber = searchParams.get("ticketNumber");
          const ticketId = searchParams.get("ticketId");
          if (!ticketNumber && !ticketId) {
            return _server.NextResponse.json(
              { error: "ticketNumber or ticketId is required" },
              { status: 400 }
            );
          }
          const token = await server.getToken();
          let data;
          if (ticketNumber) {
            data = await server.getTicketByNumberHtml(
              token,
              ticketNumber
            );
          } else {
            data = await server.getTicketById(token, ticketId);
          }
          return _server.NextResponse.json(data);
        } catch (error) {
          console.error("Texas 811 get ticket error:", error);
          return _server.NextResponse.json(
            {
              error: error instanceof Error ? error.message : "Failed to get ticket"
            },
            { status: 500 }
          );
        }
      }
    },
    "tickets/create": {
      async POST(request) {
        const authError = await checkAuth(request);
        if (authError) return authError;
        try {
          const parsed = createRequestSchema.safeParse(
            await request.json()
          );
          if (!parsed.success) {
            return _server.NextResponse.json(
              {
                error: _optionalChain([parsed, 'access', _ => _.error, 'access', _2 => _2.issues, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.message]) || "Invalid ticketData payload",
                details: parsed.error.flatten()
              },
              { status: 400 }
            );
          }
          const { ticketData: validatedTicketData, temporaryTicketId } = parsed.data;
          const ticketData = {
            ...validatedTicketData,
            takenBy: username,
            excavator: {
              ...validatedTicketData.excavator,
              callerEmail: username
            }
          };
          const token = await server.getToken();
          const result = await server.createTicketWithSession(
            token,
            ticketData,
            temporaryTicketId
          );
          return _server.NextResponse.json(result);
        } catch (error) {
          console.error(
            "Texas 811 create ticket error:",
            getErrorMessage(error)
          );
          if (isTimeoutError(error)) {
            return _server.NextResponse.json(
              { error: "Texas 811 request timed out" },
              { status: 504 }
            );
          }
          if (isUpstreamTexas811Error(error)) {
            return _server.NextResponse.json(
              { error: "Failed to create ticket" },
              { status: 502 }
            );
          }
          return _server.NextResponse.json(
            { error: "Failed to create ticket" },
            { status: 500 }
          );
        }
      }
    },
    "tickets/update": {
      async POST(request) {
        const authError = await checkAuth(request);
        if (authError) return authError;
        try {
          const body = await request.json();
          const { ticketId, ...updates } = body;
          if (!ticketId) {
            return _server.NextResponse.json(
              { error: "ticketId is required" },
              { status: 400 }
            );
          }
          const token = await server.getToken();
          if (!updates.cancel) {
            const ticket = await server.getTicketById(token, ticketId);
            const eligibility = _chunkLB337HDPcjs.getTexas811TicketEligibility.call(void 0, 
              ticket.creation
            );
            if (!eligibility.canUpdate) {
              const error = eligibility.createdAt ? "Ticket cannot be updated until 72 hours after creation" : "Ticket eligibility unavailable: ticket creation date is missing or invalid";
              return _server.NextResponse.json(
                {
                  error,
                  details: buildEligibilityDetails(
                    eligibility.createdAt,
                    eligibility.eligibleAt,
                    eligibility.hoursRemaining
                  )
                },
                { status: 409 }
              );
            }
          }
          const result = await server.updateTicket(
            token,
            ticketId,
            updates
          );
          return _server.NextResponse.json(result);
        } catch (error) {
          console.error("Texas 811 update ticket error:", error);
          const message = error instanceof Error ? error.message : "Failed to update ticket";
          const status = message.includes("72 hours after creation") || message.includes("eligibility unavailable") ? 409 : 500;
          return _server.NextResponse.json({ error: message }, { status });
        }
      }
    },
    "tickets/no-response": {
      async POST(request) {
        const authError = await checkAuth(request);
        if (authError) return authError;
        try {
          const body = await request.json();
          const { ticketId, vendors } = body;
          if (!ticketId) {
            return _server.NextResponse.json(
              { error: "ticketId is required" },
              { status: 400 }
            );
          }
          if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
            return _server.NextResponse.json(
              {
                error: "vendors array is required and must not be empty"
              },
              { status: 400 }
            );
          }
          const token = await server.getToken();
          const ticket = await server.getTicketById(token, ticketId);
          const eligibility = _chunkLB337HDPcjs.getTexas811TicketEligibility.call(void 0, 
            ticket.creation
          );
          if (!eligibility.canNoResponse) {
            const error = eligibility.createdAt ? "Ticket cannot submit no response until 72 hours after creation" : "Ticket eligibility unavailable: ticket creation date is missing or invalid";
            return _server.NextResponse.json(
              {
                error,
                details: buildEligibilityDetails(
                  eligibility.createdAt,
                  eligibility.eligibleAt,
                  eligibility.hoursRemaining
                )
              },
              { status: 409 }
            );
          }
          const result = await server.submitNoResponse(
            token,
            ticketId,
            vendors
          );
          return _server.NextResponse.json(result);
        } catch (error) {
          console.error("Texas 811 no-response error:", error);
          const message = error instanceof Error ? error.message : "Failed to submit no response";
          const status = message.includes("72 hours after creation") || message.includes("eligibility unavailable") ? 409 : 500;
          return _server.NextResponse.json({ error: message }, { status });
        }
      }
    }
  };
}







exports.TEXAS811_ACTION_LOCK_HOURS = _chunkLB337HDPcjs.TEXAS811_ACTION_LOCK_HOURS; exports.createTexas811Routes = createTexas811Routes; exports.getTexas811TicketEligibility = _chunkLB337HDPcjs.getTexas811TicketEligibility; exports.getUnresponsiveVendors = _chunkLB337HDPcjs.getUnresponsiveVendors; exports.hasVendorResponded = _chunkLB337HDPcjs.hasVendorResponded; exports.isVendorUnresponsive = _chunkLB337HDPcjs.isVendorUnresponsive;
