jest.mock("axios-cookiejar-support", () => ({ wrapper: (c: unknown) => c }));
jest.mock("tough-cookie", () => ({ CookieJar: class {} }));

import {
  createTexas811Server,
  parseTicketHistory,
  findCurrentTicket,
} from "../server";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function textResponse(text: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  });
}

// Two-ticket chain. Each ticket has a nested <responses> block whose vendor
// responses carry their OWN <creation> (and number-like fields) — the parser
// must read the ticket-level values, not those.
const CHAIN_XML = `<tickets xmlns="http://schemas.progressivepartnering.com/geocall/v3/1/types/app">
  <ticket id="51193547">
    <number>2665011593</number>
    <oldNumber/>
    <creation>2026-05-30T12:10:30.340</creation>
    <responses>
      <response><creation>2026-05-31T00:00:00</creation><number>999</number></response>
    </responses>
  </ticket>
  <ticket id="51447067">
    <number>2666768251</number>
    <oldNumber>2665011593</oldNumber>
    <creation>2026-06-16T22:09:27.333</creation>
    <responses>
      <response><creation>2026-06-17T00:00:00</creation></response>
    </responses>
  </ticket>
</tickets>`;

describe("parseTicketHistory", () => {
  it("extracts each ticket's own number/oldNumber/creation (ignoring nested responses)", () => {
    const chain = parseTicketHistory(CHAIN_XML);
    expect(chain).toEqual([
      { ticketId: "51193547", ticketNumber: "2665011593", oldNumber: null, creation: "2026-05-30T12:10:30.340" },
      { ticketId: "51447067", ticketNumber: "2666768251", oldNumber: "2665011593", creation: "2026-06-16T22:09:27.333" },
    ]);
  });

  it("returns [] for an empty bundle", () => {
    expect(parseTicketHistory('<tickets xmlns="x" />')).toEqual([]);
  });
});

describe("findCurrentTicket", () => {
  it("returns the tip (the number no other entry supersedes), order-independent", () => {
    const chain = parseTicketHistory(CHAIN_XML);
    expect(findCurrentTicket(chain)?.ticketId).toBe("51447067");
    // Reversed input still resolves the same tip.
    expect(findCurrentTicket([...chain].reverse())?.ticketId).toBe("51447067");
  });

  it("returns the only entry for a single-ticket chain", () => {
    const chain = [{ ticketId: "1", ticketNumber: "A", oldNumber: null, creation: "2026-01-01" }];
    expect(findCurrentTicket(chain)?.ticketId).toBe("1");
  });

  it("returns null for an empty chain", () => {
    expect(findCurrentTicket([])).toBeNull();
  });
});

describe("getTicketHistory", () => {
  const server = createTexas811Server({ email: "e@x.com", password: "p" });

  it("calls the history endpoint and resolves the current ticket from any chain member", async () => {
    mockFetch.mockReturnValueOnce(textResponse(CHAIN_XML));
    const result = await server.getTicketHistory("tok", "51193547");

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/v3/app/ticket/51193547/history?format=json");
    expect((init as RequestInit).method).toBe("GET");
    expect(result.requestedTicketId).toBe("51193547");
    expect(result.chain).toHaveLength(2);
    expect(result.current?.ticketId).toBe("51447067");
    expect(result.current?.ticketNumber).toBe("2666768251");
  });

  it("throws with context when the endpoint errors", async () => {
    mockFetch.mockReturnValueOnce(textResponse("nope", 500));
    await expect(server.getTicketHistory("tok", "1")).rejects.toThrow(/Get ticket history failed: 500/);
  });
});
