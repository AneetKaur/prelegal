import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCatalog, fetchTemplate, postChat } from "@/lib/documents";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("documents client", () => {
  it("fetchCatalog returns the list", async () => {
    stubFetch([{ id: "CSA", name: "Cloud", description: "d" }]);
    const catalog = await fetchCatalog();
    expect(catalog[0].id).toBe("CSA");
  });

  it("fetchTemplate returns the markdown string", async () => {
    stubFetch({ id: "CSA", name: "Cloud", markdown: "# Hi" });
    expect(await fetchTemplate("CSA")).toBe("# Hi");
  });

  it("postChat sends messages, documentId and markdown", async () => {
    const fetchMock = stubFetch({
      reply: "ok",
      documentId: "CSA",
      documentMarkdown: "# Filled",
    });
    const res = await postChat([{ role: "user", content: "hi" }], "CSA", "# Blank");
    expect(res.documentMarkdown).toBe("# Filled");
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody.documentId).toBe("CSA");
    expect(sentBody.documentMarkdown).toBe("# Blank");
  });

  it("throws on a non-ok response", async () => {
    stubFetch({}, false, 500);
    await expect(fetchCatalog()).rejects.toThrow();
  });
});
