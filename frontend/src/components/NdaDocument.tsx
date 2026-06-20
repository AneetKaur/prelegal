import {
  coverPageValues,
  yearsLabel,
  type NdaFormData,
  type PartyDetails,
} from "@/lib/nda";

/**
 * Inline value pulled from the Cover Page and woven into the prose. Shows the
 * value when present, or a dashed placeholder when the field is still blank.
 */
function V({ value, placeholder }: { value: string; placeholder: string }) {
  if (value) return <span className="font-semibold text-slate-900">{value}</span>;
  return (
    <span className="font-medium italic text-slate-400">[{placeholder}]</span>
  );
}

/** A selectable option as shown on the Cover Page, with a checkbox glyph. */
function Choice({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border text-[11px] leading-none ${
          checked
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-400 bg-white text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={checked ? "text-slate-900" : "text-slate-400"}>{children}</span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-slate-700">
      {children}
    </h3>
  );
}

function partyCell(value: string) {
  return value ? (
    <span className="text-slate-900">{value}</span>
  ) : (
    <span className="text-slate-300">—</span>
  );
}

function PartyColumn({ party }: { party: PartyDetails }) {
  const rows: [string, string][] = [
    ["Signature", ""],
    ["Print Name", party.printName],
    ["Title", party.title],
    ["Company", party.company],
    ["Notice Address", party.noticeAddress],
    ["Date", ""],
  ];
  return (
    <table className="w-full border-collapse text-[13px]">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-slate-200 align-top">
            <th className="w-32 py-2 pr-3 text-left font-medium text-slate-500">
              {label}
            </th>
            <td className="py-2">
              {label === "Signature" || label === "Date" ? (
                <span className="text-slate-300">—</span>
              ) : (
                partyCell(value)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Renders the completed Mutual NDA: the Cover Page followed by the Common Paper
 * Standard Terms (Version 1.0), with the user's values filled in. Text is
 * reproduced from templates/Mutual-NDA.md and Mutual-NDA-coverpage.md.
 */
export default function NdaDocument({ data }: { data: NdaFormData }) {
  const v = coverPageValues(data);

  return (
    <article className="nda-document mx-auto max-w-[8.5in] bg-white px-10 py-12 font-serif text-[15px] leading-relaxed text-slate-800 shadow-sm sm:px-14">
      {/* ---- Cover Page ---- */}
      <header className="mb-6 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Mutual Non-Disclosure Agreement
        </h1>
        <p className="mt-3 text-[13px] text-slate-500">
          This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists of:
          (1) this Cover Page and (2) the Common Paper Mutual NDA Standard Terms
          Version 1.0. Any modifications of the Standard Terms should be made on
          the Cover Page, which will control over conflicts with the Standard
          Terms.
        </p>
      </header>

      <section>
        <Heading>Purpose</Heading>
        <p className="text-[12px] italic text-slate-400">
          How Confidential Information may be used
        </p>
        <p className="mt-1">
          <V value={v.purpose} placeholder="Describe the purpose" />
        </p>

        <Heading>Effective Date</Heading>
        <p className="mt-1">
          <V value={v.effectiveDate} placeholder="Effective date" />
        </p>

        <Heading>MNDA Term</Heading>
        <p className="text-[12px] italic text-slate-400">The length of this MNDA</p>
        <div className="mt-1 space-y-1">
          <Choice checked={data.mndaTermType === "expires"}>
            Expires{" "}
            {data.mndaTermType === "expires" ? (
              <span className="font-semibold text-slate-900">
                {yearsLabel(data.mndaTermYears)}
              </span>
            ) : (
              "[1 year]"
            )}{" "}
            from Effective Date.
          </Choice>
          <Choice checked={data.mndaTermType === "until_terminated"}>
            Continues until terminated in accordance with the terms of the MNDA.
          </Choice>
        </div>

        <Heading>Term of Confidentiality</Heading>
        <p className="text-[12px] italic text-slate-400">
          How long Confidential Information is protected
        </p>
        <div className="mt-1 space-y-1">
          <Choice checked={data.confidentialityTermType === "years"}>
            {data.confidentialityTermType === "years" ? (
              <span className="font-semibold text-slate-900">
                {yearsLabel(data.confidentialityTermYears)}
              </span>
            ) : (
              "[1 year]"
            )}{" "}
            from Effective Date, but in the case of trade secrets until
            Confidential Information is no longer considered a trade secret under
            applicable laws.
          </Choice>
          <Choice checked={data.confidentialityTermType === "perpetuity"}>
            In perpetuity.
          </Choice>
        </div>

        <Heading>Governing Law &amp; Jurisdiction</Heading>
        <p className="mt-1">
          Governing Law:{" "}
          <V value={v.governingLaw} placeholder="Fill in state" />
        </p>
        <p className="mt-1">
          Jurisdiction:{" "}
          <V
            value={v.jurisdiction}
            placeholder="Fill in city or county and state"
          />
        </p>

        <Heading>MNDA Modifications</Heading>
        <p className="text-[12px] italic text-slate-400">
          List any modifications to the MNDA
        </p>
        <p className="mt-1 whitespace-pre-wrap">
          {data.modifications.trim() ? (
            data.modifications.trim()
          ) : (
            <span className="italic text-slate-400">None</span>
          )}
        </p>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-6">
        <p className="text-[13px] text-slate-600">
          By signing this Cover Page, each party agrees to enter into this MNDA as
          of the Effective Date.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-700">
              Party 1
            </p>
            <PartyColumn party={data.party1} />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-700">
              Party 2
            </p>
            <PartyColumn party={data.party2} />
          </div>
        </div>
      </section>

      {/* ---- Standard Terms ---- */}
      <section className="nda-standard-terms mt-12 border-t-2 border-slate-300 pt-8">
        <h2 className="text-xl font-bold text-slate-900">Standard Terms</h2>
        <ol className="mt-4 list-none space-y-4 text-[14px]">
          <li>
            <strong>1. Introduction.</strong> This Mutual Non-Disclosure Agreement
            (which incorporates these Standard Terms and the Cover Page (defined
            below)) (&ldquo;<strong>MNDA</strong>&rdquo;) allows each party
            (&ldquo;<strong>Disclosing Party</strong>&rdquo;) to disclose or make
            available information in connection with the{" "}
            <V value={v.purpose} placeholder="Purpose" /> which (1) the Disclosing
            Party identifies to the receiving party (&ldquo;
            <strong>Receiving Party</strong>&rdquo;) as &ldquo;confidential&rdquo;,
            &ldquo;proprietary&rdquo;, or the like or (2) should be reasonably
            understood as confidential or proprietary due to its nature and the
            circumstances of its disclosure (&ldquo;
            <strong>Confidential Information</strong>&rdquo;). Each party&rsquo;s
            Confidential Information also includes the existence and status of the
            parties&rsquo; discussions and information on the Cover Page.
            Confidential Information includes technical or business information,
            product designs or roadmaps, requirements, pricing, security and
            compliance documentation, technology, inventions and know-how. To use
            this MNDA, the parties must complete and sign a cover page
            incorporating these Standard Terms (&ldquo;<strong>Cover Page</strong>
            &rdquo;). Each party is identified on the Cover Page and capitalized
            terms have the meanings given herein or on the Cover Page.
          </li>
          <li>
            <strong>2. Use and Protection of Confidential Information.</strong> The
            Receiving Party shall: (a) use Confidential Information solely for the{" "}
            <V value={v.purpose} placeholder="Purpose" />; (b) not disclose
            Confidential Information to third parties without the Disclosing
            Party&rsquo;s prior written approval, except that the Receiving Party
            may disclose Confidential Information to its employees, agents,
            advisors, contractors and other representatives having a reasonable
            need to know for the <V value={v.purpose} placeholder="Purpose" />,
            provided these representatives are bound by confidentiality
            obligations no less protective of the Disclosing Party than the
            applicable terms in this MNDA and the Receiving Party remains
            responsible for their compliance with this MNDA; and (c) protect
            Confidential Information using at least the same protections the
            Receiving Party uses for its own similar information but no less than a
            reasonable standard of care.
          </li>
          <li>
            <strong>3. Exceptions.</strong> The Receiving Party&rsquo;s obligations
            in this MNDA do not apply to information that it can demonstrate: (a)
            is or becomes publicly available through no fault of the Receiving
            Party; (b) it rightfully knew or possessed prior to receipt from the
            Disclosing Party without confidentiality restrictions; (c) it
            rightfully obtained from a third party without confidentiality
            restrictions; or (d) it independently developed without using or
            referencing the Confidential Information.
          </li>
          <li>
            <strong>4. Disclosures Required by Law.</strong> The Receiving Party
            may disclose Confidential Information to the extent required by law,
            regulation or regulatory authority, subpoena or court order, provided
            (to the extent legally permitted) it provides the Disclosing Party
            reasonable advance notice of the required disclosure and reasonably
            cooperates, at the Disclosing Party&rsquo;s expense, with the
            Disclosing Party&rsquo;s efforts to obtain confidential treatment for
            the Confidential Information.
          </li>
          <li>
            <strong>5. Term and Termination.</strong> This MNDA commences on the{" "}
            <V value={v.effectiveDate} placeholder="Effective Date" />{" "}
            {data.mndaTermType === "expires" ? (
              <>
                and expires at the end of{" "}
                <V value={v.mndaTerm} placeholder="MNDA Term" />
              </>
            ) : (
              <>and continues {v.mndaTerm}</>
            )}
            . Either party may terminate this MNDA for any or no reason upon written
            notice to the other party. The Receiving Party&rsquo;s obligations
            relating to Confidential Information will survive for the{" "}
            <V value={v.confidentialityTerm} placeholder="Term of Confidentiality" />
            , despite any expiration or termination of this MNDA.
          </li>
          <li>
            <strong>6. Return or Destruction of Confidential Information.</strong>{" "}
            Upon expiration or termination of this MNDA or upon the Disclosing
            Party&rsquo;s earlier request, the Receiving Party will: (a) cease
            using Confidential Information; (b) promptly after the Disclosing
            Party&rsquo;s written request, destroy all Confidential Information in
            the Receiving Party&rsquo;s possession or control or return it to the
            Disclosing Party; and (c) if requested by the Disclosing Party, confirm
            its compliance with these obligations in writing. As an exception to
            subsection (b), the Receiving Party may retain Confidential Information
            in accordance with its standard backup or record retention policies or
            as required by law, but the terms of this MNDA will continue to apply
            to the retained Confidential Information.
          </li>
          <li>
            <strong>7. Proprietary Rights.</strong> The Disclosing Party retains
            all of its intellectual property and other rights in its Confidential
            Information and its disclosure to the Receiving Party grants no license
            under such rights.
          </li>
          <li>
            <strong>8. Disclaimer.</strong> ALL CONFIDENTIAL INFORMATION IS
            PROVIDED &ldquo;AS IS&rdquo;, WITH ALL FAULTS, AND WITHOUT WARRANTIES,
            INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS
            FOR A PARTICULAR PURPOSE.
          </li>
          <li>
            <strong>9. Governing Law and Jurisdiction.</strong> This MNDA and all
            matters relating hereto are governed by, and construed in accordance
            with, the laws of the State of{" "}
            <V value={v.governingLaw} placeholder="Governing Law" />, without
            regard to the conflict of laws provisions of such{" "}
            <V value={v.governingLaw} placeholder="Governing Law" />. Any legal
            suit, action, or proceeding relating to this MNDA must be instituted in
            the federal or state courts located in{" "}
            <V value={v.jurisdiction} placeholder="Jurisdiction" />. Each party
            irrevocably submits to the exclusive jurisdiction of such{" "}
            <V value={v.jurisdiction} placeholder="Jurisdiction" /> in any such
            suit, action, or proceeding.
          </li>
          <li>
            <strong>10. Equitable Relief.</strong> A breach of this MNDA may cause
            irreparable harm for which monetary damages are an insufficient remedy.
            Upon a breach of this MNDA, the Disclosing Party is entitled to seek
            appropriate equitable relief, including an injunction, in addition to
            its other remedies.
          </li>
          <li>
            <strong>11. General.</strong> Neither party has an obligation under
            this MNDA to disclose Confidential Information to the other or proceed
            with any proposed transaction. Neither party may assign this MNDA
            without the prior written consent of the other party, except that
            either party may assign this MNDA in connection with a merger,
            reorganization, acquisition or other transfer of all or substantially
            all its assets or voting securities. Any assignment in violation of
            this Section is null and void. This MNDA will bind and inure to the
            benefit of each party&rsquo;s permitted successors and assigns. Waivers
            must be signed by the waiving party&rsquo;s authorized representative
            and cannot be implied from conduct. If any provision of this MNDA is
            held unenforceable, it will be limited to the minimum extent necessary
            so the rest of this MNDA remains in effect. This MNDA (including the
            Cover Page) constitutes the entire agreement of the parties with
            respect to its subject matter, and supersedes all prior and
            contemporaneous understandings, agreements, representations, and
            warranties, whether written or oral, regarding such subject matter.
            This MNDA may only be amended, modified, waived, or supplemented by an
            agreement in writing signed by both parties. Notices, requests and
            approvals under this MNDA must be sent in writing to the email or
            postal addresses on the Cover Page and are deemed delivered on receipt.
            This MNDA may be executed in counterparts, including electronic copies,
            each of which is deemed an original and which together form the same
            agreement.
          </li>
        </ol>

        <p className="mt-8 text-[11px] text-slate-400">
          Common Paper Mutual Non-Disclosure Agreement Version 1.0, free to use
          under CC BY 4.0.
        </p>
      </section>
    </article>
  );
}
