// Data model for the Mutual Non-Disclosure Agreement creator.
//
// The field set mirrors the Common Paper Mutual NDA Cover Page
// (templates/Mutual-NDA-coverpage.md): the deal-specific values a user
// fills in, which are then woven into the Standard Terms.

export interface PartyDetails {
  printName: string;
  title: string;
  company: string;
  /** Email or postal address used for notices. */
  noticeAddress: string;
}

/** How the MNDA itself ends (Cover Page "MNDA Term"). */
export type MndaTermType = "expires" | "until_terminated";

/** How long Confidential Information stays protected (Cover Page "Term of Confidentiality"). */
export type ConfidentialityTermType = "years" | "perpetuity";

export interface NdaFormData {
  /** How Confidential Information may be used. */
  purpose: string;
  /** ISO date string (yyyy-mm-dd) from the date input; empty until chosen. */
  effectiveDate: string;
  mndaTermType: MndaTermType;
  mndaTermYears: number;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityTermYears: number;
  /** Governing law: a US state. */
  governingLaw: string;
  /** Jurisdiction: city or county and state, e.g. "New Castle, DE". */
  jurisdiction: string;
  /** Free-text list of any modifications to the MNDA. */
  modifications: string;
  party1: PartyDetails;
  party2: PartyDetails;
}

const emptyParty = (): PartyDetails => ({
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
});

/** Sensible starting values, matching the defaults suggested on the Cover Page. */
export const defaultNdaForm = (): NdaFormData => ({
  purpose:
    "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: emptyParty(),
  party2: emptyParty(),
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format an ISO yyyy-mm-dd string as e.g. "January 5, 2026". */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return "";
  return `${monthName} ${Number(day)}, ${year}`;
}

/** Pluralize "year" based on a count, e.g. 1 -> "1 year", 2 -> "2 years". */
export function yearsLabel(n: number): string {
  return `${n} ${n === 1 ? "year" : "years"}`;
}

/**
 * Display strings for the values the Standard Terms reference inline (the
 * `coverpage_link` spans in templates/Mutual-NDA.md). Each returns an empty
 * string when the underlying field is blank so the document can show a
 * placeholder in its place.
 */
export interface CoverPageValues {
  purpose: string;
  effectiveDate: string;
  mndaTerm: string;
  confidentialityTerm: string;
  governingLaw: string;
  jurisdiction: string;
}

export function coverPageValues(data: NdaFormData): CoverPageValues {
  return {
    purpose: data.purpose.trim(),
    effectiveDate: formatDate(data.effectiveDate),
    mndaTerm:
      data.mndaTermType === "expires"
        ? `${yearsLabel(data.mndaTermYears)} from the Effective Date`
        : "until terminated in accordance with the terms of this MNDA",
    confidentialityTerm:
      data.confidentialityTermType === "years"
        ? `${yearsLabel(data.confidentialityTermYears)} from the Effective Date`
        : "in perpetuity",
    governingLaw: data.governingLaw.trim(),
    jurisdiction: data.jurisdiction.trim(),
  };
}
