import type { TimelineTrack } from "../timeline/types";
import type { ImportPayload } from "./schema";

export function createAiImportPrompt(
  payload: ImportPayload,
  tracks: TimelineTrack[],
): string {
  const target =
    payload.items[0]?.title.trim() || "[여기에 조사할 사건명을 입력하세요]";
  const trackList = tracks
    .map((track) => `- ${track.key}: ${track.name}`)
    .join("\n");

  return `너는 Kairosia: HistoryBuilder에 등록할 역사 사건 데이터를 작성하는 역사 조사 보조자다.

[조사 대상]
${target}

[출력 규칙]
1. 설명, 인사말, 주석, Markdown 코드 블록 없이 JSON 객체만 반환한다.
2. schemaVersion은 반드시 "1.0"으로 유지하고 items에는 사건 하나만 넣는다.
3. 템플릿에 없는 필드를 추가하거나 기존 필드를 제거하지 않는다.
4. 모든 서술은 한국어로 작성한다.
5. 현재 템플릿의 1950년과 기본 Track은 자리표시자일 수 있으므로 실제 사건에 맞게 수정한다.

[시간 규칙]
- 정확한 날짜가 확인되면 precision을 "exact"로 하고 month와 day를 입력한다.
- 연도만 확실하면 precision은 "year", month와 day는 null로 둔다.
- 추정 연대는 precision을 "estimated"로 하고 uncertaintyNote에 근거와 이견을 설명한다.
- 단일 사건은 end를 null로 두고 basis를 "point"로 한다. 기간 사건은 end와 "duration"을 사용한다.
- BCE는 "BCE", 서기는 "CE"를 사용하며 연도 0은 사용하지 않는다.

[사용 가능한 Track Key]
${trackList || "- world-history: 세계사"}

[분류와 내용 규칙]
- 사건과 직접 관련된 Track만 사용한다.
- 한국 사건은 korean-history를 사용하며, 단순히 한국이 동아시아에 속한다는 이유만으로 east-asian-history를 중복 지정하지 않는다.
- summary는 핵심 의미가 드러나는 1~2문장, 280자 이내로 작성한다.
- detailMarkdown은 배경, 전개, 결과와 역사적 의미가 드러나게 작성한다.
- 기본 recordLevel은 "standard"로 하고 실제 확인 가능한 출처를 한 개 이상 넣는다.
- 출처 제목이나 URL을 지어내지 말고 정부 기록원, 박물관, 대학, 학술기관 등의 출처를 우선한다.
- 중요한 연대나 해석에 이견이 있으면 confidence를 낮추고 uncertaintyNote에 쟁점을 구분한다.
- 위치가 특정되면 대표 위치의 좌표를 넣고, 정확한 지점이 아니면 "approximate"를 사용한다.
- 성경 관련 항목은 복음주의 개신교의 성경 이해를 기본 관점으로 작성하되, 전통적 성경 연대와 현대 역사학·고고학의 견해가 다르면 uncertaintyNote에 구분한다.

[완성할 JSON 템플릿]
${JSON.stringify(payload, null, 2)}`;
}
