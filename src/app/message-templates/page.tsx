import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  BASE_MESSAGE_STAGES,
  MESSAGE_TEMPLATE_VARIANT_STAGES,
  messageStageForVariant,
} from "@/messageTemplatePresetStages";
import { CreateMessageTemplatePresetForm } from "./preset-form";
import { MessageTemplateRow } from "./MessageTemplateRow";

export const dynamic = "force-dynamic";

export default async function MessageTemplateSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ expanded?: string }>;
}) {
  const { expanded } = await searchParams;
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
            defaultExpanded={preset.isActive || expanded === preset.id}
            templates={(() => {
              const byStage = Object.fromEntries(
                preset.templates.map((template) => [
                  template.messageStage,
                  template.body,
                ]),
              );
              for (const baseStage of BASE_MESSAGE_STAGES) {
                const v1Stage = messageStageForVariant(baseStage, 1);
                if (!byStage[v1Stage] && byStage[baseStage]) {
                  byStage[v1Stage] = byStage[baseStage];
                }
              }
              for (const stage of MESSAGE_TEMPLATE_VARIANT_STAGES) {
                byStage[stage] = byStage[stage] ?? "";
              }
              return byStage;
            })()}
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
