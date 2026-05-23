"use client";

import { useState, useTransition } from "react";
import { submitApplyFormAction } from "./actions";

type Props = {
  slug: string;
  linkName: string;
};

export function ApplyForm({ slug, linkName }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="public-apply-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await submitApplyFormAction(slug, fd);
          if (result && "error" in result && !result.ok) {
            setError(result.error);
          }
        });
      }}
    >
      <p className="sub public-apply-intro">
        Free trial request for <strong>{linkName}</strong>
      </p>
      {error ? <p className="public-apply-error">{error}</p> : null}
      <label>
        Contact person *
        <input name="contactPerson" required autoComplete="name" />
      </label>
      <label>
        WhatsApp number *
        <input
          name="whatsappNumber"
          required
          type="tel"
          inputMode="tel"
          placeholder="e.g. 012-345 6789"
          autoComplete="tel"
        />
      </label>
      <label>
        Business name *
        <input name="businessName" required />
      </label>
      <label>
        Google Maps name or URL *
        <input
          name="googleMapName"
          required
          placeholder="Business name on Google Maps or Google Maps link"
        />
      </label>
      <label>
        Facebook page
        <input
          name="facebookPage"
          placeholder="Optional: page name or URL"
        />
      </label>
      <button type="submit" className="public-apply-submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit free trial request"}
      </button>
    </form>
  );
}
