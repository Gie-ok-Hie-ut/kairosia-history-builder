"use client";

import { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Layers3 } from "lucide-react";
import { reorderVisibleTracks } from "@/domain/timeline/track-order";
import type { TimelineTrack } from "@/domain/timeline/types";

interface TrackFiltersProps {
  activeTrackKeys: string[];
  onOrderChange: (tracks: TimelineTrack[]) => void;
  reorderEnabled: boolean;
  tracks: TimelineTrack[];
}

export function TrackFilters({
  activeTrackKeys,
  onOrderChange,
  reorderEnabled,
  tracks,
}: TrackFiltersProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeKeySet = new Set(activeTrackKeys);
  const visibleTracks = tracks.filter((track) => activeKeySet.has(track.key));

  async function handleDragEnd(event: DragEndEvent) {
    if (
      !reorderEnabled ||
      savingRef.current ||
      !event.over ||
      event.active.id === event.over.id
    ) {
      return;
    }

    const previous = tracks;
    const next = reorderVisibleTracks(
      tracks,
      activeTrackKeys,
      String(event.active.id),
      String(event.over.id),
    );
    savingRef.current = true;
    setSaving(true);
    setError("");
    onOrderChange(next);

    try {
      const response = await fetch("/api/admin/tracks/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackKeys: next.map((track) => track.key) }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; tracks?: TimelineTrack[]; message?: string }
        | null;
      if (!response.ok || !result?.ok || !result.tracks) {
        throw new Error(result?.message ?? "Track 순서 저장에 실패했습니다.");
      }
      onOrderChange([...result.tracks].sort((a, b) => a.order - b.order));
    } catch (caught) {
      onOrderChange(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : "Track 순서 저장에 실패했습니다.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
        sensors={sensors}
      >
        <SortableContext
          items={visibleTracks.map((track) => track.key)}
          strategy={horizontalListSortingStrategy}
        >
          {visibleTracks.map((track) => (
            <SortableTrackFilter
              dragDisabled={saving}
              dragError={error}
              key={track.key}
              reorderEnabled={reorderEnabled}
              track={track}
            />
          ))}
        </SortableContext>
      </DndContext>
      <span className="sr-only" role="status">
        {saving ? "Track 순서를 저장하는 중입니다." : error}
      </span>
    </>
  );
}

interface TrackVisibilityMenuProps {
  activeTrackKeys: string[];
  onChange: (trackKeys: string[]) => void;
  tracks: TimelineTrack[];
}

export function TrackVisibilityMenu({
  activeTrackKeys,
  onChange,
  tracks,
}: TrackVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggleTrack(trackKey: string) {
    if (activeTrackKeys.includes(trackKey)) {
      if (activeTrackKeys.length === 1) return;
      onChange(activeTrackKeys.filter((key) => key !== trackKey));
      return;
    }
    onChange(
      tracks
        .filter(
          (track) =>
            activeTrackKeys.includes(track.key) || track.key === trackKey,
        )
        .map((track) => track.key),
    );
  }

  return (
    <div className="track-visibility-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={"track-menu-trigger" + (open ? " is-open" : "")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Layers3 aria-hidden="true" size={15} />
        <span>트랙</span>
        <small>
          {activeTrackKeys.length}/{tracks.length}
        </small>
        <ChevronDown aria-hidden="true" size={13} />
      </button>

      {open ? (
        <div aria-label="트랙 표시 설정" className="track-menu-popover" role="dialog">
          <div className="track-menu-head">
            <strong>표시할 트랙</strong>
            <button
              disabled={activeTrackKeys.length === tracks.length}
              onClick={() => onChange(tracks.map((track) => track.key))}
              type="button"
            >
              전체 표시
            </button>
          </div>
          <div className="track-menu-options">
            {tracks.map((track) => {
              const active = activeTrackKeys.includes(track.key);
              return (
                <label key={track.key} title={track.description || track.name}>
                  <input
                    checked={active}
                    disabled={active && activeTrackKeys.length === 1}
                    onChange={() => toggleTrack(track.key)}
                    type="checkbox"
                  />
                  <i style={{ backgroundColor: track.color }} />
                  <span>{track.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface SortableTrackFilterProps {
  dragDisabled: boolean;
  dragError: string;
  reorderEnabled: boolean;
  track: TimelineTrack;
}

function SortableTrackFilter({
  dragDisabled,
  dragError,
  reorderEnabled,
  track,
}: SortableTrackFilterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: track.key,
    disabled: !reorderEnabled || dragDisabled,
  });

  return (
    <div
      className={
        "track-order-item" +
        (reorderEnabled ? " can-reorder" : "") +
        (isDragging ? " is-dragging" : "") +
        (dragError ? " has-order-error" : "")
      }
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {reorderEnabled ? (
        <button
          {...attributes}
          {...listeners}
          aria-label={`${track.name} 순서 변경`}
          className="track-drag-handle"
          disabled={dragDisabled}
          title={dragError || `${track.name} 드래그하여 순서 변경`}
          type="button"
        >
          <GripVertical aria-hidden="true" size={13} />
        </button>
      ) : null}
      <div className="track-chip-content" title={track.description || track.name}>
        <i style={{ backgroundColor: track.color }} />
        <span>{track.name}</span>
      </div>
    </div>
  );
}
