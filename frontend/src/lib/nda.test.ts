import { describe, it, expect } from "vitest";
import {
  coverPageValues,
  defaultNdaForm,
  formatDate,
  yearsLabel,
  type NdaFormData,
} from "./nda";

describe("formatDate", () => {
  it("formats an ISO date as a readable string", () => {
    expect(formatDate("2026-07-01")).toBe("July 1, 2026");
  });

  it("strips a leading zero from the day", () => {
    expect(formatDate("2026-01-05")).toBe("January 5, 2026");
  });

  it("returns an empty string for blank or malformed input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("2026-13-01")).toBe(""); // invalid month
  });
});

describe("yearsLabel", () => {
  it("uses the singular for one year", () => {
    expect(yearsLabel(1)).toBe("1 year");
  });

  it("uses the plural for other counts", () => {
    expect(yearsLabel(2)).toBe("2 years");
    expect(yearsLabel(0)).toBe("0 years");
  });
});

describe("coverPageValues", () => {
  const base = (overrides: Partial<NdaFormData> = {}): NdaFormData => ({
    ...defaultNdaForm(),
    ...overrides,
  });

  it("formats the effective date and derives the term phrases", () => {
    const v = coverPageValues(
      base({
        effectiveDate: "2026-07-01",
        mndaTermType: "expires",
        mndaTermYears: 2,
        confidentialityTermType: "years",
        confidentialityTermYears: 3,
      })
    );
    expect(v.effectiveDate).toBe("July 1, 2026");
    expect(v.mndaTerm).toBe("2 years from the Effective Date");
    expect(v.confidentialityTerm).toBe("3 years from the Effective Date");
  });

  it("describes the non-duration term options", () => {
    const v = coverPageValues(
      base({
        mndaTermType: "until_terminated",
        confidentialityTermType: "perpetuity",
      })
    );
    expect(v.mndaTerm).toBe(
      "until terminated in accordance with the terms of this MNDA"
    );
    expect(v.confidentialityTerm).toBe("in perpetuity");
  });

  it("trims free-text fields and leaves blanks empty", () => {
    const v = coverPageValues(
      base({
        purpose: "  Evaluate a deal  ",
        governingLaw: "  Delaware ",
        jurisdiction: "",
      })
    );
    expect(v.purpose).toBe("Evaluate a deal");
    expect(v.governingLaw).toBe("Delaware");
    expect(v.jurisdiction).toBe("");
  });
});
