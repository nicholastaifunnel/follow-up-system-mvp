import type { Metadata } from "next";
import type { ReactNode } from "react";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
