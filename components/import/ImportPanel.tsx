"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Database,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { createAiImportPrompt } from "@/domain/import/ai-prompt";
import { normalizeImportSourceUrls } from "@/domain/import/url-normalization";
import {
  formatSchemaIssues,
  registrationPayloadSchema,
  type ImportItem,
  type ImportPayload,
} from "@/domain/import/schema";
import type { TimelineItem, TimelineTrack } from "@/domain/timeline/types";
import { DirectImportForm } from "./DirectImportForm";

interface PreviewCandidate {
  index: number;
  fingerprint: string;
  item: TimelineItem;
  warnings: string[];
  duplicates: Array<{ id: string; title: string; reason: string }>;
}

interface ValidationError {
  path: string;
  message: string;
}

interface ImportPanelProps {
  open: boolean;
  tracks: TimelineTrack[];
  onClose: () => void;
  onCommitted: (items: TimelineItem[]) => void;
}

type ImportStatus =
  | "idle"
  | "validating"
  | "ready"
  | "committing"
  | "complete";

export function ImportPanel({
  open,
  tracks = [],
  onClose,
  onCommitted,
}: ImportPanelProps) {
  const [payload, setPayload] = useState<ImportPayload>(() =>
    createInitialPayload(tracks),
  );
  const [jsonText, setJsonText] = useState(() =>
    serializePayload(createInitialPayload(tracks)),
  );
  const [validationPayload, setValidationPayload] =
    useState<ImportPayload | null>(null);
  const [candidates, setCandidates] = useState<PreviewCandidate[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");

  const duplicateCount = useMemo(
    () => candidates.reduce((sum, item) => sum + item.duplicates.length, 0),
    [candidates],
  );
  const warningCount = useMemo(
    () => candidates.reduce((sum, item) => sum + item.warnings.length, 0),
    [candidates],
  );
  const canRegister =
    status === "ready" &&
    candidates.length === 1 &&
    candidates[0].duplicates.length === 0;

  useEffect(() => {
    if (!open || !validationPayload) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/import/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validationPayload),
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          ok: boolean;
          errors?: ValidationError[];
          preview?: { candidates: PreviewCandidate[] };
          message?: string;
        };

        if (!result.ok || !result.preview) {
          setErrors(
            result.errors ?? [
              { path: "root", message: result.message ?? "검증 실패" },
            ],
          );
          setCandidates([]);
          setStatus("idle");
          return;
        }

        setErrors([]);
        setCandidates(result.preview.candidates);
        setStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrors([{ path: "root", message: "검증 요청에 실패했습니다." }]);
        setCandidates([]);
        setStatus("idle");
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, validationPayload]);

  if (!open) return null;

  function queueValidation(nextPayload: unknown) {
    const parsed = registrationPayloadSchema.safeParse(nextPayload);
    if (!parsed.success) {
      setValidationPayload(null);
      setCandidates([]);
      setErrors(formatSchemaIssues(parsed.error));
      setStatus("idle");
      return null;
    }

    setValidationPayload(parsed.data);
    setErrors([]);
    setCandidates([]);
    setStatus("validating");
    return parsed.data;
  }

  function updatePayload(nextPayload: ImportPayload) {
    if (status === "committing") return;
    setPayload(nextPayload);
    setJsonText(serializePayload(nextPayload));
    setMessage("");
    queueValidation(nextPayload);
  }

  function updateItem(nextItem: ImportItem) {
    updatePayload({ ...payload, items: [nextItem] });
  }

  function updateJson(nextText: string) {
    if (status === "committing") return;
    setJsonText(nextText);
    setMessage("");

    let nextPayload: unknown;
    try {
      nextPayload = JSON.parse(nextText);
    } catch {
      setValidationPayload(null);
      setCandidates([]);
      setErrors([{ path: "root", message: "JSON 문법을 확인하세요." }]);
      setStatus("idle");
      return;
    }

    const normalized = normalizeImportSourceUrls(nextPayload);
    const parsed = queueValidation(normalized.value);
    if (parsed) {
      setPayload(parsed);
      if (normalized.normalizedCount > 0) {
        setJsonText(serializePayload(parsed));
        setMessage(
          `출처 URL ${normalized.normalizedCount}개에서 Markdown 링크 표기를 순수 주소로 정리했습니다.`,
        );
      }
    }
  }

  async function commit() {
    if (!validationPayload || !canRegister) return;

    setStatus("committing");
    setMessage("");
    try {
      const response = await fetch("/api/admin/import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validationPayload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        results?: Array<{
          status: "published" | "duplicate" | "failed";
          item?: TimelineItem;
        }>;
      };

      if (!result.ok) {
        setMessage(result.message ?? "등록에 실패했습니다.");
        setStatus("ready");
        return;
      }

      const results = result.results ?? [];
      const publishedItems = results
        .filter(
          (entry): entry is { status: "published"; item: TimelineItem } =>
            entry.status === "published" && Boolean(entry.item),
        )
        .map((entry) => entry.item);
      const failedCount = results.filter(
        (entry) => entry.status === "failed",
      ).length;
      const skippedCount = results.filter(
        (entry) => entry.status === "duplicate",
      ).length;

      onCommitted(publishedItems);
      setMessage(
        registrationMessage(publishedItems.length, skippedCount, failedCount),
      );

      if (publishedItems.length === 1) {
        const nextPayload = createInitialPayload(tracks);
        setPayload(nextPayload);
        setJsonText(serializePayload(nextPayload));
        setValidationPayload(null);
        setCandidates([]);
        setErrors([]);
        setStatus("complete");
      } else {
        setStatus("ready");
      }
    } catch {
      setMessage("등록 요청에 실패했습니다.");
      setStatus("ready");
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setMessage("현재 JSON을 복사했습니다.");
    } catch {
      setMessage("JSON을 복사하지 못했습니다.");
    }
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(createAiImportPrompt(payload, tracks));
      setMessage("AI 요청문과 현재 JSON을 복사했습니다.");
    } catch {
      setMessage("AI 요청문을 복사하지 못했습니다.");
    }
  }

  return (
    <div className="import-backdrop" role="presentation">
      <section
        aria-label="사건 등록"
        aria-modal="true"
        className="import-panel"
        role="dialog"
      >
        <header className="import-header">
          <div>
            <span className="eyebrow">NOTION</span>
            <h2>사건 등록</h2>
          </div>
          <div className="icon-actions">
            <button
              aria-label="닫기"
              onClick={onClose}
              title="닫기"
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          aria-busy={status === "committing"}
          className={`import-workspace${status === "committing" ? " is-busy" : ""}`}
        >
          <section aria-label="직접 입력" className="direct-editor-wrap">
            <header className="import-pane-header">
              <strong>직접 입력</strong>
            </header>
            <DirectImportForm
              item={payload.items[0]}
              onChange={updateItem}
              tracks={tracks}
            />
          </section>

          <section aria-label="JSON 입력" className="json-editor-wrap">
            <header className="json-editor-header">
              <label htmlFor="event-import-json">JSON</label>
              <div>
                <small>Schema 1.0 · 사건 1개</small>
                <button
                  aria-label="AI 요청문과 현재 JSON 복사"
                  className="ai-prompt-copy"
                  onClick={copyAiPrompt}
                  title="AI 요청문 + JSON 복사"
                  type="button"
                >
                  <Sparkles size={14} />
                </button>
                <button
                  aria-label="현재 JSON 복사"
                  onClick={copyJson}
                  title="현재 JSON 복사"
                  type="button"
                >
                  <Clipboard size={14} />
                </button>
              </div>
            </header>
            <textarea
              id="event-import-json"
              onChange={(event) => updateJson(event.target.value)}
              spellCheck={false}
              value={jsonText}
            />
          </section>
        </div>

        <div aria-live="polite" className="import-validation-summary">
          {status === "validating" ? (
            <span className="import-validation-state">
              <Loader2 className="spin" size={14} />
              검증 중
            </span>
          ) : null}
          {status === "ready" && !errors.length ? (
            <span className="import-validation-state is-valid">
              <CheckCircle2 size={14} />
              등록 가능
            </span>
          ) : null}

          {errors.length ? (
            <ul className="validation-list">
              {errors.map((error, index) => (
                <li key={error.path + index}>
                  <AlertTriangle size={15} />
                  <span>
                    <code>{error.path}</code>
                    {error.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {!errors.length && candidates.length ? (
            <div className="import-notices">
              {candidates.flatMap((candidate) => [
                ...candidate.warnings.map((warning, warningIndex) => (
                  <span key={`warning-${candidate.index}-${warningIndex}`}>
                    <AlertTriangle size={13} />
                    {candidate.item.title}: {warning}
                  </span>
                )),
                ...candidate.duplicates.map((duplicate) => (
                  <span
                    className="is-duplicate"
                    key={`duplicate-${candidate.index}-${duplicate.id}`}
                  >
                    <Database size={13} />
                    {candidate.item.title}: 중복 후보 · {duplicate.title}
                  </span>
                )),
              ])}
            </div>
          ) : null}
        </div>

        {message ? <div className="import-message">{message}</div> : null}

        <footer className="import-footer">
          <span>{footerStatus(status, errors, warningCount, duplicateCount)}</span>
          <button
            className="primary-command"
            disabled={!canRegister}
            onClick={commit}
            type="button"
          >
            {status === "committing" ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <Database size={16} />
            )}
            Notion에 등록
          </button>
        </footer>
      </section>
    </div>
  );
}

function createInitialPayload(tracks: TimelineTrack[]): ImportPayload {
  return {
    schemaVersion: "1.0",
    items: [createBlankItem(tracks[0]?.key ?? "world-history")],
  };
}

function createBlankItem(trackKey: string): ImportItem {
  return {
    title: "",
    type: "event",
    time: {
      start: {
        year: 1950,
        era: "CE",
        month: null,
        day: null,
        precision: "year",
      },
      end: null,
      basis: "point",
    },
    trackKeys: [trackKey],
    tags: [],
    importance: "major",
    summary: "",
    detailMarkdown: "",
    recordLevel: "simple",
    confidence: "medium",
    uncertaintyNote: null,
    location: null,
    sources: [],
  };
}

function serializePayload(payload: ImportPayload) {
  return JSON.stringify(payload, null, 2);
}

function footerStatus(
  status: ImportStatus,
  errors: ValidationError[],
  warningCount: number,
  duplicateCount: number,
) {
  if (status === "committing") return "Notion에 등록 중";
  if (status === "complete") return "등록 완료 · 다음 사건 입력 가능";
  if (status === "validating") return "입력 내용 검증 중";
  if (errors.length) return `오류 ${errors.length}개`;
  if (status === "ready") {
    return `사건 1개 · 경고 ${warningCount}개 · 중복 ${duplicateCount}개`;
  }
  return "사건 1개 · 스키마 1.0";
}

function registrationMessage(
  publishedCount: number,
  skippedCount: number,
  failedCount: number,
) {
  const parts = [`${publishedCount}개 등록`];
  if (skippedCount) parts.push(`${skippedCount}개 중복 제외`);
  if (failedCount) parts.push(`${failedCount}개 실패`);
  return parts.join(" · ");
}
