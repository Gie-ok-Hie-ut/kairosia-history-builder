# Kairosia: HistoryBuilder

내가 만들어가는 역사 지도 시스템 기획서

- 문서 버전: 2.3
- 작성일: 2026-08-29
- 상태: 구현 준비용 MVP 기획안
- 이전 버전과의 핵심 차이: ChatGPT 직접 연결과 MCP 쓰기 흐름을 제거하고, 직접 입력 또는 구조화 JSON을 히스토리 페이지에서 자동 검증한 뒤 Notion에 저장하는 수동 승인형 등록 구조로 변경

## 1. 기획 개요

Kairosia: HistoryBuilder는 한국사, 세계사, 기독교사, 일본사, 미국사, 중국사, 이스라엘사, 철학사, 과학사 등 서로 다른 역사 분야를 하나의 시간축 위에서 비교하고, 새로 알게 된 지식을 지속적으로 추가, 수정, 숨김 처리하는 내가 만들어가는 역사 지도다.

핵심 목적은 완전한 역사 데이터베이스를 구축하는 것이 아니라 다음 질문에 빠르게 답할 수 있게 하는 것이다.

- 특정 사건은 언제 시작되고 끝났는가?
- 같은 시기에 다른 역사 분야에서는 무엇이 일어났는가?
- 인물, 책, 사상, 조직, 기술은 어떤 사건들과 시간적으로 겹치는가?
- 전체 역사의 큰 골격과 세부 기록을 같은 화면에서 오갈 수 있는가?

Notion을 사용자가 직접 확인하고 수정할 수 있는 원본 장부로 사용한다. 히스토리 페이지는 Notion 데이터를 정규화하여 연대표로 읽고 탐색하는 화면이면서, 직접 입력과 구조화 JSON을 안전하게 Notion에 등록하는 관리자 입력 화면을 제공한다.

ChatGPT는 시스템에 직접 연결하지 않는다. 사용자는 ChatGPT에 역사 정보를 질문하고, 약속된 JSON 스키마로 결과를 받은 뒤 히스토리 페이지의 관리자 Import 화면에 수동으로 붙여넣는다.

## 2. 확정된 제품 원칙

| 항목 | 결정 |
|---|---|
| 원본 데이터 | Notion |
| AI의 역할 | 약속된 스키마의 JSON 생성 |
| AI 연결 방식 | 직접 API 또는 MCP 연결 없음 |
| 주 입력 방식 | 관리자 사건 등록 화면에 직접 입력과 JSON을 동시 표시 |
| 기록 반영 절차 | 입력 중 자동 검증, 중복 확인, 사용자 등록 |
| 최종 렌더링 기준 | Notion에 저장된 데이터를 다시 읽은 결과 |
| 분류 구조 | 대분류와 세부 분야의 2단계 Track |
| 시간 방향 | 위에서 아래로 흐르는 세로 시간축 |
| 카테고리 방향 | 좌우 열로 배치되는 역사 분야 |
| 시간 보기 | 절대 시간 모드와 공백 압축 모드 |
| 상세 정보 | 상세 패널과 필요 시 지연 조회 |
| 재방문 | 마지막 시간 구간과 화면 상태 복원 |
| 기록 대상 | 사건, 인물, 책, 사상, 조직, 기술 |
| 근거 수준 | 간단, 보통, 엄밀 |
| 삭제 원칙 | 영구 삭제보다 숨김과 복구 우선 |
| 배포 방식 | GitHub 코드 저장, Vercel 배포 |

## 3. 제품 범위

### 3.1 MVP 목표

- 여러 역사 분야를 세로 시간축에서 나란히 비교한다.
- 대분류와 세부 분야를 독립적으로 접고 펼친다.
- 사건을 선택하면 요약, 상세 내용, 출처, 관련 항목을 확인한다.
- 검색 또는 연도 이동으로 원하는 시간 구간에 빠르게 접근한다.
- 직접 입력하거나 구조화 JSON을 붙여넣고 자동 검증 결과와 중복 후보를 확인한다.
- 사용자가 등록을 승인한 항목만 Notion에 저장한다.
- Notion 저장 성공 후 해당 데이터를 다시 읽어 연대표에 반영한다.
- Notion에서 직접 수정한 데이터도 사이트에 반영한다.
- 마지막으로 보던 시간 범위와 화면 구성을 복원한다.
- 절대 시간과 공백 압축 시간 사이를 전환한다.

### 3.2 MVP 범위 밖

- ChatGPT와 Notion 사이의 직접 MCP 또는 API 쓰기 연결
- AI가 승인 없이 데이터를 자동 등록하는 기능
- 여러 사용자의 동시 공동 편집
- JSON을 통한 기존 항목 수정과 영구 삭제
- 출처의 학술적 신뢰도를 자동 판정하는 시스템
- 복잡한 지식 그래프 전체를 상시 표시하는 화면
- 모바일에서 데스크톱과 동일한 편집 경험
- Notion을 대체하는 독자 데이터베이스

### 3.3 MVP의 의도적 제약

- 사건 등록 v1은 신규 항목 등록만 지원한다.
- 사용자 사건 등록은 한 번에 정확히 한 항목만 지원한다.
- Track 계층은 대분류와 세부 분야의 2단계까지만 지원한다.
- 관련 항목은 상세 패널에 목록으로만 표시하고 관계 유형과 관계선은 후속 범위로 둔다.
- 모바일은 열람 중심으로 지원하며 사건 등록은 데스크톱을 우선한다.
- 정확한 월과 일은 정규화된 달력 날짜가 확실한 경우에만 사용한다. 원전의 달력 체계가 중요한 경우 상세 설명에 기록한다.

## 4. 핵심 사용자 경험

### 4.1 기본 좌표계

- 세로축(Y): 시간
- 가로축(X): 역사 Track
- 아래 방향: 과거에서 현재로 이동
- 좌우 방향: 동일 시대의 다른 역사 분야 비교

화면 왼쪽에는 연도 또는 세기 눈금을 고정하고, 화면 상단에는 Track 이름을 고정한다. 사용자는 세로로 시대를 이동하며 같은 시기의 여러 분야를 가로로 비교한다.

기본 활성 대분류는 4개에서 6개로 제한하고, 나머지는 선택적으로 표시한다.

### 4.2 시간 객체 표현

| 객체 | 기본 표현 | 기간 의미 |
|---|---|---|
| 기간이 있는 사건 | 시작부터 종료까지 이어지는 막대 | 사건 지속 기간 |
| 단일 사건 | 점 또는 짧은 카드 | 발생 시점 |
| 인물 | 세로 막대 | 기본적으로 생애 |
| 책과 논문 | 시점 마커 | 출간 시점 |
| 사상과 운동 | 경계가 완화된 막대 | 형성과 전개 기간 |
| 조직과 국가 | 세로 막대 | 존속 기간 |
| 기술 | 시점 또는 기간 막대 | 발표 시점 또는 주요 활동 기간 |

인물의 활동 기간이 중요할 경우 인물 생애 막대와 별개의 관련 사건으로 기록한다. 한 항목의 막대가 생애와 활동 기간을 임의로 혼용하지 않는다.

### 4.3 여러 Track에 속한 항목

하나의 역사 항목은 Notion에 한 번만 저장한다. 여러 Track에 속하면 화면에서는 각 Track에 동일한 itemId를 가진 시각적 참조 카드를 만든다.

- 데이터 원본은 중복하지 않는다.
- 어느 참조 카드를 선택해도 같은 상세 항목을 연다.
- 두 개 이상의 Track에 표시된 항목에는 다중 분류 표시를 제공한다.
- 레인 배치는 Track별 시각적 참조 단위로 계산한다.

### 4.4 절대 시간 모드

실제 연도 차이에 비례하여 세로 거리를 계산한다. BCE와 CE를 포함한 연속 내부 좌표를 사용하고, 사용자 화면에는 역사 표기법으로 변환한 연도를 표시한다.

### 4.5 공백 압축 모드

사건 경계나 세부 사건이 없는 긴 시간폭을 일정 높이로 축소한다. 데이터는 변경하지 않고 연도와 화면 좌표 사이의 변환 함수만 바꾼다. 따라서 장기 기간 항목도 시작점과 종료점은 보존하되 그 내부의 성긴 구간은 압축할 수 있다.

MVP의 압축 규칙은 다음과 같다.

- 모든 공개 항목을 기준으로 하나의 공통 압축 지도를 만든다.
- 검색어와 일시적인 필터 변경은 압축 지도를 바꾸지 않는다.
- 항목의 시작점과 종료점, 내부 단기 사건 주변을 시간 앵커로 보존한다.
- 장기 기간 항목이 가로지르더라도 시간 앵커가 없는 긴 내부 구간은 압축한다.
- 압축 경계에는 단절 표시와 실제 축약 기간을 표시한다.
- 변환 함수는 단조 증가하고 역변환이 가능해야 한다.
- URL과 복원 상태에는 픽셀 위치가 아니라 실제 연도 범위를 저장한다.

### 4.6 의미 기반 표시 밀도

연속적인 자유 확대보다 시간 범위에 따른 명확한 단계 전환을 우선한다.

| 화면 시간 범위 | 표시 수준 |
|---|---|
| 전체 역사 | 시대명과 core 항목 |
| 수 세기 | core와 major 항목 |
| 수십 년 | 세부 항목과 요약 |
| 수년 | 정확한 날짜와 상세 라벨 |

### 4.7 탐색 보조 기능

- 연도 또는 시대 바로 이동
- 제목과 요약 검색
- Track 필터
- 현재 표시 범위 안내
- 선택 항목으로 이동
- 검색 결과의 연대표 위치로 이동

### 4.8 화면 상태 복원

브라우저에는 다음 상태를 저장한다.

- 마지막 시간 범위
- 절대 시간 또는 공백 압축 모드
- 활성 Track
- 펼쳐진 세부 Track
- 필터와 검색어
- 마지막 선택 항목

공유 가능한 화면 상태는 URL 파라미터로 표현한다. URL에는 픽셀 스크롤 값이 아니라 시작 연도와 종료 연도를 저장한다.

## 5. 핵심 사용자 흐름

### 5.1 연대표 탐색

1. 사용자가 사이트에 접속한다.
2. 마지막 시간 범위와 활성 Track이 복원된다.
3. 연도 이동, 검색 또는 스크롤로 시대를 이동한다.
4. 좌우 Track에서 동시대 항목을 비교한다.
5. 항목을 선택하면 상세 패널을 연다.
6. 상세 본문과 출처는 선택 시 조회한다.
7. 필요하면 절대 시간과 공백 압축 모드를 전환한다.

### 5.2 ChatGPT 정보 생성

1. 사용자가 ChatGPT에 필요한 역사 정보를 질문한다.
2. 사용자는 관리자 화면에서 제공하는 JSON 요청 템플릿을 함께 전달한다.
3. ChatGPT는 설명 문장이나 코드 펜스 없이 JSON만 반환한다.
4. ChatGPT는 Notion, 히스토리 페이지 또는 서버에 직접 접근하지 않는다.
5. 반환된 사실과 출처의 최종 확인 책임은 사용자에게 있다.

### 5.3 사건 입력과 자동 검증

1. 관리자 사건 등록 화면은 왼쪽 직접 입력 폼과 오른쪽 JSON 편집기를 동시에 표시한다.
2. 두 편집 영역은 사건 하나를 담은 동일한 `ImportPayload`를 공유하고, 직접 입력 변경은 즉시 JSON으로 직렬화한다.
3. JSON은 문법과 단일 사건 스키마가 유효할 때만 직접 입력 폼을 갱신하며, 잘못된 편집 중에는 마지막 유효 폼 상태를 유지한다.
4. 클라이언트가 JSON 문법과 스키마를 1차 검사한다.
5. 서버가 짧은 입력 지연 후 스키마, Track, 날짜, 필수 필드와 크기 제한을 다시 검사한다.
6. 서버가 정확히 같은 내용과 의미상 유사한 기존 항목을 검색한다.
7. 화면은 큰 카드 미리보기 없이 오류, 경고와 중복 후보만 압축해 표시한다.
8. 자동 검증 단계에서는 Notion을 변경하지 않는다.

### 5.4 Notion 등록

1. 사용자가 검증 결과를 확인하고 `Notion에 등록`을 누른다.
2. 서버가 동일한 검증과 중복 검사를 다시 실행한다.
3. 항목별 canonical JSON에서 ImportFingerprint를 계산한다.
4. Notion에 Status가 Draft인 페이지를 생성한다.
5. 상세 설명과 출처 블록을 기록한다.
6. 저장된 Notion 페이지를 다시 조회하고 정규화한다.
7. 모든 필수 기록이 성공한 항목만 Published로 전환한다.
8. 연대표 캐시를 갱신하거나 무효화한다.
9. 화면은 Notion에서 다시 읽은 최종 데이터를 렌더링한다.

Draft 생성 이후 실패한 항목은 공개 연대표에 나타나지 않는다. 관리자는 실패한 Draft를 재시도하거나 Notion에서 직접 확인할 수 있다.

### 5.5 단일 항목 실패와 재시도

사용자 사건 등록은 한 번에 한 페이지만 처리한다.

- 성공: Published로 전환되고 연대표에 반영한 뒤 입력 영역을 다음 사건용으로 초기화
- 실패: 입력값을 유지하고 실패 메시지를 표시하며, 생성된 페이지는 Draft로 유지
- 중복: 저장하지 않고 기존 후보를 표시
- 재시도: 사용자가 같은 입력값을 검토한 뒤 다시 등록

### 5.6 수정과 제거

MVP에서 수정과 제거는 Notion에서 직접 처리한다.

- 수정: Notion 원본 페이지 편집
- 숨김: Status를 Hidden으로 변경
- 복구: Status를 Published로 변경
- 영구 삭제: Notion 관리 작업으로 제한

향후 JSON 수정 기능은 기존 itemId와 lastEdited 값을 포함한 별도 update 스키마로 추가한다.

## 6. 사건 등록 JSON 계약

### 6.1 기본 예시

~~~json
{
  "schemaVersion": "1.0",
  "items": [
    {
      "title": "다트머스 회의",
      "type": "event",
      "time": {
        "start": {
          "year": 1956,
          "era": "CE",
          "month": null,
          "day": null,
          "precision": "year"
        },
        "end": null,
        "basis": "point"
      },
      "trackKeys": ["ai-history"],
      "tags": ["인공지능", "학술회의"],
      "importance": "core",
      "summary": "인공지능이라는 명칭이 공식적으로 제안된 연구 회의",
      "detailMarkdown": "1956년 미국 다트머스 대학에서 열린 연구 모임이다.",
      "recordLevel": "simple",
      "confidence": "high",
      "uncertaintyNote": null,
      "location": {
        "name": "미국 뉴햄프셔주 하노버",
        "latitude": 43.7044,
        "longitude": -72.2887,
        "precision": "approximate"
      },
      "sources": [
        {
          "type": "primary",
          "title": "A Proposal for the Dartmouth Summer Research Project on Artificial Intelligence",
          "author": "John McCarthy 외",
          "publishedYear": 1955,
          "url": "https://example.com/source",
          "locator": null,
          "note": null
        }
      ]
    }
  ]
}
~~~

### 6.2 허용 값

| 필드 | 허용 값 |
|---|---|
| type | event, person, book, idea, organization, technology |
| era | BCE, CE |
| precision | exact, year, decade, century, estimated |
| basis | point, duration, lifespan, activity, publication, existence |
| importance | core, major, detail |
| recordLevel | simple, standard, rigorous |
| confidence | high, medium, low, disputed |
| location.precision | exact, approximate |
| source.type | primary, secondary, reference, web |

### 6.3 서버 생성 필드

다음 값은 ChatGPT가 생성하거나 사용자가 입력하지 않는다.

- Notion page ID
- itemId
- slug
- ordinalStart와 ordinalEnd
- ImportFingerprint
- Status
- LastEdited
- 캐시 키

### 6.4 검증 규칙

- schemaVersion은 지원되는 정확한 버전이어야 한다.
- 사용자 사건 등록의 items는 정확히 1개여야 한다.
- year는 1 이상의 정수이며 year 0은 허용하지 않는다.
- BCE와 CE는 era로 구분하고 음수 연도 입력은 허용하지 않는다.
- end가 있으면 연속 내부 좌표에서 start보다 빠를 수 없다.
- month와 day는 precision이 exact일 때만 허용한다.
- trackKeys는 Tracks DB에 존재하는 Key만 허용한다.
- summary는 연대표 카드에 맞는 제한 길이를 적용한다.
- detailMarkdown은 허용된 Markdown 문법만 사용한다.
- URL은 허용된 프로토콜과 최대 길이를 검사한다.
- location은 선택 사항이며, 입력할 때 위도는 -90~90, 경도는 -180~180 범위여야 한다.
- simple 항목의 출처 누락은 경고로 표시한다.
- standard 항목은 상세 설명과 하나 이상의 출처를 요구한다.
- rigorous 항목은 둘 이상의 출처를 요구하며, disputed인 경우 uncertaintyNote를 요구한다.
- JSON에 알 수 없는 필드가 있으면 조용히 버리지 않고 경고 또는 오류로 표시한다.

### 6.5 날짜 정규화

사용자와 JSON은 역사 연도를 사용하고 내부 계산은 연속 좌표를 사용한다.

~~~text
CE 연도 ordinal = year
BCE 연도 ordinal = 1 - year

1 BCE  -> 0
2 BCE  -> -1
1 CE   -> 1
~~~

이 변환은 정렬과 화면 배치에만 사용한다. Notion과 사용자 화면에는 원래의 year와 era를 유지한다.

### 6.6 ImportFingerprint

서버는 서버 생성 필드를 제외한 항목 JSON을 정규 키 순서로 직렬화하고 해시를 계산한다.

- 같은 payload의 반복 등록을 탐지한다.
- 제목, 시간 범위와 Track이 유사한 항목은 별도의 의미상 중복 후보로 표시한다.
- fingerprint 일치는 자동 차단한다.
- 의미상 중복 후보는 사용자가 검토한다.

## 7. Notion 데이터 구조

### 7.1 Tracks DB

| 필드 | 형식 | 필수 | 설명 |
|---|---|---|---|
| Name | Title | 필수 | 화면 표시 이름 |
| Key | Rich text | 필수 | JSON과 코드에서 사용하는 불변 키 |
| Parent | Relation | 선택 | 상위 대분류 |
| Order | Number | 필수 | 가로 표시 순서 |
| Color | Select | 필수 | 화면 구분 색상 |
| Visible | Checkbox | 필수 | 기본 표시 여부 |
| Description | Rich text | 선택 | 분야 설명 |

MVP에서는 Parent의 깊이를 한 단계로 제한하고 순환 참조를 검증한다. Name은 변경할 수 있지만 Key는 생성 후 변경하지 않는 것을 원칙으로 한다.

### 7.2 Timeline Items DB

| 필드 | 형식 | 필수 | 설명 |
|---|---|---|---|
| Title | Title | 필수 | 항목명 |
| Type | Select | 필수 | 사건, 인물, 책, 사상, 조직, 기술 |
| StartYear | Number | 필수 | 1 이상의 역사 연도 |
| StartEra | Select | 필수 | BCE 또는 CE |
| StartMonth | Number | 선택 | 정확한 날짜가 있을 때 |
| StartDay | Number | 선택 | 정확한 날짜가 있을 때 |
| EndYear | Number | 선택 | 기간 종료 역사 연도 |
| EndEra | Select | 선택 | BCE 또는 CE |
| EndMonth | Number | 선택 | 정확한 종료일 |
| EndDay | Number | 선택 | 정확한 종료일 |
| StartPrecision | Select | 필수 | exact, year, decade, century, estimated |
| EndPrecision | Select | 선택 | 종료 시점의 정밀도 |
| TimeBasis | Select | 필수 | point, duration, lifespan, activity, publication, existence |
| Tracks | Relation | 필수 | 하나 이상의 Track |
| Tags | Multi-select | 선택 | Track 폭증을 막는 보조 분류 |
| Importance | Select | 필수 | core, major, detail |
| Summary | Rich text | 필수 | 접힌 카드의 요약 |
| RecordLevel | Select | 필수 | simple, standard, rigorous |
| Confidence | Select | 필수 | high, medium, low, disputed |
| UncertaintyNote | Rich text | 선택 | 날짜 또는 해석의 불확실성 |
| PlaceName | Rich text | 선택 | 대표 발생 장소 이름 |
| Latitude | Number | 선택 | 대표 장소 위도, -90~90 |
| Longitude | Number | 선택 | 대표 장소 경도, -180~180 |
| LocationPrecision | Select | 선택 | exact 또는 approximate |
| RelatedItems | Relation | 선택 | 단순 관련 항목 |
| Status | Select | 필수 | Draft, Published, Hidden |
| Slug | Rich text | 필수 | 공유 URL용 고유 식별자 |
| ImportFingerprint | Rich text | 선택 | 반복 Import 탐지 |
| LastEdited | Last edited time | 자동 | 동기화 기준 |

### 7.3 Notion 페이지 본문

Timeline Items DB의 각 페이지 본문에는 다음 내용을 둔다.

- 상세 설명
- 출처 목록
- 필요 시 논쟁점과 추가 메모

Import 서버는 detailMarkdown과 sources 배열을 지원되는 Notion 블록으로 변환한다. 연대표 초기 조회에서는 페이지 본문을 가져오지 않고, 사용자가 항목을 선택할 때 상세 API가 본문 블록을 조회한다.

### 7.4 위치 지도

MVP는 항목당 하나의 대표 위치를 지원한다. 정규화 모델에서는 위치를 배열로 노출하여 향후 여러 지점, 이동 경로와 범위로 확장할 수 있게 한다.

- 상세 패널의 지도는 위치가 있는 항목에서만 렌더링한다.
- 지도 엔진은 Leaflet을 사용하고 배경 타일은 환경변수로 교체할 수 있다.
- 지도 모듈은 항목을 선택했을 때 브라우저에서 지연 로딩한다.
- 마커와 장소 링크는 API 키가 필요 없는 Google Maps URL로 연결한다.
- `approximate` 위치는 정확한 지점으로 오해하지 않도록 반투명 범위를 함께 표시한다.

### 7.5 항목 식별자

- 내부의 최종 식별자는 Notion page ID다.
- slug는 URL과 사람이 읽기 위한 식별자이며 데이터 연결의 기준으로 사용하지 않는다.
- Title 변경은 식별자에 영향을 주지 않는다.
- 사건 등록 JSON v1은 itemId를 받지 않으므로 신규 생성만 수행한다.

## 8. 정규화된 웹 데이터

Notion 응답을 React 컴포넌트에 직접 전달하지 않는다. Notion 전용 형식은 server/notion 영역에서만 사용한다.

### 8.1 목록용 모델

~~~json
{
  "id": "notion-page-id",
  "slug": "dartmouth-workshop-1956",
  "title": "다트머스 회의",
  "type": "event",
  "start": {
    "year": 1956,
    "era": "CE",
    "ordinalYear": 1956,
    "precision": "year"
  },
  "end": null,
  "timeBasis": "point",
  "trackKeys": ["ai-history"],
  "importance": "core",
  "summary": "인공지능이라는 명칭이 공식적으로 제안된 연구 회의",
  "recordLevel": "simple",
  "confidence": "high"
}
~~~

### 8.2 상세용 모델

상세 API는 목록 모델에 다음 내용을 추가한다.

- 지원되는 형식으로 정규화한 본문 블록
- 출처 블록
- 관련 항목의 최소 정보
- uncertaintyNote

목록 API와 상세 API를 분리하여 초기 화면이 모든 Notion 본문을 가져오지 않게 한다.

## 9. 시스템 아키텍처

### 9.1 전체 구성

~~~mermaid
flowchart LR
    C["ChatGPT"] -->|"JSON을 사용자에게 반환"| U["사용자"]
    U -->|"직접 입력 또는 JSON 붙여넣기"| I["사건 등록 화면"]
    I --> P["Validation API"]
    I --> M["Commit API"]
    P --> V["검증·중복 확인"]
    M --> V
    V --> N["Notion 어댑터"]
    N --> DB["Notion 원본 DB"]
    DB --> R["정규화 읽기 모델·캐시"]
    R --> W["연대표 웹 UI"]
    DB -. "Webhook 또는 주기 동기화" .-> R
~~~

### 9.2 핵심 경계

- ChatGPT는 JSON 생성까지만 담당한다.
- 관리자 UI는 직접 입력·JSON 동기화와 검증 상태 표시를 담당하고 Notion API를 직접 호출하지 않는다.
- API 경로는 인증, 요청 파싱과 use case 호출만 담당한다.
- 도메인 모듈은 날짜, 압축, 레인 배치와 스키마 규칙을 담당한다.
- Notion 어댑터는 Notion 필드와 정규화 모델의 변환을 전담한다.
- 연대표 UI는 정규화된 모델만 사용한다.
- 캐시는 읽기 성능을 위한 사본이며 원본이 아니다.

### 9.3 읽기 경로

~~~text
브라우저
→ Timeline API
→ 정규화 목록 캐시 확인
→ 요청한 시간 범위와 Track 필터
→ 목록 DTO 반환
→ 연대표 렌더링
~~~

캐시가 없거나 만료된 경우에만 Notion 목록을 페이지 단위로 조회해 정규화한다.

### 9.4 상세 읽기 경로

~~~text
항목 선택
→ Detail API
→ 항목별 상세 캐시 확인
→ 필요 시 Notion 페이지 본문 조회
→ 지원 블록 정규화
→ 상세 패널 렌더링
~~~

### 9.5 쓰기 경로

~~~text
직접 입력 또는 JSON 붙여넣기
→ 자동 Validation API
→ 검증·정규화·중복 확인
→ 오류·경고·중복 상태 표시
→ 사용자 등록 승인
→ Commit API
→ Notion Draft 생성
→ 본문과 출처 저장
→ 저장 결과 재조회
→ Published 전환
→ 캐시 갱신
→ Notion 기준 최종 렌더링
~~~

## 10. 코드 아키텍처

### 10.1 권장 디렉터리 구조

~~~text
src/
├─ app/
│  ├─ timeline/
│  │  └─ page.tsx
│  ├─ admin/
│  │  └─ import/
│  │     └─ page.tsx
│  └─ api/
│     ├─ tracks/
│     │  └─ route.ts
│     ├─ timeline/
│     │  ├─ route.ts
│     │  └─ [id]/
│     │     └─ route.ts
│     ├─ admin/
│     │  └─ import/
│     │     ├─ preview/
│     │     │  └─ route.ts
│     │     └─ commit/
│     │        └─ route.ts
│     └─ notion/
│        └─ webhook/
│           └─ route.ts
├─ components/
│  ├─ timeline/
│  │  ├─ TimelineViewport.tsx
│  │  ├─ TimeAxis.tsx
│  │  ├─ TrackHeader.tsx
│  │  ├─ TrackColumn.tsx
│  │  ├─ TimelineItem.tsx
│  │  └─ DetailPanel.tsx
│  └─ import/
│     ├─ ImportPanel.tsx
│     └─ DirectImportForm.tsx
├─ domain/
│  ├─ import/
│  │  ├─ schema.ts
│  │  ├─ normalize.ts
│  │  └─ fingerprint.ts
│  └─ timeline/
│     ├─ types.ts
│     ├─ historical-date.ts
│     ├─ linear-scale.ts
│     ├─ compression-map.ts
│     ├─ compressed-scale.ts
│     ├─ lane-layout.ts
│     └─ visibility.ts
├─ server/
│  ├─ use-cases/
│  │  ├─ get-tracks.ts
│  │  ├─ get-timeline.ts
│  │  ├─ get-item-detail.ts
│  │  ├─ preview-import.ts
│  │  └─ commit-import.ts
│  ├─ notion/
│  │  ├─ client.ts
│  │  ├─ track-mapper.ts
│  │  ├─ item-mapper.ts
│  │  ├─ block-mapper.ts
│  │  └─ timeline-repository.ts
│  ├─ cache/
│  │  ├─ timeline-cache.ts
│  │  └─ detail-cache.ts
│  └─ auth/
│     └─ require-admin.ts
└─ tests/
   ├─ domain/
   ├─ integration/
   └─ e2e/
~~~

### 10.2 비대화 방지 규칙

- page.tsx는 화면 조합만 담당하고 날짜 계산이나 Notion 변환을 포함하지 않는다.
- route.ts는 인증, 파싱, use case 호출과 응답 변환만 담당한다.
- Notion property 이름은 server/notion mapper 밖에서 사용하지 않는다.
- React 컴포넌트는 Notion SDK 타입을 import하지 않는다.
- 시간 변환과 레인 배치는 브라우저와 서버에서 테스트할 수 있는 순수 함수로 작성한다.
- 하나의 파일이 여러 책임을 갖기 시작하면 기능 단위로 분리한다. 단순한 줄 수만을 위한 분리는 하지 않는다.
- 공통 타입은 domain에 두고 화면 전용 상태는 components 또는 UI hook에 둔다.
- 향후 PostgreSQL로 이전할 경우 notion repository만 교체할 수 있게 use case와 저장 구현을 분리한다.

### 10.3 가장 위험한 모듈

연대표 화면보다 다음 계산 모듈을 먼저 독립적으로 검증한다.

- BCE와 CE 변환
- 절대 시간 좌표 변환
- 공백 구간 계산
- 압축 좌표의 정방향과 역방향 변환
- 겹치는 기간의 결정적 레인 배치
- 여러 Track에 속한 항목의 시각적 인스턴스 생성
- 확대 수준에 따른 항목 가시성 결정

## 11. API 설계

| 경로 | 메서드 | 인증 | 기능 |
|---|---|---|---|
| /api/tracks | GET | 읽기 정책에 따름 | Track 계층 조회 |
| /api/timeline | GET | 읽기 정책에 따름 | 시간 범위의 목록 조회 |
| /api/timeline/:id | GET | 읽기 정책에 따름 | 상세 본문 조회 |
| /api/admin/import/preview | POST | 관리자 | 입력 중 자동 검증, 정규화, 중복 확인 |
| /api/admin/import/commit | POST | 관리자 | Notion Draft 생성과 공개 |
| /api/notion/webhook | POST | 서명 검증 | Notion 변경 반영 |

Timeline API는 최소한 다음 입력을 지원한다.

- fromOrdinal과 toOrdinal: BCE와 CE를 연속 좌표로 변환한 내부 연도 범위
- tracks: 활성 Track Key 목록
- importance: 표시할 최대 상세 수준
- cursor: 결과가 큰 경우 페이지 이동

서버는 요청 범위와 상관없이 무제한 항목을 한 번에 반환하지 않는다. 전체 역사 보기에서는 core 항목을 우선 반환한다.

## 12. 데이터 동기화와 캐시

### 12.1 캐시 계층

- Track 메타데이터 캐시
- 공개 항목의 정규화 목록 캐시
- 항목별 상세 본문 캐시
- 압축 지도 캐시

### 12.2 Import를 통한 변경

Commit 성공 후 저장된 Notion 페이지를 다시 조회해 canonical 모델을 만든다. 그 결과로 목록과 상세 캐시를 갱신하고, 브라우저에는 Notion 기준 결과를 반환한다.

### 12.3 Notion 직접 변경

Notion에서 직접 수정한 데이터는 다음 순서로 반영한다.

1. Notion Webhook을 기본 변경 신호로 사용한다.
2. Webhook 이벤트의 서명을 검증한다.
3. 이벤트가 가리키는 최신 페이지를 Notion API로 다시 조회한다.
4. 캐시의 해당 항목을 갱신하거나 제거한다.
5. Webhook 누락과 삭제 상태를 보정하기 위해 정기 전체 동기화를 실행한다.

Webhook이 준비되기 전 초기 버전은 짧은 TTL과 관리자 수동 동기화 버튼을 사용할 수 있다.

### 12.4 마지막 정상 데이터

Notion이 일시적으로 응답하지 않으면 마지막 정상 목록 캐시를 제공한다. 상세 캐시가 없는 항목은 오류 상태와 재시도 동작을 보여준다.

캐시는 복구 원본이 아니므로 정규화 JSON 스냅숏을 정기적으로 별도 보관하는 기능을 운영 안정화 단계에서 추가한다.

## 13. 성능 설계

### 13.1 서버

- 일반 연대표 요청은 Notion을 직접 조회하지 않고 정규화 목록 캐시를 우선 사용한다.
- Notion 페이지네이션과 재시도는 하나의 client 모듈에서 처리한다.
- 제한 응답을 받으면 Retry-After와 지수 백오프를 적용한다.
- 목록 조회와 상세 본문 조회를 분리한다.
- Import 본문 저장은 항목별로 처리하고 무제한 병렬 요청을 만들지 않는다.
- 시간 범위와 Track 필터는 정규화 읽기 모델에 적용한다.

### 13.2 브라우저

- 현재 화면과 인접 구간의 항목만 렌더링한다.
- 화면 밖 Track 항목은 가상화한다.
- 상세 본문은 선택 전에는 다운로드하지 않는다.
- 관계선은 기본적으로 렌더링하지 않는다.
- 레인 계산 결과를 안정적인 itemId와 Track Key로 메모이제이션한다.
- 확대나 필터 변경 시 전체 DOM을 불필요하게 재생성하지 않는다.

### 13.3 성능 검증 기준

기준 데이터셋에서 다음을 측정한다.

- 캐시가 있는 일반 연대표 요청의 응답 시간
- 첫 화면에 필요한 목록 payload 크기
- 초기 화면 표시 시간
- 1,000개 이상의 시각적 항목에서 스크롤과 확대 반응성
- 상세 항목 선택 후 패널 표시 시간
- Import 등록 후 새 항목이 화면에 나타나는 시간

구체적인 수치는 기준 데이터셋과 배포 환경을 만든 뒤 확정한다. 측정 없이 Redis, PostgreSQL, 검색 서버 또는 WebGL을 선제 도입하지 않는다.

## 14. 프런트엔드 구현 원칙

### 14.1 권장 기술

| 영역 | 권장 구성 |
|---|---|
| 프레임워크 | Next.js와 TypeScript |
| 배포 | Vercel |
| 검증 | Zod와 JSON Schema |
| 시간축 계산 | D3 scale 또는 순수 piecewise scale |
| 화면 배치 | CSS Grid와 절대 위치 레이어 |
| 축과 선택 관계선 | SVG |
| 사건 카드 | HTML |
| 가상화 | 검증된 가상화 라이브러리 |
| 원본 데이터 | Notion API |
| 캐시 | Next.js 또는 Vercel Data Cache |
| 화면 상태 | URL 파라미터와 localStorage |

### 14.2 연대표 배치

- Track 헤더와 시간축은 고정한다.
- 사건 카드는 Track 열 내부의 계산된 y 좌표에 배치한다.
- 겹치는 기간은 결정적인 interval lane 알고리즘으로 작은 레인에 나눈다.
- 선택한 항목의 직접 관련 정보만 상세 패널에 표시한다.
- 동일 항목이 여러 Track에 보일 때 React key는 itemId와 trackKey 조합을 사용한다.

### 14.3 Import 화면

Import 화면은 다음 요소를 제공한다.

- 왼쪽 직접 입력과 오른쪽 JSON 편집기의 동시 표시
- 하나의 공통 payload를 사용하는 실시간 양방향 반영
- 한 번에 정확히 한 사건만 처리하는 입력 구조
- 현재 JSON 복사
- JSON 문법 오류 위치
- 스키마 오류의 필드 경로
- Track과 날짜 정규화 결과
- 중복 후보
- 압축된 경고와 자동 검증 상태
- Notion 등록 결과와 실패 건수

기능 설명을 화면에 길게 나열하지 않고, 필요한 오류와 현재 상태를 해당 입력 가까이에 표시한다.

### 14.4 모바일

- 세로 시간축을 유지한다.
- 한 번에 1개에서 2개 Track을 표시한다.
- 좌우 스와이프 또는 Track 선택기로 분야를 이동한다.
- 상세 패널은 하단 시트로 표시한다.
- 사건 등록은 데스크톱 우선으로 최적화하되 모바일에서도 한 열 폼과 JSON 편집을 제공한다.

## 15. 보안과 데이터 무결성

### 15.1 보안

- Notion 인증키와 DB ID는 서버 환경변수에만 저장한다.
- 브라우저 번들, 정적 JSON과 GitHub 저장소에 비밀키를 포함하지 않는다.
- 관리자 Import 경로와 쓰기 API는 인증된 단일 사용자 또는 허용 목록 사용자만 접근한다.
- 읽기 화면의 공개 여부와 무관하게 쓰기 경로는 항상 보호한다.
- Notion Webhook의 서명을 검증한다.
- JSON과 Markdown의 크기, URL 프로토콜과 허용 문법을 검증한다.
- Notion 페이지 본문을 HTML로 표시할 때 안전한 변환기를 사용한다.

### 15.2 무결성

- 검증 API(`/api/admin/import/preview`)는 Notion을 변경하지 않는다.
- Commit API도 저장 직전에 전체 검증을 다시 수행한다.
- Published 상태만 공개 연대표에 포함한다.
- 상세 저장이 실패한 페이지는 Draft로 남긴다.
- ImportFingerprint와 의미상 중복 검색을 함께 사용한다.
- 잘못된 Track 참조와 year 0은 저장하지 않는다.
- Notion에서 직접 생성된 잘못된 항목은 공개 목록에서 제외하고 관리자 진단에 표시한다.

### 15.3 복구

- Hidden 상태를 기본 제거 방식으로 사용한다.
- 실패한 Import는 Draft에서 재시도한다.
- Notion 페이지 변경 이력을 1차 확인 수단으로 사용한다.
- 정규화 JSON 스냅숏을 정기적으로 별도 보관한다.
- 스키마 변경 전에는 전체 검증과 스냅숏을 수행한다.

## 16. 테스트 전략

### 16.1 단위 테스트

- BCE와 CE 경계 변환
- 잘못된 year 0 거부
- 시작과 종료 범위 검증
- 압축 지도의 단조 증가성
- 압축 좌표의 역변환
- 기간이 빈 구간을 가로지를 때 압축 제외
- 겹침 레인 배치의 결정성
- JSON 스키마 검증
- canonical JSON과 fingerprint
- Notion property 매핑

### 16.2 통합 테스트

- 자동 검증 API가 Notion을 변경하지 않음
- Draft 생성 후 본문 저장과 Published 전환
- 본문 저장 실패 시 Draft 유지
- fingerprint 중복 차단
- 의미상 중복 후보 반환
- Import 후 캐시 갱신
- Webhook 서명 검증과 항목 갱신
- Notion 장애 시 마지막 정상 목록 사용

### 16.3 E2E 테스트

- 직접 입력과 JSON의 양방향 반영
- JSON 붙여넣기부터 자동 검증과 등록까지
- 등록된 항목이 올바른 Track과 연도에 표시됨
- Notion 직접 수정 후 화면 반영
- 검색과 연도 이동
- 절대 시간과 공백 압축 전환
- 마지막 화면 상태 복원
- 데스크톱과 모바일에서 텍스트와 카드 겹침 확인

## 17. 기능 요구사항

| ID | 요구사항 | 우선순위 |
|---|---|---|
| F-01 | 세로 시간축과 가로 Track 렌더링 | Must |
| F-02 | Track 계층 접기와 펼치기 | Must |
| F-03 | 사건 상세 패널과 지연 조회 | Must |
| F-04 | 검색과 연도 바로 이동 | Must |
| F-05 | 마지막 화면 상태와 URL 복원 | Must |
| F-06 | Notion 데이터 조회와 정규화 | Must |
| F-07 | JSON 문법과 스키마 검증 | Must |
| F-08 | 입력 중 자동 검증과 중복 후보 | Must |
| F-09 | 승인 후 Notion Draft와 Published 저장 | Must |
| F-10 | 저장 후 Notion 기준 결과 렌더링 | Must |
| F-11 | 단일 항목 저장 실패와 재시도 | Must |
| F-12 | 관리자 인증 | Must |
| F-13 | 절대 시간과 공백 압축 전환 | Should |
| F-14 | Notion Webhook 동기화 | Should |
| F-15 | 선택 항목의 관련 항목 표시 | Could |
| F-16 | 데이터 스냅숏과 복원 | Should |

## 18. 비기능 요구사항

### 성능

- 연대표 목록 요청은 캐시를 우선한다.
- 초기 화면은 상세 Notion 블록을 조회하지 않는다.
- 화면 밖 항목은 렌더링하지 않는다.
- Notion 요청은 중앙화된 client에서 제한과 재시도를 관리한다.

### 접근성

- 색상 외에도 라벨, 형태와 선 패턴을 사용한다.
- 키보드로 시간 범위, Track과 항목을 이동할 수 있게 한다.
- 압축된 구간의 실제 생략 기간을 텍스트로 제공한다.
- Import 오류는 색상뿐 아니라 필드 경로와 메시지로 전달한다.

### 유지보수성

- 도메인 계산은 UI와 외부 API에서 분리한다.
- Notion 스키마 변경은 mapper와 검증 스키마에서 흡수한다.
- JSON schemaVersion별 변환기를 둘 수 있게 한다.
- 주요 시간 계산과 Import 흐름은 자동 테스트로 보호한다.

### 관측 가능성

- Import 단계별 성공과 실패를 구조화해 기록한다.
- Notion 요청 실패, 제한 응답과 재시도 횟수를 기록한다.
- Webhook 처리 실패를 확인할 수 있게 한다.
- 공개 데이터 검증 실패 항목 수를 관리자 화면에서 확인한다.

## 19. 배포와 운영

### 19.1 최초 설정

1. Notion에 Tracks DB와 Timeline Items DB를 생성한다.
2. Notion Integration을 만들고 두 DB에만 접근 권한을 준다.
3. GitHub 저장소에 Next.js 프로젝트를 구성한다.
4. Vercel 환경변수에 Notion 인증키와 DB ID를 등록한다.
5. 관리자 인증을 구성한다.
6. 읽기 API, 상세 API와 Import API를 배포한다.
7. 샘플 데이터로 날짜, Track, 상세 조회와 Import를 검증한다.
8. 필요 시 Notion Webhook을 연결한다.

### 19.2 운영 원칙

- Notion 데이터 변경과 코드 배포를 분리한다.
- Import 저장은 코드 배포 없이 Notion 데이터와 캐시만 변경한다.
- 화면 기능 변경은 GitHub 코드 변경 후 Vercel에 배포한다.
- DB 스키마 변경은 mapper, JSON 스키마와 검증 테스트를 함께 변경한다.
- 무료 제공량으로 시작하되 실제 사용량과 응답 시간을 측정한다.
- 측정 결과가 필요성을 보여줄 때만 별도 DB, KV 또는 검색 서버를 추가한다.

## 20. 개발 단계와 완료 기준

### 1단계: 데이터 계약

범위:

- Tracks DB와 Timeline Items DB 정의
- JSON Schema 1.0 정의
- BCE와 CE 변환
- Notion mapper
- 샘플 데이터 50개에서 100개

완료 기준:

- 잘못된 Track, year 0과 필수 필드 누락이 탐지된다.
- 동일 항목이 JSON, Notion과 정규화 모델에서 일관되게 표현된다.

### 2단계: 읽기 전용 연대표

범위:

- 세로 시간축
- 가로 Track
- 검색과 연도 이동
- 카드와 상세 패널
- 목록 캐시와 상세 지연 조회
- 화면 상태 복원

완료 기준:

- 같은 시대의 여러 분야를 가로로 비교할 수 있다.
- 초기 화면이 모든 Notion 본문을 조회하지 않는다.
- 기간 겹침 배치가 동일 입력에서 항상 같은 결과를 만든다.

### 3단계: 사건 등록

범위:

- 관리자 인증
- 직접 입력 폼과 JSON 편집기의 공통 payload 동기화
- JSON 편집기
- 자동 검증과 중복 검색
- Draft 생성, 본문 저장과 Published 전환
- 부분 실패와 재시도
- 저장 후 캐시 갱신

완료 기준:

- 자동 검증은 원본 DB를 변경하지 않는다.
- 성공한 항목은 Notion을 다시 읽은 뒤 연대표에 표시된다.
- 실패한 항목은 공개되지 않고 Draft로 남는다.
- 같은 JSON 반복 등록이 차단된다.

### 4단계: 시간 모드

범위:

- 절대 시간 모드
- 공백 압축 모드
- 압축 경계와 실제 생략 기간
- 표시 밀도 단계

완료 기준:

- 동일 데이터에서 두 모드가 전환된다.
- 압축 변환이 단조 증가하고 역변환된다.
- 기간 항목의 시작·종료점과 내부 사건은 유지하면서 긴 내부 시간폭을 압축한다.

### 5단계: 운영 안정화

범위:

- Notion Webhook
- 정기 전체 동기화
- 오류 기록과 관리자 진단
- JSON 스냅숏
- 모바일 열람

완료 기준:

- Notion 직접 수정이 정해진 시간 안에 반영된다.
- Notion 장애 중에도 마지막 정상 목록을 열람할 수 있다.
- 잘못된 변경과 실패한 Import를 추적하고 복구할 수 있다.

## 21. 성공 지표

| 지표 | 초기 목표 |
|---|---|
| 동시대 비교 질문 탐색 | 대표 질문을 30초 안에 확인 |
| 일반 사건 등록 | 직접 입력 또는 JSON 붙여넣기부터 등록 승인까지 1분 이내 |
| 등록 승인 전 원본 변경 | 0건 |
| 실패 항목의 공개 노출 | 0건 |
| 정확히 같은 JSON의 중복 등록 | 0건 |
| 필수 필드 누락 공개 데이터 | 0건 |
| Import 후 화면 반영 | 일반적으로 10초 이내 |
| Notion 직접 수정 반영 | 일반적으로 5분 이내 |
| 화면 상태 복원 성공률 | 99% 이상 |
| 상세 미선택 상태의 본문 조회 | 0건 |

## 22. 주요 위험과 대응

| 위험 | 대응 |
|---|---|
| ChatGPT가 잘못된 사실이나 출처를 생성 | 출처와 Confidence 표시, 사용자 최종 승인 |
| ChatGPT가 스키마 밖의 JSON을 생성 | schemaVersion, 엄격한 검증, 필드 경로 오류 |
| 같은 항목을 반복 등록 | ImportFingerprint와 의미상 중복 검색 |
| 단일 항목 저장 중 일부 단계 실패 | Draft 유지, 입력값 보존과 재시도 메시지 |
| Notion 직접 편집으로 필수 필드 누락 | 공개 목록에서 제외하고 관리자 진단 표시 |
| Notion API 지연과 제한 | 목록 캐시, 상세 지연 조회, 중앙 재시도 |
| 캐시와 Notion 불일치 | Import 후 재조회, Webhook, 정기 전체 동기화 |
| 공백 압축이 시간 감각을 왜곡 | 공통 압축 지도, 단절 표시, 절대 시간 전환 |
| 카테고리가 과도하게 증가 | 2단계 Track 제한과 Tags 사용 |
| 사건 카드가 과도하게 겹침 | 결정적 레인 배치, 표시 밀도와 가상화 |
| Timeline 컴포넌트가 비대해짐 | 날짜, scale, lane과 visibility를 순수 모듈로 분리 |
| Notion에 종속됨 | 정규화 모델과 repository 경계 유지 |

## 23. 남은 결정 사항

- 읽기 화면을 완전 비공개로 둘지 일부 공개할지
- 공백으로 판단할 기본 연도와 압축 높이
- simple 항목의 출처 누락을 경고로 둘지 저장 차단할지
- 정규화 JSON 스냅숏의 보관 위치와 주기

이 결정들은 기본 코드 경계를 바꾸지 않으며 설정과 운영 정책으로 흡수할 수 있어야 한다.

## 24. MVP 승인 체크리스트

- [ ] ChatGPT는 JSON만 생성하며 시스템과 직접 연결되지 않는다.
- [ ] JSON Schema 1.0과 Notion 스키마가 문서화되어 있다.
- [ ] 사용자가 `Notion에 등록`을 누르기 전에는 Notion이 변경되지 않는다.
- [ ] 성공한 항목은 Notion 데이터를 다시 읽어 렌더링한다.
- [ ] 실패한 항목은 Draft로 남고 공개되지 않는다.
- [ ] BCE와 CE가 year 0 없이 연속 좌표로 계산된다.
- [ ] 하나의 항목이 여러 Track에 속해도 원본 데이터는 중복되지 않는다.
- [ ] 목록과 상세 조회가 분리되어 있다.
- [ ] 화면 밖 항목이 가상화된다.
- [ ] React 컴포넌트가 Notion SDK 타입에 의존하지 않는다.
- [ ] 시간 계산과 레인 배치가 UI에서 분리되어 테스트된다.
- [ ] 관리자 쓰기 경로와 Notion 비밀키가 보호된다.
- [ ] Notion 직접 수정과 캐시 갱신 경로가 정의되어 있다.
- [ ] 숨김, Draft와 스냅숏을 이용한 복구가 가능하다.

## 25. 최종 권고

첫 구현은 다음 네 요소에 집중한다.

1. Notion 원본 DB와 안정적인 정규화 계층
2. 세로 시간축과 가로 Track의 읽기 전용 연대표
3. 직접 입력·JSON 사건 등록의 자동 검증과 Draft 기반 저장
4. 목록 캐시, 상세 지연 조회와 가상화

ChatGPT 직접 연결을 제거함으로써 제품은 특정 ChatGPT 플랜, MCP 권한과 원격 쓰기 승인 정책에 의존하지 않는다. 사용자가 JSON을 직접 전달하고 등록 버튼을 누르는 행위가 명확한 승인 경계가 된다.

Notion은 유일한 원본으로 유지하고 히스토리 페이지는 정규화된 읽기 모델을 사용한다. UI, 도메인 계산, 서버 use case와 Notion 어댑터를 분리하여 연대표 컴포넌트나 API 파일 하나가 비대해지지 않게 한다.

이 구조로 핵심 탐색과 사건 등록 흐름을 먼저 검증한 뒤, 공백 압축, Webhook, 관계 표현, 공개 공유와 데이터베이스 이전을 실제 필요에 따라 단계적으로 확장한다.
