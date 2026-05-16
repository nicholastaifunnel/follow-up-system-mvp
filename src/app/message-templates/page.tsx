import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateMessageTemplatePresetForm } from "./preset-form";
import { MessageTemplateRow } from "./MessageTemplateRow";

export const dynamic = "force-dynamic";

export default async function MessageTemplateSettingsPage() {
  const presets = await prisma.messageTemplatePreset.findMany({
    include: { templates: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="page message-templates-page">
      <p className="top-links">
        <Link className="top-link" href="/queues">
          Back to Queues
        </Link>
      </p>
      <header className="lead-header">
        <h1>Message Template Presets</h1>
        <p className="sub">
          Build reusable 3-message sequences and choose one active preset for
          Prepare Message.
        </p>
      </header>

      <CreateMessageTemplatePresetForm />

      <div className="message-presets-list">
        {presets.map((preset) => (
          <MessageTemplateRow
            key={preset.id}
            id={preset.id}
            name={preset.name}
            isActive={preset.isActive}
            templates={Object.fromEntries(
              preset.templates.map((template) => [
                template.messageStage,
                template.body,
              ]),
            )}
          />
        ))}
      </div>

      {presets.length === 0 ? (
        <p className="empty">
          No presets yet. Add one above or run{" "}
          <code>npm run message-presets:sync</code>.
        </p>
      ) : null}
    </div>
  );
}
