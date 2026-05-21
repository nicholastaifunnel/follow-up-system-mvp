"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MESSAGE_TEMPLATE_STAGE_GROUPS,
  MESSAGE_TEMPLATE_VARIANT_STAGES,
  type MessageTemplateVariantStage,
} from "@/messageTemplatePresetStages";
import {
  deleteMessageTemplatePresetAction,
  duplicateMessageTemplatePresetAction,
  setActiveMessageTemplatePresetAction,
  updateMessageTemplatePresetAction,
} from "./actions";

type Props = {
  id: string;
  name: string;
  isActive: boolean;
  defaultExpanded: boolean;
  templates: Record<string, string>;
};

type Stage = MessageTemplateVariantStage;

const STAGES = MESSAGE_TEMPLATE_VARIANT_STAGES;

const TEMPLATE_VARIABLES = [
  { token: "{businessName}", description: "Business name" },
  { token: "{area}", description: "Area" },
  { token: "{assignedIndustry}", description: "Industry" },
  { token: "{leadLevel}", description: "Lead type" },
  { token: "{website}", description: "Website" },
  { token: "{reviewCount}", description: "Google review count" },
  { token: "{googleRating}", description: "Google rating" },
] as const;

function AutoResizeTextarea({
  value,
  onChange,
  disabled,
  inputRef,
  onStageActivity,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  onStageActivity: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
        inputRef(el);
      }}
      className="reply-form-textarea message-template-body-textarea"
      rows={4}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        onStageActivity();
      }}
      onFocus={onStageActivity}
      onClick={onStageActivity}
      onSelect={onStageActivity}
      onKeyUp={onStageActivity}
      disabled={disabled}
    />
  );
}

export function MessageTemplateRow({
  id,
  name,
  isActive,
  defaultExpanded,
  templates,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [presetName, setPresetName] = useState(name);
  const [bodies, setBodies] = useState<Record<string, string>>(templates);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRefs = useRef<Partial<Record<Stage, HTMLTextAreaElement>>>({});
  const lastFocusedStageRef = useRef<Stage | null>(null);
  const selectionByStageRef = useRef<
    Partial<Record<Stage, { start: number; end: number }>>
  >({});

  function recordStage(stage: Stage) {
    const textarea = textareaRefs.current[stage];
    if (!textarea) return;

    lastFocusedStageRef.current = stage;
    selectionByStageRef.current[stage] = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }

  function insertVariable(token: string) {
    const targetStage = lastFocusedStageRef.current;

    if (!targetStage) {
      const firstStage = STAGES[0];
      const current = bodies[firstStage] ?? "";
      const next = current + token;

      setBodies((currentBodies) => ({
        ...currentBodies,
        [firstStage]: next,
      }));

      requestAnimationFrame(() => {
        const textarea = textareaRefs.current[firstStage];
        if (!textarea) return;
        textarea.focus();
        const pos = next.length;
        textarea.setSelectionRange(pos, pos);
        selectionByStageRef.current[firstStage] = { start: pos, end: pos };
        lastFocusedStageRef.current = firstStage;
      });
      return;
    }

    const textarea = textareaRefs.current[targetStage];
    if (!textarea) return;

    const current = bodies[targetStage] ?? "";
    const stored = selectionByStageRef.current[targetStage];
    const start =
      document.activeElement === textarea
        ? textarea.selectionStart
        : (stored?.start ?? current.length);
    const end =
      document.activeElement === textarea
        ? textarea.selectionEnd
        : (stored?.end ?? start);
    const next = current.slice(0, start) + token + current.slice(end);
    const pos = start + token.length;

    setBodies((currentBodies) => ({
      ...currentBodies,
      [targetStage]: next,
    }));

    selectionByStageRef.current[targetStage] = { start: pos, end: pos };

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  }

  function save() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void updateMessageTemplatePresetAction(id, presetName, bodies).then(
        (result) => {
          if (result.ok) setFeedback("Saved");
          else setError(result.error);
        },
      );
    });
  }

  function setActive() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void setActiveMessageTemplatePresetAction(id).then((result) => {
        if (result.ok) setFeedback("Active");
        else setError(result.error);
      });
    });
  }

  function remove() {
    if (!window.confirm("Delete this preset and its 9 messages?")) return;

    setFeedback(null);
    setError(null);
    startTransition(() => {
      void deleteMessageTemplatePresetAction(id).then((result) => {
        if (!result.ok) setError(result.error);
      });
    });
  }

  function duplicate() {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void duplicateMessageTemplatePresetAction(id).then((result) => {
        if (result.ok) {
          setFeedback("Duplicated");
          if (result.presetId) {
            router.replace(`/message-templates?expanded=${result.presetId}`);
          }
        } else {
          setError(result.error);
        }
      });
    });
  }

  return (
    <section className="detail-card message-preset-card">
      <div className="message-preset-summary">
        <div className="message-preset-heading">
          <button
            type="button"
            className="message-preset-button message-preset-toggle"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide" : "Show"}
          </button>
          <h2>{presetName}</h2>
          {isActive ? (
            <span className="message-template-status message-template-status--active">
              Active
            </span>
          ) : null}
        </div>
        <div className="message-preset-actions">
          {!isActive ? (
            <button
              type="button"
              className="message-preset-button message-preset-set-active"
              onClick={setActive}
              disabled={isPending}
            >
              Set Active
            </button>
          ) : null}
          <button
            type="button"
            className="message-preset-button message-preset-duplicate"
            onClick={duplicate}
            disabled={isPending}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="message-preset-button message-preset-delete"
            onClick={remove}
            disabled={isPending}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="message-preset-editor">
          <label className="reply-form-label message-preset-name-field">
            Preset name
            <input
              className="reply-form-input message-preset-name-input"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              disabled={isPending}
            />
          </label>

          <div className="message-template-variables">
            <h3 className="message-template-variables-title">
              Available Variables
            </h3>
            <p className="message-template-variables-hint">
              Click a variable to insert it into the message box you are editing.
            </p>
            <div className="message-template-variables-grid">
              {TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  className="message-template-variable-chip"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVariable(variable.token)}
                  disabled={isPending}
                >
                  <code className="message-template-variable-chip-code">
                    {variable.token}
                  </code>
                  <span className="message-template-variable-chip-desc">
                    {variable.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="message-template-fallback-note">
            If Version 2 / 3 is empty, the system automatically uses Version 1.
          </p>

          <div className="message-preset-stage-groups">
            {MESSAGE_TEMPLATE_STAGE_GROUPS.map((group) => (
              <section className="message-preset-stage-group" key={group.baseStage}>
                <div className="message-preset-stage-group-header">
                  <h3>{group.label}</h3>
                  <p>{group.hint}</p>
                </div>
                <div className="message-preset-variant-grid">
                  {group.stages.map((stage, index) => (
                    <label
                      className="reply-form-label message-preset-stage-field"
                      key={stage}
                    >
                      <span className="message-preset-stage-label">
                        Version {index + 1}
                      </span>
                      <AutoResizeTextarea
                        value={bodies[stage] ?? ""}
                        onChange={(value) =>
                          setBodies((current) => ({
                            ...current,
                            [stage]: value,
                          }))
                        }
                        disabled={isPending}
                        inputRef={(el) => {
                          if (el) textareaRefs.current[stage] = el;
                          else delete textareaRefs.current[stage];
                        }}
                        onStageActivity={() => recordStage(stage)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="message-preset-save-row">
            <div className="message-preset-save-status">
              {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
              {error ? <span className="reply-form-error">{error}</span> : null}
            </div>
            <button
              type="button"
              className="reply-form-submit message-preset-save"
              onClick={save}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save Preset"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
