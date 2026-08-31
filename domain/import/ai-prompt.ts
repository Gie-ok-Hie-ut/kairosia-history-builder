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

[기본 기록 방식]
- 기본은 짧고 읽기 쉬운 "간단 기록"이다. summary는 한 문장, detailMarkdown은 2~4문장, 출처는 1개를 우선한다.
- 더 긴 기록이 필요하면 recordLevel을 "standard" 또는 "rigorous"로 올린다. 요청에 별도 분량 지시가 없으면 "simple"을 사용한다.

[출력 규칙]
1. 설명, 인사말, 주석, Markdown 코드 블록 없이 JSON 객체만 반환한다.
2. schemaVersion은 반드시 "1.0"으로 유지하고 items에는 사건 하나만 넣는다.
3. 템플릿에 없는 필드를 추가하거나 기존 필드를 제거하지 않는다.
4. 모든 서술은 한국어로 작성한다.
5. 현재 템플릿의 1950년과 기본 Track은 자리표시자일 수 있으므로 실제 사건에 맞게 수정한다.

[JSON 문법]
- 문자열은 반드시 큰따옴표(\")로 감싼다. 작은따옴표는 사용하지 않는다.
- 값이 없으면 null을 사용한다. "null"처럼 문자열로 쓰지 않는다.
- tags, trackKeys, sources는 대괄호([]) 안에 넣는다. 마지막 항목 뒤에는 쉼표를 넣지 않는다.
- 결과 전체가 하나의 유효한 JSON 객체여야 한다.

[필드별 작성 안내]
- title: 널리 통용되는 사건명이다.
- type: event(사건), person(인물), book(저작), idea(사상), organization(조직), technology(기술) 중 하나다.
- time.start: 시작 시점이다. year는 필수이고 era는 BCE 또는 CE다.
- time.end: 단일 사건이면 null, 기간 사건이면 start와 같은 형식의 종료 시점이다.
- time.basis: point(단일 사건), duration(기간), lifespan(생애), activity(활동), publication(출판), existence(존속) 중 하나다.
- trackKeys: 아래 목록에서 사건과 직접 관련된 Key를 1개 이상 넣는다.
- tags: 검색용 핵심어 배열이다. 3~7개를 권장하며 같은 태그는 반복하지 않는다.
- importance: core(역사적 전환점), major(주요 사건), detail(보조 사건) 중 하나다.
- summary: 사건의 의미가 드러나는 짧은 요약이며 280자 이하여야 한다.
- detailMarkdown: 간단 기록은 2~4문장으로 쓴다. standard는 상세 설명과 출처 1개 이상, rigorous는 출처 2개 이상이 필요하다.
- confidence: high, medium, low, disputed 중 하나다. disputed면 uncertaintyNote를 반드시 작성한다.
- location: 장소가 불명확하면 null이다. 입력하면 name, latitude, longitude, precision(exact 또는 approximate)을 모두 넣는다.
- sources: 비어 있거나 출처 객체 배열이다. 각 출처에는 type(primary, secondary, reference, web)과 title이 필요하다. author, publishedYear, url, locator, note는 생략하거나 null로 둘 수 있다.
- 출처의 url은 실제 확인한 완전한 웹 주소만 사용한다. "https://" 또는 "http://"로 시작해야 하며, 확실하지 않으면 url: null로 둔다.
- url에는 빈 문자열(""), "www.example.org", "example.org/page", Markdown 링크([제목](주소)), 인용 표기 등을 넣지 않는다. 올바른 형식의 예: "https://www.example.org/article".

[시간 규칙]
- 정확한 날짜가 확인되면 precision을 "exact"로 하고 month와 day를 입력한다.
- 연도만 확실하면 precision은 "year", month와 day는 null로 둔다.
- decade 또는 century를 사용할 때도 month와 day는 null로 둔다.
- 추정 연대는 precision을 "estimated"로 하고 uncertaintyNote에 근거와 이견을 설명한다.
- 단일 사건은 end를 null로 두고 basis를 "point"로 한다. 기간 사건은 end와 "duration"을 사용한다.
- BCE는 "BCE", 서기는 "CE"를 사용하며 연도 0은 사용하지 않는다.

[사용 가능한 Track Key]
${trackList || "- world-history: 세계사"}

[분류와 내용 규칙]
- 사건과 직접 관련된 Track만 사용한다.
- 한국 사건은 korean-history를 사용하며, 단순히 한국이 동아시아에 속한다는 이유만으로 east-asian-history를 중복 지정하지 않는다.
- 간단 기록은 summary를 한 문장으로, detailMarkdown을 2~4문장으로 작성한다. 더 긴 설명은 사용자가 요청한 경우에만 작성한다.
- 출처 제목이나 URL을 지어내지 말고 정부 기록원, 박물관, 대학, 학술기관 등의 출처를 우선한다.
- 중요한 연대나 해석에 이견이 있으면 confidence를 낮추고 uncertaintyNote에 쟁점을 구분한다.
- 위치가 특정되면 대표 위치의 좌표를 넣고, 정확한 지점이 아니면 "approximate"를 사용한다.
- 성경 관련 항목은 복음주의 개신교의 성경 이해를 기본 관점으로 작성하되, 전통적 성경 연대와 현대 역사학·고고학의 견해가 다르면 uncertaintyNote에 구분한다.

[완성할 JSON 템플릿]
${JSON.stringify(payload, null, 2)}`;
}
