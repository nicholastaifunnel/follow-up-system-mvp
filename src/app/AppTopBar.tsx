"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

/** Hide staff chrome on public landing-page apply flows. */
export function AppTopBar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/apply/") || pathname === "/review-qr-system") {
    return null;
  }

  return (
    <div className="app-top-bar">
      <Link href="/logout" className="theme-toggle" prefetch={false}>
        <span className="theme-toggle-label">Logout</span>
      </Link>
      <ThemeToggle />
    </div>
  );
}
