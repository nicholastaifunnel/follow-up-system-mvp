import type { Metadata } from "next";
import { LeadTemplateConverterClient } from "./LeadTemplateConverterClient";

export const metadata: Metadata = {
  title: "Lead Template Converter",
  description:
    "Convert gosom / external scraper CSV into the standard Follow-up System lead template.",
};

export default function LeadTemplateConverterPage() {
  return <LeadTemplateConverterClient />;
}
