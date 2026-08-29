"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { ImportItem } from "@/domain/import/schema";
import type { TimelineTrack } from "@/domain/timeline/types";

interface DirectImportFormProps {
  item: ImportItem;
  tracks: TimelineTrack[];
  onChange: (item: ImportItem) => void;
}

const TYPE_OPTIONS = [
  ["event", "사건"],
  ["person", "인물"],
  ["book", "저작"],
  ["idea", "사상"],
  ["organization", "조직"],
  ["technology", "기술"],
] as const;

const PRECISION_OPTIONS = [
  ["exact", "정확한 날짜"],
  ["year", "연도"],
  ["decade", "연대"],
  ["century", "세기"],
  ["estimated", "추정"],
] as const;

const BASIS_OPTIONS = [
  ["point", "시점"],
  ["duration", "기간"],
  ["lifespan", "생애"],
  ["activity", "활동기"],
  ["publication", "발표·출간"],
  ["existence", "존속 기간"],
] as const;

const IMPORTANCE_OPTIONS = [
  ["core", "핵심"],
  ["major", "주요"],
  ["detail", "세부"],
] as const;

const RECORD_LEVEL_OPTIONS = [
  ["simple", "간단"],
  ["standard", "보통"],
  ["rigorous", "엄밀"],
] as const;

const CONFIDENCE_OPTIONS = [
  ["high", "신뢰 높음"],
  ["medium", "신뢰 중간"],
  ["low", "신뢰 낮음"],
  ["disputed", "논쟁적"],
] as const;

const SOURCE_TYPE_OPTIONS = [
  ["primary", "1차 자료"],
  ["secondary", "2차 자료"],
  ["reference", "참고 자료"],
  ["web", "웹"],
] as const;

export function DirectImportForm({
  item,
  tracks,
  onChange,
}: DirectImportFormProps) {
  const [tagInput, setTagInput] = useState("");

  function patch(next: Partial<ImportItem>) {
    onChange({ ...item, ...next });
  }

  function patchStart(next: Partial<ImportItem["time"]["start"]>) {
    patch({
      time: {
        ...item.time,
        start: { ...item.time.start, ...next },
      },
    });
  }

  function patchEnd(next: Partial<NonNullable<ImportItem["time"]["end"]>>) {
    if (!item.time.end) return;
    patch({
      time: {
        ...item.time,
        end: { ...item.time.end, ...next },
      },
    });
  }

  function toggleTrack(trackKey: string) {
    const active = item.trackKeys.includes(trackKey);
    if (active && item.trackKeys.length === 1) return;
    patch({
      trackKeys: active
        ? item.trackKeys.filter((key) => key !== trackKey)
        : [...item.trackKeys, trackKey],
    });
  }

  function addTags() {
    const candidates = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!candidates.length) return;
    const known = new Set(item.tags.map((tag) => tag.toLocaleLowerCase()));
    const additions = candidates.filter((tag) => {
      const normalized = tag.toLocaleLowerCase();
      if (known.has(normalized)) return false;
      known.add(normalized);
      return true;
    });
    patch({ tags: [...item.tags, ...additions].slice(0, 30) });
    setTagInput("");
  }

  function updateSource(
    index: number,
    next: Partial<ImportItem["sources"][number]>,
  ) {
    patch({
      sources: item.sources.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, ...next } : source,
      ),
    });
  }

  return (
    <div className="event-form">
      <section className="event-form-section">
        <h3>기본 정보</h3>
        <div className="event-form-grid event-form-grid-basic">
          <label className="event-form-field event-form-field-wide">
            <span>제목</span>
            <input
              maxLength={200}
              onChange={(event) => patch({ title: event.target.value })}
              required
              value={item.title}
            />
          </label>
          <label className="event-form-field">
            <span>유형</span>
            <select
              onChange={(event) =>
                patch({ type: event.target.value as ImportItem["type"] })
              }
              value={item.type}
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="event-form-field">
            <span>중요도</span>
            <select
              onChange={(event) =>
                patch({
                  importance: event.target.value as ImportItem["importance"],
                })
              }
              value={item.importance}
            >
              {IMPORTANCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="event-form-section">
        <div className="event-form-section-head">
          <h3>시간</h3>
          <label className="event-form-toggle">
            <input
              checked={Boolean(item.time.end)}
              onChange={(event) =>
                patch({
                  time: {
                    ...item.time,
                    end: event.target.checked
                      ? { ...item.time.start, month: null, day: null }
                      : null,
                    basis: event.target.checked ? "duration" : "point",
                  },
                })
              }
              type="checkbox"
            />
            종료 시점
          </label>
        </div>

        <div className="event-form-time-block">
          <strong>시작</strong>
          <div className="event-form-grid event-form-grid-time">
            <label className="event-form-field">
              <span>기원</span>
              <select
                onChange={(event) =>
                  patchStart({ era: event.target.value as "BCE" | "CE" })
                }
                value={item.time.start.era}
              >
                <option value="BCE">기원전</option>
                <option value="CE">서기</option>
              </select>
            </label>
            <label className="event-form-field">
              <span>연도</span>
              <input
                min={1}
                onChange={(event) =>
                  patchStart({ year: numberValue(event.target.value, 1) })
                }
                type="number"
                value={item.time.start.year}
              />
            </label>
            <label className="event-form-field">
              <span>정밀도</span>
              <select
                onChange={(event) =>
                  patchStart({
                    precision: event.target
                      .value as ImportItem["time"]["start"]["precision"],
                    ...(event.target.value !== "exact"
                      ? { month: null, day: null }
                      : {}),
                  })
                }
                value={item.time.start.precision}
              >
                {PRECISION_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {item.time.start.precision === "exact" ? (
              <>
                <label className="event-form-field">
                  <span>월</span>
                  <input
                    max={12}
                    min={1}
                    onChange={(event) =>
                      patchStart({ month: optionalNumber(event.target.value) })
                    }
                    type="number"
                    value={item.time.start.month ?? ""}
                  />
                </label>
                <label className="event-form-field">
                  <span>일</span>
                  <input
                    max={31}
                    min={1}
                    onChange={(event) =>
                      patchStart({ day: optionalNumber(event.target.value) })
                    }
                    type="number"
                    value={item.time.start.day ?? ""}
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        {item.time.end ? (
          <div className="event-form-time-block">
            <strong>종료</strong>
            <div className="event-form-grid event-form-grid-time">
              <label className="event-form-field">
                <span>기원</span>
                <select
                  onChange={(event) =>
                    patchEnd({ era: event.target.value as "BCE" | "CE" })
                  }
                  value={item.time.end.era}
                >
                  <option value="BCE">기원전</option>
                  <option value="CE">서기</option>
                </select>
              </label>
              <label className="event-form-field">
                <span>연도</span>
                <input
                  min={1}
                  onChange={(event) =>
                    patchEnd({ year: numberValue(event.target.value, 1) })
                  }
                  type="number"
                  value={item.time.end.year}
                />
              </label>
              <label className="event-form-field">
                <span>정밀도</span>
                <select
                  onChange={(event) =>
                    patchEnd({
                      precision: event.target
                        .value as ImportItem["time"]["start"]["precision"],
                      ...(event.target.value !== "exact"
                        ? { month: null, day: null }
                        : {}),
                    })
                  }
                  value={item.time.end.precision}
                >
                  {PRECISION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {item.time.end.precision === "exact" ? (
                <>
                  <label className="event-form-field">
                    <span>월</span>
                    <input
                      max={12}
                      min={1}
                      onChange={(event) =>
                        patchEnd({ month: optionalNumber(event.target.value) })
                      }
                      type="number"
                      value={item.time.end.month ?? ""}
                    />
                  </label>
                  <label className="event-form-field">
                    <span>일</span>
                    <input
                      max={31}
                      min={1}
                      onChange={(event) =>
                        patchEnd({ day: optionalNumber(event.target.value) })
                      }
                      type="number"
                      value={item.time.end.day ?? ""}
                    />
                  </label>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <label className="event-form-field event-form-basis">
          <span>시간 성격</span>
          <select
            onChange={(event) =>
              patch({
                time: {
                  ...item.time,
                  basis: event.target.value as ImportItem["time"]["basis"],
                },
              })
            }
            value={item.time.basis}
          >
            {BASIS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="event-form-section">
        <h3>분류</h3>
        <fieldset className="event-form-group">
          <legend>역사 Track</legend>
          <div className="event-form-tracks">
            {tracks.map((track) => {
              const active = item.trackKeys.includes(track.key);
              return (
                <label key={track.key}>
                  <input
                    checked={active}
                    disabled={active && item.trackKeys.length === 1}
                    onChange={() => toggleTrack(track.key)}
                    type="checkbox"
                  />
                  <i style={{ background: track.color }} />
                  <span>{track.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="event-form-group">
          <legend>태그</legend>
          {item.tags.length ? (
            <div className="event-form-tags">
              {item.tags.map((tag) => (
                <span key={tag}>
                  {tag}
                  <button
                    aria-label={`${tag} 태그 제거`}
                    onClick={() =>
                      patch({ tags: item.tags.filter((entry) => entry !== tag) })
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
          <div className="event-form-tag-entry">
            <input
              maxLength={60}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== ",") return;
                event.preventDefault();
                addTags();
              }}
              placeholder="태그 입력"
              value={tagInput}
            />
            <button
              aria-label="태그 추가"
              disabled={!tagInput.trim() || item.tags.length >= 30}
              onClick={addTags}
              title="태그 추가"
              type="button"
            >
              <Plus size={14} />
            </button>
          </div>
        </fieldset>
      </section>

      <section className="event-form-section">
        <h3>설명</h3>
        <div className="event-form-grid">
          <label className="event-form-field">
            <span>기록 수준</span>
            <select
              onChange={(event) =>
                patch({
                  recordLevel: event.target.value as ImportItem["recordLevel"],
                })
              }
              value={item.recordLevel}
            >
              {RECORD_LEVEL_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="event-form-field">
            <span>신뢰도</span>
            <select
              onChange={(event) =>
                patch({
                  confidence: event.target.value as ImportItem["confidence"],
                })
              }
              value={item.confidence}
            >
              {CONFIDENCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="event-form-field event-form-field-wide">
            <span>요약</span>
            <textarea
              maxLength={280}
              onChange={(event) => patch({ summary: event.target.value })}
              required
              rows={3}
              value={item.summary}
            />
          </label>
          <label className="event-form-field event-form-field-wide">
            <span>상세 본문</span>
            <textarea
              maxLength={20_000}
              onChange={(event) =>
                patch({ detailMarkdown: event.target.value })
              }
              rows={7}
              value={item.detailMarkdown}
            />
          </label>
          {item.confidence === "disputed" || item.uncertaintyNote ? (
            <label className="event-form-field event-form-field-wide">
              <span>불확실성</span>
              <textarea
                maxLength={1_000}
                onChange={(event) =>
                  patch({ uncertaintyNote: event.target.value || null })
                }
                required={item.confidence === "disputed"}
                rows={3}
                value={item.uncertaintyNote ?? ""}
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="event-form-section">
        <div className="event-form-section-head">
          <h3>위치</h3>
          <label className="event-form-toggle">
            <input
              checked={Boolean(item.location)}
              onChange={(event) =>
                patch({
                  location: event.target.checked
                    ? {
                        name: "",
                        latitude: 0,
                        longitude: 0,
                        precision: "approximate",
                      }
                    : null,
                })
              }
              type="checkbox"
            />
            위치 표시
          </label>
        </div>
        {item.location ? (
          <div className="event-form-grid event-form-grid-location">
            <label className="event-form-field event-form-field-wide">
              <span>장소명</span>
              <input
                maxLength={200}
                onChange={(event) =>
                  patch({
                    location: { ...item.location!, name: event.target.value },
                  })
                }
                value={item.location.name}
              />
            </label>
            <label className="event-form-field">
              <span>위도</span>
              <input
                max={90}
                min={-90}
                onChange={(event) =>
                  patch({
                    location: {
                      ...item.location!,
                      latitude: numberValue(event.target.value, 0),
                    },
                  })
                }
                step="any"
                type="number"
                value={item.location.latitude}
              />
            </label>
            <label className="event-form-field">
              <span>경도</span>
              <input
                max={180}
                min={-180}
                onChange={(event) =>
                  patch({
                    location: {
                      ...item.location!,
                      longitude: numberValue(event.target.value, 0),
                    },
                  })
                }
                step="any"
                type="number"
                value={item.location.longitude}
              />
            </label>
            <label className="event-form-field">
              <span>정밀도</span>
              <select
                onChange={(event) =>
                  patch({
                    location: {
                      ...item.location!,
                      precision: event.target.value as "exact" | "approximate",
                    },
                  })
                }
                value={item.location.precision}
              >
                <option value="approximate">근사 위치</option>
                <option value="exact">정확한 위치</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="event-form-section">
        <div className="event-form-section-head">
          <h3>출처</h3>
          <button
            aria-label="출처 추가"
            className="event-form-add"
            disabled={item.sources.length >= 30}
            onClick={() =>
              patch({
                sources: [
                  ...item.sources,
                  {
                    type: "reference",
                    title: "",
                    author: null,
                    publishedYear: null,
                    url: null,
                    locator: null,
                    note: null,
                  },
                ],
              })
            }
            title="출처 추가"
            type="button"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="event-form-sources">
          {item.sources.map((source, index) => (
            <div className="event-form-source" key={index}>
              <div className="event-form-source-head">
                <strong>출처 {index + 1}</strong>
                <button
                  aria-label={`출처 ${index + 1} 제거`}
                  onClick={() =>
                    patch({
                      sources: item.sources.filter(
                        (_entry, sourceIndex) => sourceIndex !== index,
                      ),
                    })
                  }
                  title="출처 제거"
                  type="button"
                >
                  <Minus size={14} />
                </button>
              </div>
              <div className="event-form-grid event-form-grid-source">
                <label className="event-form-field">
                  <span>종류</span>
                  <select
                    onChange={(event) =>
                      updateSource(index, {
                        type: event.target
                          .value as ImportItem["sources"][number]["type"],
                      })
                    }
                    value={source.type}
                  >
                    {SOURCE_TYPE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="event-form-field event-form-field-grow">
                  <span>제목</span>
                  <input
                    maxLength={300}
                    onChange={(event) =>
                      updateSource(index, { title: event.target.value })
                    }
                    value={source.title}
                  />
                </label>
                <label className="event-form-field">
                  <span>저자·기관</span>
                  <input
                    maxLength={200}
                    onChange={(event) =>
                      updateSource(index, {
                        author: event.target.value || null,
                      })
                    }
                    value={source.author ?? ""}
                  />
                </label>
                <label className="event-form-field">
                  <span>발행 연도</span>
                  <input
                    min={1}
                    onChange={(event) =>
                      updateSource(index, {
                        publishedYear: optionalNumber(event.target.value),
                      })
                    }
                    type="number"
                    value={source.publishedYear ?? ""}
                  />
                </label>
                <label className="event-form-field event-form-field-wide">
                  <span>URL</span>
                  <input
                    maxLength={2_000}
                    onChange={(event) =>
                      updateSource(index, { url: event.target.value || null })
                    }
                    type="url"
                    value={source.url ?? ""}
                  />
                </label>
                <label className="event-form-field">
                  <span>위치·쪽수</span>
                  <input
                    maxLength={120}
                    onChange={(event) =>
                      updateSource(index, {
                        locator: event.target.value || null,
                      })
                    }
                    value={source.locator ?? ""}
                  />
                </label>
                <label className="event-form-field event-form-field-grow">
                  <span>메모</span>
                  <input
                    maxLength={500}
                    onChange={(event) =>
                      updateSource(index, { note: event.target.value || null })
                    }
                    value={source.note ?? ""}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function optionalNumber(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberValue(value: string, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
