import { createTexas811Client } from "../client";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

function errorResponse(error: string, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve({ error }),
  });
}

describe("createTexas811Client", () => {
  const client = createTexas811Client({ baseUrl: "http://test.com/api" });

  describe("searchTickets", () => {
    it("calls the search endpoint with query params", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse([{ id: 1 }]));

      const result = await client.searchTickets({
        ticketNumber: "123",
      });

      expect(result.ok).toBe(true);
      expect(result.data).toEqual([{ id: 1 }]);

      const url = new URL(mockFetch.mock.calls[0][0]);
      expect(url.pathname).toBe("/api/texas811/search");
      expect(url.searchParams.get("ticketNumber")).toBe("123");
    });
  });

  describe("getTicketById", () => {
    it("calls the tickets endpoint with ticketId param", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ id: 42, number: "T-001" })
      );

      const result = await client.getTicketById("42");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ id: 42, number: "T-001" });
    });
  });

  describe("updateTicket", () => {
    it("posts to the update endpoint", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({
          newTicketNumber: "T-002",
          oldTicketNumber: "T-001",
          isOutdatedTicket: false,
        })
      );

      const result = await client.updateTicket("42", {
        comment: "test",
      });

      expect(result.ok).toBe(true);
      expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    });
  });

  describe("error handling", () => {
    it("returns error response for non-ok status", async () => {
      mockFetch.mockReturnValueOnce(
        errorResponse("Not found", 404)
      );

      const result = await client.getTicketById("999");

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error?.message).toBe("Not found");
    });

    it("handles fetch failures gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.searchTickets();

      expect(result.ok).toBe(false);
      expect(result.error?.message).toBe("Network error");
    });
  });
});
