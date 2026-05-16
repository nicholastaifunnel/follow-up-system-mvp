"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const STAGES = [
  "First Message",
  "First Follow Up",
  "Second Follow Up",
] as const;

type Stage = (typeof STAGES)[number];

const STAGE_HINTS: Record<Stage, string> = {
  "First Message":
    "第一次发给商家的 message，目标是让对方愿意回复。",
  "First Follow Up":
    "1–2 天后跟进，目标是提醒对方看 example 或 sample。",
  "Second Follow Up": "最后一次礼貌跟进，不要追太紧。",
};

const TEMPLATE_VARIABLES = [
  { token: "{businessName}", description: "商家名字" },
  { token: "{area}", description: "地区" },
  { token: "{assignedIndustry}", description: "行业" },
  { token: "{leadLevel}", description: "Lead 类型" },
  { token: "{website}", description: "网站" },
  { token: "{reviewCount}", description: "Google review 数量" },
  { token: "{googleRating}", description: "Google 评分" },
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
      rows={5}
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
  const [bodies, setBodies] = useState(templates);
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
      void updateMessageTemplatePresetAction(id, presetName, bodies).then((result) => {
        if (result.ok) setFeedback("Saved");
        else setError(result.error);
      });
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
    if (!window.confirm("Delete this preset and its 3 messages?")) return;

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
        }
        else setError(result.error);
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
          {isActive ? <span className="message-template-status message-template-status--active">Active</span> : null}
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
              Available Variables / 可用变量
            </h3>
            <p className="message-template-variables-hint">
              点击变量按钮，会插入到目前正在编辑的信息框。
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

          {STAGES.map((stage) => (
            <label className="reply-form-label message-preset-stage-field" key={stage}>
              <span className="message-preset-stage-label">{stage}</span>
              <span className="message-preset-stage-hint">{STAGE_HINTS[stage]}</span>
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
          <div className="message-preset-save-row">
            <div className="message-preset-save-status">
              {feedback ? <span className="reply-form-saved">{feedback}</span> : null}
              {error ? <span className="reply-form-error">{error}</span> : null}
            </div>
            <button type="button" className="reply-form-submit message-preset-save" onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save Preset"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
