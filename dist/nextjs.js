import {
  createTexas811Server
} from "./chunk-MDZKOS3W.js";
import {
  TEXAS811_ACTION_LOCK_HOURS,
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  hasVendorResponded,
  isVendorUnresponsive
} from "./chunk-MJMAOZHR.js";

// src/nextjs.ts
import { NextResponse } from "next/server";
import { z } from "zod";
var itemAttributeSchema = z.object({
  id: z.string().optional(),
  itemTypeId: z.string().optional(),
  name: z.string().optional(),
  display: z.string().optional(),
  dataType: z.string().optional(),
  validationRegex: z.string().optional(),
  isUpdatable: z.boolean().optional(),
  creation: z.string().optional(),
  isActive: z.boolean().optional()
}).passthrough();
var itemAttributeValueSchema = z.object({
  itemId: z.string().optional(),
  itemAttribute: itemAttributeSchema.optional(),
  value: z.string().optional()
}).passthrough();
var excavatorSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  fax: z.string().optional(),
  caller: z.string().min(1),
  callerPhone: z.string().min(1),
  callerPhoneExtension: z.string().optional(),
  callerEmail: z.string().optional(),
  contact: z.string().min(1),
  contactPhone: z.string().min(1),
  contactPhoneExtension: z.string().optional(),
  contactEmail: z.string().min(1),
  callback: z.string().min(1)
}).passthrough();
var workSiteSchema = z.object({
  callerSuppliedPoints: z.string().optional(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  secondaryLatitude: z.number().gte(-90).lte(90),
  secondaryLongitude: z.number().gte(-180).lte(180),
  viewAreaExtent: z.string().min(1),
  workAreaExtent: z.string().min(1),
  workArea: z.string().min(1),
  workAreaBuffer: z.string()
}).passthrough();
var ticketDataSchema = z.object({
  started: z.string().min(1),
  takenBy: z.string().optional(),
  hoursNotice: z.number().optional(),
  compliance: z.string().optional(),
  workDoneFor: z.string(),
  extent: z.string().optional(),
  faxCopyToCaller: z.boolean().optional(),
  emailCopyToCaller: z.boolean().optional(),
  excavator: excavatorSchema,
  ticketType: z.string().optional(),
  workType: z.string().min(1),
  workOn: z.string().min(1),
  workState: z.string().min(1),
  workCounty: z.string().min(1),
  workPlace: z.string().min(1),
  workAddress2: z.string().optional(),
  workStreetAddress: z.string(),
  workStreetPrefix: z.string().optional(),
  workStreetName: z.string().min(1),
  workStreetType: z.string().optional(),
  workStreetSuffix: z.string().optional(),
  workIntersection: z.string().min(1),
  workSite: workSiteSchema,
  remarks: z.string(),
  drivingDirections: z.string(),
  markingInstructions: z.string(),
  isWhitePaint: z.boolean().optional(),
  isExplosives: z.boolean().optional(),
  isDirectionalBoring: z.boolean().optional(),
  isAddressInRemarks: z.boolean().optional(),
  isGridsCallerSupplied: z.boolean().optional(),
  itemAttributeValues: z.array(itemAttributeValueSchema).optional(),
  suspendedCount: z.number().optional(),
  suspendedCategory: z.string().optional(),
  source: z.string().optional()
}).passthrough();
var createRequestSchema = z.object({
  ticketData: ticketDataSchema,
  temporaryTicketId: z.string().optional()
});
function buildEligibilityDetails(createdAt, eligibleAt, hoursRemaining) {
  return {
    createdAt: createdAt ?? null,
    eligibleAt: eligibleAt ?? null,
    hoursRemaining: hoursRemaining ?? null
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
  const server = createTexas811Server({
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
        return NextResponse.json(
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
          return NextResponse.json(data);
        } catch (error) {
          console.error("Texas 811 search error:", error);
          return NextResponse.json(
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
            return NextResponse.json(
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
          return NextResponse.json(data);
        } catch (error) {
          console.error("Texas 811 get ticket error:", error);
          return NextResponse.json(
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
            return NextResponse.json(
              {
                error: parsed.error.issues[0]?.message || "Invalid ticketData payload",
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
          return NextResponse.json(result);
        } catch (error) {
          console.error(
            "Texas 811 create ticket error:",
            getErrorMessage(error)
          );
          if (isTimeoutError(error)) {
            return NextResponse.json(
              { error: "Texas 811 request timed out" },
              { status: 504 }
            );
          }
          if (isUpstreamTexas811Error(error)) {
            return NextResponse.json(
              { error: "Failed to create ticket" },
              { status: 502 }
            );
          }
          return NextResponse.json(
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
            return NextResponse.json(
              { error: "ticketId is required" },
              { status: 400 }
            );
          }
          const token = await server.getToken();
          if (!updates.cancel) {
            const ticket = await server.getTicketById(token, ticketId);
            const eligibility = getTexas811TicketEligibility(
              ticket.creation
            );
            if (!eligibility.canUpdate) {
              const error = eligibility.createdAt ? "Ticket cannot be updated until 72 hours after creation" : "Ticket eligibility unavailable: ticket creation date is missing or invalid";
              return NextResponse.json(
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
          return NextResponse.json(result);
        } catch (error) {
          console.error("Texas 811 update ticket error:", error);
          const message = error instanceof Error ? error.message : "Failed to update ticket";
          const status = message.includes("72 hours after creation") || message.includes("eligibility unavailable") ? 409 : 500;
          return NextResponse.json({ error: message }, { status });
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
            return NextResponse.json(
              { error: "ticketId is required" },
              { status: 400 }
            );
          }
          if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
            return NextResponse.json(
              {
                error: "vendors array is required and must not be empty"
              },
              { status: 400 }
            );
          }
          const token = await server.getToken();
          const ticket = await server.getTicketById(token, ticketId);
          const eligibility = getTexas811TicketEligibility(
            ticket.creation
          );
          if (!eligibility.canNoResponse) {
            const error = eligibility.createdAt ? "Ticket cannot submit no response until 72 hours after creation" : "Ticket eligibility unavailable: ticket creation date is missing or invalid";
            return NextResponse.json(
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
          return NextResponse.json(result);
        } catch (error) {
          console.error("Texas 811 no-response error:", error);
          const message = error instanceof Error ? error.message : "Failed to submit no response";
          const status = message.includes("72 hours after creation") || message.includes("eligibility unavailable") ? 409 : 500;
          return NextResponse.json({ error: message }, { status });
        }
      }
    }
  };
}
export {
  TEXAS811_ACTION_LOCK_HOURS,
  createTexas811Routes,
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  hasVendorResponded,
  isVendorUnresponsive
};
