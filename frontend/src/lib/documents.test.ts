import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchCatalog,
  fetchTemplate,
  fetchMyDocuments,
  saveDocument,
  postChat,
} from "@/lib/documents";
import { setUser } from "@/lib/auth";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
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

describe("saved documents client", () => {
  beforeEach(() => {
    setUser({ token: "tok-42", email: "u@example.com" });
  });

  it("fetchMyDocuments sends the bearer token", async () => {
    const fetchMock = stubFetch([{ id: 1, documentId: "CSA", title: "t" }]);
    const docs = await fetchMyDocuments();
    expect(docs[0].id).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/my-documents");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok-42");
  });

  it("saveDocument posts id/title/markdown with the bearer token", async () => {
    const fetchMock = stubFetch({ id: 5, documentId: "CSA", title: "Deal" });
    const saved = await saveDocument("CSA", "Deal", "# body", 5);
    expect(saved.id).toBe(5);
    const call = fetchMock.mock.calls[0];
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBe("Bearer tok-42");
    const body = JSON.parse(call[1].body);
    expect(body).toMatchObject({ id: 5, documentId: "CSA", title: "Deal", markdown: "# body" });
  });
});
