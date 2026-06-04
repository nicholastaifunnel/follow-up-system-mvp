import type { Metadata } from "next";
import { LeadTemplateConverterClient } from "./LeadTemplateConverterClient";

export const metadata: Metadata = {
  title: "Lead Cleaner & Template Converter",
  description:
    "Clean scraper CSV, filter low-quality leads, and export a standard Follow-up System lead template.",
};

export default function LeadTemplateConverterPage() {
  return <LeadTemplateConverterClient />;
}
