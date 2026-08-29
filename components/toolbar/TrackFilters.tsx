"use client";

import { useRef, useState } from "react";
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
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TimelineTrack } from "@/domain/timeline/types";

interface TrackFiltersProps {
  activeTrackKeys: string[];
  onOrderChange: (tracks: TimelineTrack[]) => void;
  onToggle: (track: TimelineTrack) => void;
  reorderEnabled: boolean;
  tracks: TimelineTrack[];
}

export function TrackFilters({
  activeTrackKeys,
  onOrderChange,
  onToggle,
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

  async function handleDragEnd(event: DragEndEvent) {
    if (
      !reorderEnabled ||
      savingRef.current ||
      !event.over ||
      event.active.id === event.over.id
    ) {
      return;
    }

    const oldIndex = tracks.findIndex(
      (track) => track.key === String(event.active.id),
    );
    const newIndex = tracks.findIndex(
      (track) => track.key === String(event.over?.id),
    );
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = tracks;
    const next = arrayMove(previous, oldIndex, newIndex).map((track, index) => ({
      ...track,
      order: index + 1,
    }));
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
          items={tracks.map((track) => track.key)}
          strategy={horizontalListSortingStrategy}
        >
          {tracks.map((track) => (
            <SortableTrackFilter
              active={activeTrackKeys.includes(track.key)}
              dragDisabled={saving}
              dragError={error}
              key={track.key}
              onToggle={() => onToggle(track)}
              reorderEnabled={reorderEnabled}
              toggleDisabled={
                activeTrackKeys.includes(track.key) &&
                activeTrackKeys.length === 1
              }
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

interface SortableTrackFilterProps {
  active: boolean;
  dragDisabled: boolean;
  dragError: string;
  onToggle: () => void;
  reorderEnabled: boolean;
  toggleDisabled: boolean;
  track: TimelineTrack;
}

function SortableTrackFilter({
  active,
  dragDisabled,
  dragError,
  onToggle,
  reorderEnabled,
  toggleDisabled,
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
      <label title={track.description || track.name}>
        <input
          checked={active}
          disabled={toggleDisabled}
          onChange={onToggle}
          type="checkbox"
        />
        <i style={{ backgroundColor: track.color }} />
        <span>{track.name}</span>
      </label>
    </div>
  );
}
