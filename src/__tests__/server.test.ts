jest.mock("axios-cookiejar-support", () => ({ wrapper: (c: unknown) => c }));
jest.mock("tough-cookie", () => ({ CookieJar: class {} }));

import { createTexas811Server } from "../server";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(""),
  });
}

describe("createTexas811Server reference lists", () => {
  const server = createTexas811Server({ email: "e@x.com", password: "p" });

  describe("getWorkTypes", () => {
    it("returns the workTypes array from the response", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ workTypes: ["Air Excavation", "Directional Bore"] }));
      const result = await server.getWorkTypes("tok");
      expect(result).toEqual(["Air Excavation", "Directional Bore"]);
      const [url] = mockFetch.mock.calls[0];
      expect(String(url)).toContain("/api/ticket/worktype/isPortal");
    });
    it("returns [] when workTypes is missing", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({}));
      expect(await server.getWorkTypes("tok")).toEqual([]);
    });
  });

  describe("getEquipmentTypes", () => {
    it("extracts MechanizedEquipment.selectionData from the ticket-add-default model", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({
        models: [
          { name: "ticket-add-popup-default", items: [] },
          { name: "ticket-add-default", items: [
            { name: "Other", selectionData: ["nope"] },
            { name: "MechanizedEquipment", label: "Equipment Type:", selectionData: ["None", "Auger", "Backhoe"] },
          ] },
        ],
      }));
      const result = await server.getEquipmentTypes("tok");
      expect(result).toEqual(["None", "Auger", "Backhoe"]);
      const [url] = mockFetch.mock.calls[0];
      expect(String(url)).toContain("/api/client/ui/model/active?names=ticket-add-default,ticket-add-popup-default");
    });
    it("returns [] when the model or item is absent", async () => {
      mockFetch.mockReturnValueOnce(jsonResponse({ models: [] }));
      expect(await server.getEquipmentTypes("tok")).toEqual([]);
    });
  });
});
