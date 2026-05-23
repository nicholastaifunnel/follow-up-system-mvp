"use client";

import { useState, useTransition } from "react";
import { submitApplyFormAction } from "./actions";

type Props = {
  slug: string;
};

export function ApplyForm({ slug }: Props) {
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
      {error ? <p className="public-apply-error">{error}</p> : null}
      <label>
        联系人 / Contact person *
        <input
          name="contactPerson"
          required
          autoComplete="name"
          placeholder="例如：Ah Mei / Jason"
        />
      </label>
      <label>
        WhatsApp 号码 / WhatsApp number *
        <input
          name="whatsappNumber"
          required
          type="tel"
          inputMode="tel"
          placeholder="例如：011-1327 3706"
          autoComplete="tel"
        />
      </label>
      <label>
        店名 / Business name *
        <input name="businessName" required placeholder="例如：ABC Beauty Studio" />
      </label>
      <label>
        Google Maps 店名或链接 / Google Maps name or link *
        <input
          name="googleMapName"
          required
          placeholder="可以填写 Google Maps 上的店名，或直接 paste Google Maps link"
        />
      </label>
      <label>
        Facebook Page（可选）/ Facebook Page (optional)
        <input
          name="facebookPage"
          placeholder="如果有 Facebook Page，可以填写名称或链接"
        />
      </label>
      <button type="submit" className="public-apply-button" disabled={pending}>
        {pending
          ? "提交中… / Submitting…"
          : "提交免费试用申请 / Submit Free Trial Request"}
      </button>
      <p className="public-apply-footnote">
        提交后，你会看到 WhatsApp 按钮，请点击联系我们完成确认。
      </p>
      <p className="public-apply-footnote">
        After submitting, tap the WhatsApp button to confirm your setup.
      </p>
    </form>
  );
}
