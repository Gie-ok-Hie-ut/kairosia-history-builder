"use client";

import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Eye,
  EyeOff,
  ExternalLink,
  Link2,
  MapPin,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { formatHistoricalRange } from "@/domain/timeline/historical-date";
import { createGoogleMapsUrl } from "@/domain/timeline/location";
import type {
  TimelineItem,
  TimelineTrack,
  TimelineVisibility,
} from "@/domain/timeline/types";
import type { TimelineItemUpdate } from "@/domain/timeline/update-schema";
import { EventMap } from "./EventMap";

interface DetailPanelProps {
  item: TimelineItem | null;
  tracks: TimelineTrack[];
  onBookmarkChange?: (
    itemId: string,
    bookmarked: boolean,
  ) => Promise<TimelineItem>;
  onDelete?: (itemId: string) => Promise<void>;
  onVisibilityChange?: (
    itemId: string,
    visibility: TimelineVisibility,
  ) => Promise<TimelineItem>;
  onUpdate?: (
    itemId: string,
    input: TimelineItemUpdate,
  ) => Promise<TimelineItem>;
}

const TYPE_LABELS: Record<TimelineItem["type"], string> = {
  event: "사건",
  person: "인물",
  book: "저작",
  idea: "사상",
  organization: "조직",
  technology: "기술",
};

const IMPORTANCE_LABELS: Record<TimelineItem["importance"], string> = {
  core: "핵심",
  major: "주요",
  detail: "세부",
};

const CONFIDENCE_LABELS: Record<TimelineItem["confidence"], string> = {
  high: "신뢰 높음",
  medium: "신뢰 중간",
  low: "신뢰 낮음",
  disputed: "논쟁적",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as Array<
  [TimelineItem["type"], string]
>;
const IMPORTANCE_OPTIONS = Object.entries(IMPORTANCE_LABELS) as Array<
  [TimelineItem["importance"], string]
>;
const CONFIDENCE_OPTIONS = Object.entries(CONFIDENCE_LABELS) as Array<
  [TimelineItem["confidence"], string]
>;

export function DetailPanel({
  item,
  tracks,
  onBookmarkChange,
  onDelete,
  onVisibilityChange,
  onUpdate,
}: DetailPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [visibilityChanging, setVisibilityChanging] = useState(false);
  const [visibilityError, setVisibilityError] = useState("");
  const [bookmarkChanging, setBookmarkChanging] = useState(false);
  const [bookmarkError, setBookmarkError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [draft, setDraft] = useState<TimelineItemUpdate | null>(() =>
    item ? createEditDraft(item) : null,
  );

  if (!item) {
    return (
      <aside className="detail-panel detail-panel-empty">
        <CircleHelp aria-hidden="true" size={20} />
        <strong>선택된 항목 없음</strong>
      </aside>
    );
  }

  const itemTracks = tracks.filter((track) =>
    item.trackKeys.includes(track.key),
  );

  async function handleDelete() {
    if (!item || !onDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await onDelete(item.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !draft || !onUpdate) return;
    setSaving(true);
    setEditError("");
    try {
      const updated = await onUpdate(item.id, draft);
      setDraft(createEditDraft(updated));
      setTagInput("");
      setEditing(false);
      setSaving(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "수정에 실패했습니다.");
      setSaving(false);
    }
  }

  async function handleVisibilityChange() {
    if (!item || !onVisibilityChange) return;
    setVisibilityChanging(true);
    setVisibilityError("");
    try {
      await onVisibilityChange(
        item.id,
        item.visibility === "hidden" ? "published" : "hidden",
      );
    } catch (error) {
      setVisibilityError(
        error instanceof Error
          ? error.message
          : "표시 상태 변경에 실패했습니다.",
      );
    } finally {
      setVisibilityChanging(false);
    }
  }

  async function handleBookmarkChange() {
    if (!item || !onBookmarkChange) return;
    setBookmarkChanging(true);
    setBookmarkError("");
    try {
      await onBookmarkChange(item.id, !item.bookmarked);
    } catch (error) {
      setBookmarkError(
        error instanceof Error
          ? error.message
          : "북마크 상태 변경에 실패했습니다.",
      );
    } finally {
      setBookmarkChanging(false);
    }
  }

  function cancelEditing() {
    if (saving || !item) return;
    setDraft(createEditDraft(item));
    setTagInput("");
    setEditError("");
    setEditing(false);
  }

  function toggleDraftTrack(trackKey: string) {
    setDraft((current) => {
      if (!current) return current;
      const active = current.trackKeys.includes(trackKey);
      if (active && current.trackKeys.length === 1) return current;
      return {
        ...current,
        trackKeys: active
          ? current.trackKeys.filter((key) => key !== trackKey)
          : [...current.trackKeys, trackKey],
      };
    });
  }

  function addTags() {
    if (!draft) return;
    const candidates = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!candidates.length) return;

    const known = new Set(draft.tags.map((tag) => tag.toLocaleLowerCase()));
    const additions = candidates.filter((tag) => {
      const normalized = tag.toLocaleLowerCase();
      if (known.has(normalized)) return false;
      known.add(normalized);
      return true;
    });
    setDraft({ ...draft, tags: [...draft.tags, ...additions].slice(0, 30) });
    setTagInput("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addTags();
  }

  return (
    <aside className="detail-panel">
      <div className="detail-kicker">
        <span>{editing ? "항목 편집" : TYPE_LABELS[item.type]}</span>
        <div className="detail-kicker-actions">
          {!editing ? (
            <span className={"confidence confidence-" + item.confidence}>
              {CONFIDENCE_LABELS[item.confidence]}
            </span>
          ) : null}
          {item.visibility === "hidden" && !editing ? (
            <span className="visibility-badge">숨김</span>
          ) : null}
          {onBookmarkChange && !editing ? (
            <button
              aria-label={
                item.bookmarked ? "북마크에서 제거" : "북마크에 추가"
              }
              aria-pressed={item.bookmarked}
              className={
                "detail-bookmark-trigger" +
                (item.bookmarked ? " is-active" : "")
              }
              disabled={bookmarkChanging}
              onClick={handleBookmarkChange}
              title={item.bookmarked ? "북마크에서 제거" : "북마크에 추가"}
              type="button"
            >
              {bookmarkChanging ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Bookmark
                  fill={item.bookmarked ? "currentColor" : "none"}
                  size={14}
                />
              )}
            </button>
          ) : null}
          {onVisibilityChange && !editing ? (
            <button
              aria-label={
                item.visibility === "hidden"
                  ? "선택한 항목 다시 보이기"
                  : "선택한 항목 숨기기"
              }
              className={
                "detail-visibility-trigger" +
                (item.visibility === "hidden" ? " is-hidden" : "")
              }
              disabled={visibilityChanging}
              onClick={handleVisibilityChange}
              title={
                item.visibility === "hidden"
                  ? "연표에 다시 표시"
                  : "연표에서 숨기기"
              }
              type="button"
            >
              {visibilityChanging ? (
                <LoaderCircle className="spin" size={14} />
              ) : item.visibility === "hidden" ? (
                <Eye size={14} />
              ) : (
                <EyeOff size={14} />
              )}
            </button>
          ) : null}
          {onUpdate && !editing ? (
            <button
              aria-label="선택한 항목 편집"
              className="detail-edit-trigger"
              onClick={() => {
                setConfirmDelete(false);
                setEditing(true);
              }}
              title="항목 편집"
              type="button"
            >
              <Pencil size={14} />
            </button>
          ) : null}
          {onDelete && !editing ? (
            <button
              aria-label="선택한 항목 삭제"
              className="detail-delete-trigger"
              onClick={() => setConfirmDelete(true)}
              title="Notion에서 삭제"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {visibilityError ? (
        <p className="detail-visibility-error" role="alert">
          {visibilityError}
        </p>
      ) : null}

      {bookmarkError ? (
        <p className="detail-bookmark-error" role="alert">
          {bookmarkError}
        </p>
      ) : null}

      {confirmDelete ? (
        <div className="detail-delete-confirm" role="alertdialog">
          <span>Notion 휴지통으로 이동합니다.</span>
          <div>
            <button
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
              type="button"
            >
              취소
            </button>
            <button disabled={deleting} onClick={handleDelete} type="button">
              {deleting ? "삭제 중" : "삭제"}
            </button>
          </div>
          {deleteError ? <small>{deleteError}</small> : null}
        </div>
      ) : null}

      {editing && draft ? (
        <form className="detail-edit-form" onSubmit={handleSave}>
          <label className="detail-edit-field">
            <span>제목</span>
            <input
              maxLength={200}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              required
              value={draft.title}
            />
          </label>

          <div className="detail-edit-row">
            <label className="detail-edit-field">
              <span>유형</span>
              <select
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    type: event.target.value as TimelineItem["type"],
                  })
                }
                value={draft.type}
              >
                {TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="detail-edit-field">
              <span>중요도</span>
              <select
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    importance: event.target.value as TimelineItem["importance"],
                  })
                }
                value={draft.importance}
              >
                {IMPORTANCE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="detail-edit-field">
            <span>요약</span>
            <textarea
              maxLength={280}
              onChange={(event) =>
                setDraft({ ...draft, summary: event.target.value })
              }
              required
              rows={4}
              value={draft.summary}
            />
          </label>

          <fieldset className="detail-edit-group">
            <legend>분류</legend>
            <div className="detail-edit-tracks">
              {tracks.map((track) => {
                const active = draft.trackKeys.includes(track.key);
                return (
                  <label key={track.key}>
                    <input
                      checked={active}
                      disabled={active && draft.trackKeys.length === 1}
                      onChange={() => toggleDraftTrack(track.key)}
                      type="checkbox"
                    />
                    <i style={{ background: track.color }} />
                    <span>{track.name}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="detail-edit-group">
            <legend>태그</legend>
            {draft.tags.length ? (
              <div className="detail-edit-tags">
                {draft.tags.map((tag) => (
                  <span key={tag}>
                    {tag}
                    <button
                      aria-label={`${tag} 태그 제거`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tags: draft.tags.filter((entry) => entry !== tag),
                        })
                      }
                      title="태그 제거"
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="detail-edit-tag-entry">
              <input
                maxLength={60}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="태그 입력"
                value={tagInput}
              />
              <button
                aria-label="태그 추가"
                disabled={!tagInput.trim() || draft.tags.length >= 30}
                onClick={addTags}
                title="태그 추가"
                type="button"
              >
                <Plus size={14} />
              </button>
            </div>
          </fieldset>

          <label className="detail-edit-field">
            <span>신뢰도</span>
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  confidence: event.target.value as TimelineItem["confidence"],
                })
              }
              value={draft.confidence}
            >
              {CONFIDENCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {draft.confidence === "disputed" || draft.uncertaintyNote ? (
            <label className="detail-edit-field">
              <span>불확실성</span>
              <textarea
                maxLength={1_000}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    uncertaintyNote: event.target.value || null,
                  })
                }
                required={draft.confidence === "disputed"}
                rows={3}
                value={draft.uncertaintyNote ?? ""}
              />
            </label>
          ) : null}

          {editError ? <p className="detail-edit-error">{editError}</p> : null}
          <div className="detail-edit-actions">
            <button disabled={saving} onClick={cancelEditing} type="button">
              <X size={14} />
              취소
            </button>
            <button disabled={saving} type="submit">
              <Save size={14} />
              {saving ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2>{item.title}</h2>
          <div className="detail-date">
            <CalendarDays aria-hidden="true" size={15} />
            {formatHistoricalRange(item.time)}
          </div>
          <p className="detail-summary">{item.summary}</p>

          <section className="detail-section">
            <h3>
              <BookOpen aria-hidden="true" size={15} />
              상세
            </h3>
            <p>{item.detail || item.summary}</p>
          </section>

          {item.uncertaintyNote ? (
            <section className="detail-section">
              <h3>
                <CircleHelp aria-hidden="true" size={15} />
                불확실성
              </h3>
              <p>{item.uncertaintyNote}</p>
            </section>
          ) : null}

          <section className="detail-section">
            <h3>
              <Tags aria-hidden="true" size={15} />
              분류
            </h3>
            <div className="detail-chips">
              {itemTracks.map((track) => (
                <span key={track.key}>
                  <i style={{ background: track.color }} />
                  {track.name}
                </span>
              ))}
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          {item.locations?.length ? (
            <section className="detail-section detail-location-section">
              <h3>
                <MapPin aria-hidden="true" size={15} />
                위치
              </h3>
              <EventMap locations={item.locations} title={item.title} />
              <div className="detail-location-links">
                {item.locations.map((location, index) => (
                  <a
                    href={createGoogleMapsUrl(location)}
                    key={`${location.latitude}:${location.longitude}:${index}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{location.name}</span>
                    <ExternalLink aria-hidden="true" size={12} />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail-section">
            <h3>
              <Link2 aria-hidden="true" size={15} />
              출처
            </h3>
            {item.sources?.length ? (
              <ul className="source-list">
                {item.sources.map((source, index) => (
                  <li key={source.title + index}>
                    {source.url ? (
                      <a href={source.url} rel="noreferrer" target="_blank">
                        {source.title}
                        <ExternalLink aria-hidden="true" size={12} />
                      </a>
                    ) : (
                      <span>{source.title}</span>
                    )}
                    {source.author ? <small>{source.author}</small> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail-muted">출처 미입력</p>
            )}
          </section>
        </>
      )}
    </aside>
  );
}

function createEditDraft(item: TimelineItem): TimelineItemUpdate {
  return {
    title: item.title,
    type: item.type,
    trackKeys: [...item.trackKeys],
    tags: [...item.tags],
    importance: item.importance,
    summary: item.summary,
    confidence: item.confidence,
    uncertaintyNote: item.uncertaintyNote ?? null,
  };
}
