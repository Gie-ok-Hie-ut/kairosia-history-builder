import type { TimelineTrack } from "./types";

export function reorderVisibleTracks(
  tracks: TimelineTrack[],
  activeTrackKeys: string[],
  activeKey: string,
  overKey: string,
): TimelineTrack[] {
  const activeKeySet = new Set(activeTrackKeys);
  const visibleTracks = tracks.filter((track) => activeKeySet.has(track.key));
  const oldIndex = visibleTracks.findIndex((track) => track.key === activeKey);
  const newIndex = visibleTracks.findIndex((track) => track.key === overKey);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return tracks;

  const reorderedVisible = [...visibleTracks];
  const [moved] = reorderedVisible.splice(oldIndex, 1);
  reorderedVisible.splice(newIndex, 0, moved);

  let visibleIndex = 0;
  return tracks
    .map((track) =>
      activeKeySet.has(track.key) ? reorderedVisible[visibleIndex++] : track,
    )
    .map((track, index) => ({ ...track, order: index + 1 }));
}
