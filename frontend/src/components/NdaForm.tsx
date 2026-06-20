"use client";

import { useId } from "react";
import type { NdaFormData, PartyDetails } from "@/lib/nda";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}

const labelClass = "block text-sm font-medium text-slate-700";
const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-5">
      <legend className="px-1 text-base font-semibold text-slate-900">
        {title}
      </legend>
      {description && (
        <p className="mt-1 mb-3 text-xs text-slate-500">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * Labeled text/date input or textarea. Generates a unique id with useId so the
 * label is always correctly associated with its control (click-to-focus and
 * screen-reader pairing), even when the field is rendered more than once.
 */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "date";
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {multiline ? (
        <textarea
          id={id}
          className={`${inputClass} resize-y`}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Whole-number input for a count of years. Keeps the displayed value in sync
 * with React state while typing (so the field never shows a stale value), and
 * clamps to a minimum of 1 on blur so the agreement can't reference "0 years".
 */
function YearInput({
  value,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number;
  disabled: boolean;
  ariaLabel: string;
  onChange: (years: number) => void;
}) {
  return (
    <input
      type="number"
      min={1}
      aria-label={ariaLabel}
      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const parsed = parseInt(e.target.value, 10);
        onChange(Number.isNaN(parsed) ? 1 : Math.max(0, parsed));
      }}
      onBlur={(e) => {
        const parsed = parseInt(e.target.value, 10);
        if (Number.isNaN(parsed) || parsed < 1) onChange(1);
      }}
    />
  );
}

function PartyFields({
  legend,
  party,
  onChange,
}: {
  legend: string;
  party: PartyDetails;
  onChange: (party: PartyDetails) => void;
}) {
  const update = (field: keyof PartyDetails, value: string) =>
    onChange({ ...party, [field]: value });

  return (
    <Section
      title={legend}
      description="Signatures and dates are left blank for manual signing."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Print Name"
          value={party.printName}
          onChange={(v) => update("printName", v)}
          placeholder="Jane Doe"
        />
        <TextField
          label="Title"
          value={party.title}
          onChange={(v) => update("title", v)}
          placeholder="Chief Executive Officer"
        />
      </div>
      <TextField
        label="Company"
        value={party.company}
        onChange={(v) => update("company", v)}
        placeholder="Acme, Inc."
      />
      <TextField
        label="Notice Address"
        value={party.noticeAddress}
        onChange={(v) => update("noticeAddress", v)}
        placeholder="legal@acme.com or 123 Main St, City, ST"
      />
    </Section>
  );
}

export default function NdaForm({ data, onChange }: NdaFormProps) {
  const set = <K extends keyof NdaFormData>(field: K, value: NdaFormData[K]) =>
    onChange({ ...data, [field]: value });

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <Section title="Agreement terms">
        <TextField
          label="Purpose"
          hint="How Confidential Information may be used."
          value={data.purpose}
          onChange={(v) => set("purpose", v)}
          multiline
        />

        <TextField
          label="Effective Date"
          type="date"
          value={data.effectiveDate}
          onChange={(v) => set("effectiveDate", v)}
        />

        <div role="radiogroup" aria-label="MNDA Term">
          <span className={labelClass}>MNDA Term</span>
          <p className="text-xs text-slate-500">The length of this MNDA.</p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mndaTerm"
                checked={data.mndaTermType === "expires"}
                onChange={() => set("mndaTermType", "expires")}
              />
              Expires
              <YearInput
                ariaLabel="MNDA term in years"
                value={data.mndaTermYears}
                disabled={data.mndaTermType !== "expires"}
                onChange={(years) => set("mndaTermYears", years)}
              />
              year(s) from Effective Date
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="mndaTerm"
                checked={data.mndaTermType === "until_terminated"}
                onChange={() => set("mndaTermType", "until_terminated")}
              />
              Continues until terminated
            </label>
          </div>
        </div>

        <div role="radiogroup" aria-label="Term of Confidentiality">
          <span className={labelClass}>Term of Confidentiality</span>
          <p className="text-xs text-slate-500">
            How long Confidential Information is protected.
          </p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="confTerm"
                checked={data.confidentialityTermType === "years"}
                onChange={() => set("confidentialityTermType", "years")}
              />
              <YearInput
                ariaLabel="Term of confidentiality in years"
                value={data.confidentialityTermYears}
                disabled={data.confidentialityTermType !== "years"}
                onChange={(years) => set("confidentialityTermYears", years)}
              />
              year(s) from Effective Date
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="confTerm"
                checked={data.confidentialityTermType === "perpetuity"}
                onChange={() => set("confidentialityTermType", "perpetuity")}
              />
              In perpetuity
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Governing Law (State)"
            value={data.governingLaw}
            onChange={(v) => set("governingLaw", v)}
            placeholder="Delaware"
          />
          <TextField
            label="Jurisdiction"
            value={data.jurisdiction}
            onChange={(v) => set("jurisdiction", v)}
            placeholder="New Castle, DE"
          />
        </div>

        <TextField
          label="MNDA Modifications"
          hint="Optional. List any modifications to the MNDA."
          value={data.modifications}
          onChange={(v) => set("modifications", v)}
          placeholder="None"
          multiline
          rows={2}
        />
      </Section>

      <PartyFields
        legend="Party 1"
        party={data.party1}
        onChange={(party1) => set("party1", party1)}
      />
      <PartyFields
        legend="Party 2"
        party={data.party2}
        onChange={(party2) => set("party2", party2)}
      />
    </form>
  );
}
