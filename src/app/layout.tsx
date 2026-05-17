import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";
import { ThemeToggle } from "./ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Follow-up System MVP",
  description: "Read-only message and follow-up queues",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.dataset.theme="dark";else document.documentElement.removeAttribute("data-theme");}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
        <div className="app-top-bar">
          <Link href="/logout" className="theme-toggle" prefetch={false}>
            <span className="theme-toggle-label">Logout</span>
          </Link>
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
