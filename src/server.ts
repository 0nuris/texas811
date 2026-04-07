// Texas 811 server-side helpers (Node.js only)

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

import type {
  Texas811SearchParams,
  Texas811SearchResponse,
  Texas811TicketHtmlData,
  Texas811TicketResponse,
  Texas811TicketUpdateParams,
  Texas811UpdateResponse,
  Texas811NoResponseVendor,
  Texas811NoResponseResponse,
  Texas811CreateTicketData,
  Texas811CreateResponse,
} from "./types";

// Re-export types and utils for convenience
export * from "./types";
export {
  getTexas811TicketEligibility,
  getUnresponsiveVendors,
  isVendorUnresponsive,
  hasVendorResponded,
  TEXAS811_ACTION_LOCK_HOURS,
} from "./utils";

// === Protocol Constants ===

export const UPDATE_ONLY_FLAG = "$!UPD8T$ONLY!$";
export const CANCEL_FLAG = "CAN$CAN$";
export const NO_RESPONSE_PREFIX = "NR$";
export const NO_RESPONSE_SUFFIX = "$NR";

// === Configuration ===

export interface Texas811Config {
  /** Texas 811 base URL (default: "https://txgc.texas811.org") */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Service account email — REQUIRED */
  email: string;
  /** Service account password — REQUIRED */
  password: string;
  /** User-Agent string (default: "Texas811Client/1.0") */
  userAgent?: string;
}

// === Factory Memoization ===

const instanceCache = new Map<string, Texas811Server>();

function configKey(config: Texas811Config): string {
  return `${config.baseUrl ?? ""}|${config.email}|${config.userAgent ?? ""}`;
}

// === Factory ===

export function createTexas811Server(config: Texas811Config): Texas811Server {
  if (!config.email || !config.password) {
    throw new Error(
      "Texas811Config requires email and password"
    );
  }

  const key = configKey(config);
  const cached = instanceCache.get(key);
  if (cached) return cached;

  if (instanceCache.size > 0 && typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(
      "[texas811] Multiple createTexas811Server instances detected. " +
        "Token caches are per-instance. Share a single instance to avoid redundant auth requests."
    );
  }

  const baseUrl = config.baseUrl ?? "https://txgc.texas811.org";
  const timeoutMs = config.timeoutMs ?? 30000;
  const userAgent = config.userAgent ?? "Texas811Client/1.0";

  const sessionHeaders = {
    "User-Agent": userAgent,
    Accept: "application/json, text/plain, */*",
    Referer: `${baseUrl}/ui/ticket/add`,
    Origin: baseUrl,
  };

  // === Token Management (scoped to this instance) ===

  interface CachedToken {
    token: string;
    expiresAt: number;
  }

  let cachedToken: CachedToken | null = null;
  let tokenPromise: Promise<string> | null = null;
  const TOKEN_TTL_MS = 55 * 60 * 1000;

  function createTimeoutError(context: string): Error {
    return new Error(`Texas 811 request timed out during ${context}`);
  }

  async function fetchWithTimeout(
    input: string,
    init: RequestInit,
    context: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw createTimeoutError(context);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function normalizeSessionError(error: unknown, context: string): Error {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        return createTimeoutError(context);
      }
      const status = error.response?.status;
      if (status) {
        return new Error(
          `Texas 811 request failed during ${context} with status ${status}`
        );
      }
      return new Error(`Texas 811 request failed during ${context}`);
    }
    return error instanceof Error
      ? error
      : new Error(`Texas 811 request failed during ${context}`);
  }

  async function runSessionStep<T>(
    context: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw normalizeSessionError(error, context);
    }
  }

  async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token;
    }

    if (tokenPromise) {
      return tokenPromise;
    }

    tokenPromise = (async () => {
      const response = await fetchWithTimeout(
        `${baseUrl}/api/account/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: config.email,
            password: config.password,
          }),
        },
        "/api/account/token"
      );

      if (!response.ok) {
        console.error("Texas 811 auth failed:", response.status);
        throw new Error("Texas 811 authentication failed");
      }

      const data = await response.json();
      cachedToken = {
        token: data.token,
        expiresAt: Date.now() + TOKEN_TTL_MS,
      };
      return data.token;
    })();

    try {
      return await tokenPromise;
    } finally {
      tokenPromise = null;
    }
  }

  function clearToken(): void {
    cachedToken = null;
    tokenPromise = null;
  }

  // === XML Helpers ===

  function escapeXml(str: string): string {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function buildUpdateXml(updates: Texas811TicketUpdateParams): string {
    const {
      comment,
      contactName,
      contactPhone,
      contactEmail,
      contactCallback,
      updateOnly,
      cancel,
    } = updates;

    let finalComment = comment || "";
    if (cancel) {
      finalComment = CANCEL_FLAG;
    } else if (updateOnly && !comment) {
      finalComment = UPDATE_ONLY_FLAG;
    }

    const ticketTypeElement = cancel
      ? "<requestedTicketType>Cancellation</requestedTicketType>"
      : "";

    return `<ticketUpdateRequest xmlns="http://schemas.progressivepartnering.com/geocall/v3/1/types/app">
            <comment>${escapeXml(finalComment)}</comment>
            <contactName>${escapeXml(contactName || "")}</contactName>
            <contactPhone>${escapeXml(contactPhone || "")}</contactPhone>
            <contactEmail>${escapeXml(contactEmail || "")}</contactEmail>
            <contactCallback>${escapeXml(contactCallback || "")}</contactCallback>${ticketTypeElement}</ticketUpdateRequest>`;
  }

  function buildNoResponseComment(
    vendors: Texas811NoResponseVendor[]
  ): string {
    const vendorEntries = vendors.map((vendor) => {
      const isResponseOverdue =
        vendor.lastAction && vendor.lastAction.name === "Response Overdue";

      const lastPRItems: Array<{
        facilities: string[];
        lastAction: string;
      }> = [];
      if (vendor.facilities || isResponseOverdue) {
        lastPRItems.push({
          facilities: vendor.facilities || [],
          lastAction: isResponseOverdue ? "Response Overdue" : "",
        });
      }

      return {
        code: vendor.code,
        name: vendor.name,
        selected: true,
        lastPRItems: lastPRItems,
        reason: isResponseOverdue
          ? "Response Overdue"
          : vendor.reason || "",
      };
    });

    const jsonString = JSON.stringify(vendorEntries);
    return `${NO_RESPONSE_PREFIX}${jsonString}${NO_RESPONSE_SUFFIX}`;
  }

  function buildNoResponseXml(vendors: Texas811NoResponseVendor[]): string {
    const comment = buildNoResponseComment(vendors);

    return `<ticketUpdateRequest xmlns="http://schemas.progressivepartnering.com/geocall/v3/1/types/app">
            <comment>${escapeXml(comment)}</comment>
            <contactName></contactName>
            <contactPhone></contactPhone>
            <contactEmail></contactEmail>
            <contactCallback></contactCallback><requestedTicketType>No Response</requestedTicketType></ticketUpdateRequest>`;
  }

  function buildTicketXml(ticketData: Texas811CreateTicketData): string {
    const exc = ticketData.excavator || ({} as Record<string, string>);
    const ws = ticketData.workSite || ({} as Record<string, string>);

    let itemAttributeXml = "";
    if (
      ticketData.itemAttributeValues &&
      ticketData.itemAttributeValues.length > 0
    ) {
      const entries = ticketData.itemAttributeValues
        .map((attr) => {
          const ia = attr.itemAttribute || {};
          return `<itemAttributeValue><itemId>${escapeXml(String(ia.id || attr.itemId || ""))}</itemId><itemAttribute>
                <id>${escapeXml(String(ia.id || ""))}</id>
                <itemTypeId>${escapeXml(String(ia.itemTypeId || "1"))}</itemTypeId>
                <name>${escapeXml(ia.name || "")}</name>
                <display>${escapeXml(ia.display || "")}</display>
                <dataType>${escapeXml(ia.dataType || "text")}</dataType>
                <validationRegex>${escapeXml(ia.validationRegex || "null")}</validationRegex>
                <isUpdatable>${ia.isUpdatable === true ? "true" : "false"}</isUpdatable>
                <creation>${escapeXml(ia.creation || "")}</creation>
                <isActive>${ia.isActive === true ? "true" : "false"}</isActive>
                </itemAttribute><value>${escapeXml(attr.value || "")}</value>
            </itemAttributeValue>`;
        })
        .join("");
      itemAttributeXml = `<itemAttributeValues>${entries}</itemAttributeValues>`;
    }

    return `<ticket xmlns="http://schemas.progressivepartnering.com/geocall/v3/1/types/app">
        <suspendedCount>${escapeXml(String(ticketData.suspendedCount ?? 0))}</suspendedCount>
        <suspendedCategory>${escapeXml(ticketData.suspendedCategory || "Portal Ticket Center")}</suspendedCategory>
        <source>${escapeXml(ticketData.source || "Portal Ticket")}</source>
        <started>${escapeXml(ticketData.started || "")}</started>
        <takenBy>${escapeXml(ticketData.takenBy || "")}</takenBy>
        <hoursNotice>${escapeXml(String(ticketData.hoursNotice ?? 48))}</hoursNotice>
        <compliance>${escapeXml(String(ticketData.compliance ?? 0))}</compliance>
        <workDoneFor>${escapeXml(ticketData.workDoneFor || "")}</workDoneFor>
        <extent>${escapeXml(ticketData.extent || "30 days")}</extent>
        <faxCopyToCaller>${ticketData.faxCopyToCaller === true ? "true" : "false"}</faxCopyToCaller>
        <emailCopyToCaller>${ticketData.emailCopyToCaller === false ? "false" : "true"}</emailCopyToCaller>
        <excavator id="undefined" type="Excavator">
        <phone>${escapeXml(exc.phone || "")}</phone>
        <name>${escapeXml(exc.name || "")}</name>
        <address>${escapeXml(exc.address || "")}</address>
        <city>${escapeXml(exc.city || "")}</city>
        <state>${escapeXml(exc.state || "")}</state>
        <zip>${escapeXml(exc.zip || "")}</zip>
        <fax>${escapeXml(exc.fax || "")}</fax>
        <caller>${escapeXml(exc.caller || "")}</caller>
        <callerPhone>${escapeXml(exc.callerPhone || "")}</callerPhone>
        <callerPhoneExtension>${escapeXml(exc.callerPhoneExtension || "")}</callerPhoneExtension>
        <callerEmail>${escapeXml(exc.callerEmail || "")}</callerEmail>
        <contact>${escapeXml(exc.contact || "")}</contact>
        <contactPhone>${escapeXml(exc.contactPhone || "")}</contactPhone>
        <contactPhoneExtension>${escapeXml(exc.contactPhoneExtension || "")}</contactPhoneExtension>
        <contactEmail>${escapeXml(exc.contactEmail || "")}</contactEmail>
        <callback>${escapeXml(exc.callback || "")}</callback>
        </excavator>
        <ticketType>${escapeXml(ticketData.ticketType || "Normal")}</ticketType>
        <workType>${escapeXml(ticketData.workType || "")}</workType>
        <workOn>${escapeXml(ticketData.workOn || "")}</workOn>
        <workState>${escapeXml(ticketData.workState || "")}</workState>
        <workCounty>${escapeXml(ticketData.workCounty || "")}</workCounty>
        <workPlace>${escapeXml(ticketData.workPlace || "")}</workPlace>
        <workAddress2>${escapeXml(ticketData.workAddress2 || "")}</workAddress2>
        <workStreetAddress>${escapeXml(ticketData.workStreetAddress || "")}</workStreetAddress>
        <workStreetPrefix>${escapeXml(ticketData.workStreetPrefix || "")}</workStreetPrefix>
        <workStreetName>${escapeXml(ticketData.workStreetName || "")}</workStreetName>
        <workStreetType>${escapeXml(ticketData.workStreetType || "")}</workStreetType>
        <workStreetSuffix>${escapeXml(ticketData.workStreetSuffix || "")}</workStreetSuffix>
        <workIntersection>${escapeXml(ticketData.workIntersection || "")}</workIntersection>
        <workSite>
        <callerSuppliedPoints>${escapeXml(String(ws.callerSuppliedPoints ?? "undefined"))}</callerSuppliedPoints>
        <latitude>${escapeXml(String(ws.latitude || ""))}</latitude>
        <longitude>${escapeXml(String(ws.longitude || ""))}</longitude>
        <secondaryLatitude>${escapeXml(String(ws.secondaryLatitude || ""))}</secondaryLatitude>
        <secondaryLongitude>${escapeXml(String(ws.secondaryLongitude || ""))}</secondaryLongitude>
        <viewAreaExtent>${escapeXml(ws.viewAreaExtent || "")}</viewAreaExtent>
        <workAreaExtent>${escapeXml(ws.workAreaExtent || "")}</workAreaExtent>
        <workArea>${escapeXml(ws.workArea || "")}</workArea>
        <workAreaBuffer>${escapeXml(ws.workAreaBuffer || "")}</workAreaBuffer>
        </workSite><remarks>${escapeXml(ticketData.remarks || "")}</remarks>
        <drivingDirections>${escapeXml(ticketData.drivingDirections || "")}</drivingDirections>
        <markingInstructions>${escapeXml(ticketData.markingInstructions || "")}</markingInstructions>
        <isWhitePaint>${ticketData.isWhitePaint === true ? "true" : "false"}</isWhitePaint>
        <isExplosives>${ticketData.isExplosives === true ? "true" : "false"}</isExplosives>
        <isDirectionalBoring>${ticketData.isDirectionalBoring === true ? "true" : "false"}</isDirectionalBoring>
        <isAddressInRemarks>${ticketData.isAddressInRemarks === true ? "true" : "false"}</isAddressInRemarks><isGridsCallerSupplied>${ticketData.isGridsCallerSupplied === true ? "true" : "false"}</isGridsCallerSupplied>${itemAttributeXml}
                  </ticket>`;
  }

  // === Response Parsers ===

  function parseUpdateResponse(xml: string): Texas811UpdateResponse {
    const newTicketMatch =
      xml.match(/<newTicketNumber>([^<]*)<\/newTicketNumber>/i) ||
      xml.match(/<NewTicketNumber>([^<]*)<\/NewTicketNumber>/i);
    const oldTicketMatch =
      xml.match(/<oldTicketNumber>([^<]*)<\/oldTicketNumber>/i) ||
      xml.match(/<OldTicketNumber>([^<]*)<\/OldTicketNumber>/i);
    const ticketNumberMatch =
      xml.match(/<ticketNumber>([^<]*)<\/ticketNumber>/i) ||
      xml.match(/<TicketNumber>([^<]*)<\/TicketNumber>/i);

    return {
      newTicketNumber:
        newTicketMatch?.[1] || ticketNumberMatch?.[1] || null,
      oldTicketNumber: oldTicketMatch?.[1] || null,
      isOutdatedTicket: false,
      rawResponse: xml,
    };
  }

  function parseCreateResponse(xml: string): Texas811CreateResponse {
    const ticketIdMatch =
      xml.match(/<ticket\s+id="([^"]*)"/) ||
      xml.match(/<ticket[^>]+id="([^"]*)"/i);
    const ticketNumberMatch = xml.match(/<number>([^<]*)<\/number>/i);

    return {
      ticketId: ticketIdMatch?.[1] || null,
      ticketNumber: ticketNumberMatch?.[1] || null,
      rawResponse: xml,
    };
  }

  function parseTicketHtml(html: string): Texas811TicketHtmlData {
    const jsonMatch = html.match(
      /<script[^>]*name="ticket-data"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    );

    if (jsonMatch && jsonMatch[1]) {
      try {
        const ticketData = JSON.parse(jsonMatch[1].trim());
        if (Array.isArray(ticketData) && ticketData.length > 0) {
          return ticketData[0];
        }
      } catch (e) {
        console.error("Failed to parse ticket JSON:", e);
      }
    }

    return { _parseError: true, _rawHtmlLength: html.length };
  }

  function generateTemporaryTicketId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let result = "";
    for (let i = 0; i < 16; i++) {
      const digit = bytes[i] % 10;
      result += i === 0 && digit === 0 ? "1" : String(digit);
    }
    return result;
  }

  // === Session Flow Helpers ===

  interface BeginData {
    startedOn: string;
    saversion: string;
    baseversion: string;
    workOn: string;
  }

  function parseBeginResponse(xml: string): BeginData {
    const startedOn =
      xml.match(/<startedOn>([^<]+)<\/startedOn>/i)?.[1] ?? "";
    const saversion = xml.match(/<sa>([^<]+)<\/sa>/i)?.[1] ?? "";
    const baseversion = xml.match(/<base>([^<]+)<\/base>/i)?.[1] ?? "";

    const workOnMatch = xml.match(
      /<calculatedDate>\s*<key>normal-WorkOn<\/key>\s*<value>([^<]+)<\/value>\s*<\/calculatedDate>/i
    );
    const workOn = workOnMatch?.[1] ?? "";

    return { startedOn, saversion, baseversion, workOn };
  }

  // === Retry Helper ===

  async function fetchWithRetry(
    url: string,
    options: RequestInit,
    token: string
  ): Promise<Response> {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      },
      url
    );

    if (response.status === 401) {
      clearToken();
      const freshToken = await getToken();
      return fetchWithTimeout(
        url,
        {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${freshToken}`,
          },
        },
        url
      );
    }

    return response;
  }

  // === Public API ===

  async function createTicketWithSession(
    token: string,
    ticketData: Texas811CreateTicketData,
    temporaryTicketId?: string
  ): Promise<Texas811CreateResponse> {
    const jar = new CookieJar();
    const session = wrapper(
      axios.create({
        baseURL: baseUrl,
        jar,
        withCredentials: true,
        timeout: timeoutMs,
        headers: {
          ...sessionHeaders,
          Authorization: `Bearer ${token}`,
        },
      })
    );

    // Step 1: establish session cookies
    await runSessionStep("/ui/ticket/add", () =>
      session.get("/ui/ticket/add")
    );

    // Step 2: begin — get startedOn and GIS versions
    const beginResp = await runSessionStep("/begin", () =>
      session.get<string>(
        "/api/v3/app/ticket/portal/begin?format=xml",
        { headers: { Accept: "application/xml" } }
      )
    );
    const beginData = parseBeginResponse(beginResp.data);

    if (!beginData.startedOn) {
      throw new Error("Texas 811 /begin response missing startedOn");
    }

    // Step 3: workon — get server-computed compliant workOn, hoursNotice, compliance
    const workonResp = await runSessionStep("/workon", () =>
      session.get<Record<string, unknown>>(
        "/api/v3/app/ticket/portal/workon"
      )
    );
    const workonData = workonResp.data;

    // Step 4: buffer — send raw workArea WKT, get buffered polygon WKT
    const bufferResp = await runSessionStep("/buffer", () =>
      session.post<string>(
        "/api/v3/gis/features/tx/buffer?distance=150",
        ticketData.workSite.workArea,
        {
          headers: {
            "Content-Type": "text/plain",
            Accept: "text/plain",
          },
        }
      )
    );
    const bufferedWkt = bufferResp.data;

    // Step 5: incounty — validate polygon is within TX 811 service area
    const incountyResp = await runSessionStep("/incounty", () =>
      session.post(
        `/api/v3/gis/features/tx/incounty?geometry=false&wkt=zdataz&buffer=-1&baseversion=${beginData.baseversion}&saversion=${beginData.saversion}`,
        bufferedWkt,
        {
          headers: { "Content-Type": "text/plain" },
          validateStatus: () => true,
        }
      )
    );
    if (incountyResp.status < 200 || incountyResp.status >= 300) {
      throw new Error(
        `Texas 811 request failed during /incounty with status ${incountyResp.status}`
      );
    }

    // Override server-derived fields before building XML
    ticketData.started = beginData.startedOn;
    ticketData.workSite.workAreaBuffer = "";

    if (workonData) {
      const wOn = (workonData["normal-WorkOn"] ??
        workonData.workOn) as string | undefined;
      if (wOn) ticketData.workOn = wOn;

      const hNotice =
        workonData["normal-HoursNotice"] ?? workonData.hoursNotice;
      if (hNotice != null) ticketData.hoursNotice = Number(hNotice);

      const comp =
        workonData["normal-Compliance"] ?? workonData.compliance;
      if (comp != null) ticketData.compliance = String(comp);
    }

    // Step 6: submit ticket
    const tempId = temporaryTicketId || generateTemporaryTicketId();
    const url = `/api/v3/app/ticket/portal/suspended?suspendedid=0&hasassignment=true&temporaryticketid=${tempId}&ticketStatus=5&format=xml`;
    const xmlPayload = buildTicketXml(ticketData);

    const submitResp = await runSessionStep("ticket submission", () =>
      session.post<string>(url, xmlPayload, {
        headers: {
          "Content-Type": "text/plain",
          Accept: "application/xml",
        },
        validateStatus: () => true,
      })
    );

    if (submitResp.status < 200 || submitResp.status >= 300) {
      throw new Error(
        `Ticket creation failed with status ${submitResp.status}`
      );
    }

    return parseCreateResponse(String(submitResp.data));
  }

  async function searchTickets(
    token: string,
    options: Texas811SearchParams = {}
  ): Promise<Texas811SearchResponse> {
    const params = new URLSearchParams();
    if (options.ticketNumber)
      params.append("ticketNumber", options.ticketNumber);
    if (options.startDate) params.append("creation_1", options.startDate);
    if (options.endDate) params.append("creation_2", options.endDate);
    if (options.user) params.append("user", options.user);
    if (options.excavatorName) {
      params.append("excavatorName", options.excavatorName);
    }
    params.append("format", "json");

    const url = `${baseUrl}/api/v3/ui/searches/39-ticket-advanced-rep/execute?${params.toString()}`;

    const response = await fetchWithRetry(
      url,
      { method: "GET", headers: { Accept: "application/json" } },
      token
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Search failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  async function getTicketByNumberHtml(
    token: string,
    ticketNumber: string
  ): Promise<Texas811TicketHtmlData> {
    const url = `${baseUrl}/detail/ticket?numbers=${ticketNumber}&pr=false&sas=false`;

    const response = await fetchWithRetry(
      url,
      { method: "GET", headers: { Accept: "text/html" } },
      token
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Get ticket failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
      );
    }

    const html = await response.text();
    return parseTicketHtml(html);
  }

  async function getTicketById(
    token: string,
    ticketId: string
  ): Promise<Texas811TicketResponse> {
    const url = `${baseUrl}/api/v3/app/ticket/${ticketId}?format=json`;

    const response = await fetchWithRetry(
      url,
      { method: "GET", headers: { Accept: "application/json" } },
      token
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Get ticket by ID failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`
      );
    }

    return response.json();
  }

  async function updateTicket(
    token: string,
    ticketId: string,
    updates: Texas811TicketUpdateParams = {}
  ): Promise<Texas811UpdateResponse> {
    const url = `${baseUrl}/api/v3/app/ticket/${ticketId}/update?format=xml`;
    const xmlPayload = buildUpdateXml(updates);

    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/xml",
        },
        body: xmlPayload,
      },
      token
    );

    const responseText = await response.text();

    if (response.status === 300) {
      return {
        newTicketNumber: null,
        oldTicketNumber: null,
        latestTicketId: responseText.trim(),
        isOutdatedTicket: true,
        rawResponse: responseText,
      };
    }

    if (response.status === 409) {
      throw new Error(
        "Ticket cannot be updated until 72 hours after creation"
      );
    }

    if (!response.ok) {
      throw new Error(
        `Update failed: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`
      );
    }

    return parseUpdateResponse(responseText);
  }

  async function submitNoResponse(
    token: string,
    ticketId: string,
    vendors: Texas811NoResponseVendor[]
  ): Promise<Texas811NoResponseResponse> {
    if (!vendors || vendors.length === 0) {
      throw new Error("No vendors provided for No Response update");
    }

    const url = `${baseUrl}/api/v3/app/ticket/${ticketId}/update?format=xml`;
    const xmlPayload = buildNoResponseXml(vendors);

    const response = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/xml",
        },
        body: xmlPayload,
      },
      token
    );

    const responseText = await response.text();

    if (response.status === 300) {
      return {
        newTicketNumber: null,
        oldTicketNumber: null,
        latestTicketId: responseText.trim(),
        isOutdatedTicket: true,
        vendorCount: vendors.length,
        rawResponse: responseText,
      };
    }

    if (response.status === 409) {
      throw new Error(
        "Ticket cannot be updated until 72 hours after creation"
      );
    }

    if (!response.ok) {
      throw new Error(
        `No Response update failed: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`
      );
    }

    const result = parseUpdateResponse(responseText);
    return { ...result, vendorCount: vendors.length };
  }

  const instance: Texas811Server = {
    getToken,
    clearToken,
    searchTickets,
    getTicketByNumberHtml,
    getTicketById,
    updateTicket,
    submitNoResponse,
    createTicketWithSession,
  };

  instanceCache.set(key, instance);
  return instance;
}

export interface Texas811Server {
  getToken(): Promise<string>;
  clearToken(): void;
  searchTickets(
    token: string,
    options?: Texas811SearchParams
  ): Promise<Texas811SearchResponse>;
  getTicketByNumberHtml(
    token: string,
    ticketNumber: string
  ): Promise<Texas811TicketHtmlData>;
  getTicketById(
    token: string,
    ticketId: string
  ): Promise<Texas811TicketResponse>;
  updateTicket(
    token: string,
    ticketId: string,
    updates?: Texas811TicketUpdateParams
  ): Promise<Texas811UpdateResponse>;
  submitNoResponse(
    token: string,
    ticketId: string,
    vendors: Texas811NoResponseVendor[]
  ): Promise<Texas811NoResponseResponse>;
  createTicketWithSession(
    token: string,
    ticketData: Texas811CreateTicketData,
    temporaryTicketId?: string
  ): Promise<Texas811CreateResponse>;
}
