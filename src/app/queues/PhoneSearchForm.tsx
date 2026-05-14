"use client";

import Link from "next/link";
import { queuesPath } from "@/queuesUrl";

type Props = {
  currentLimit: 10 | 20 | 50;
  initialPhone: string;
  currentAngle: string;
  reviewMax?: number;
};

export function PhoneSearchForm({
  currentLimit,
  initialPhone,
  currentAngle,
  reviewMax,
}: Props) {
  const clearHref = queuesPath({
    limit: currentLimit,
    angle: currentAngle,
    ...(reviewMax !== undefined ? { reviewMax } : {}),
  });
  const hasPhoneQuery = initialPhone.trim().length > 0;

  return (
    <div className="phone-search-card">
      <h2 className="phone-search-heading">Search by phone</h2>
      <form
        method="get"
        action="/queues"
        className="phone-search-form"
        role="search"
        aria-label="Search leads by phone"
      >
        <input type="hidden" name="limit" value={currentLimit} />
        <input type="hidden" name="angle" value={currentAngle} />
        {reviewMax !== undefined ? (
          <input type="hidden" name="reviewMax" value={String(reviewMax)} />
        ) : null}
        <input
          type="search"
          name="phone"
          className="phone-search-input"
          placeholder="Search phone, e.g. 0123456789"
          defaultValue={initialPhone}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="phone-search-btn">
          Search
        </button>
      </form>
      {hasPhoneQuery ? (
        <p className="phone-search-clear-wrap">
          <Link href={clearHref} className="phone-search-clear">
            Clear
          </Link>
        </p>
      ) : null}
    </div>
  );
}
