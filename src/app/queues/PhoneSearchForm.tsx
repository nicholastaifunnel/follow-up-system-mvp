"use client";

import Link from "next/link";

type Props = {
  currentLimit: 10 | 20 | 50;
  initialPhone: string;
};

export function PhoneSearchForm({ currentLimit, initialPhone }: Props) {
  const clearHref = `/queues?limit=${currentLimit}`;
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
