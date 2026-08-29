# Kairosia: HistoryBuilder

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Gie-ok-Hie-ut/kairosia-history-builder)

[한국어](#한국어) | [English](#english)

## 한국어

**Kairosia: HistoryBuilder**는 Notion을 데이터 저장소로 사용해 여러 역사 분야를 하나의 세로 시간축에서 비교하는 "내가 만들어가는 역사 지도"입니다. ChatGPT에는 약속된 JSON 스키마로 자료를 요청하고, 사용자가 검토한 데이터만 Import 화면을 통해 Notion에 반영합니다.

### 주요 기능

- BCE/CE가 끊기지 않는 세로 연표와 `초반·중반·후반` 세기 구간
- 절대 시간과 공백 압축 모드, 연도 이동, 확대/축소. 공백 압축은 빈 구간뿐 아니라 장기 사건 내부의 긴 시간폭도 시작·종료점과 내부 사건을 보존하며 축약
- 한국사·세계사·기독교사 등 Track을 상단에서 즉시 켜고 끄는 비교 보기
- 마우스 위치의 연도와 세기 구간을 보여주는 실시간 가로 가이드
- 기간 사건을 배경 범위로, 그 안의 짧은 사건을 앞쪽 lane으로 배치
- 사건 상세, 출처, 신뢰도, 불확실성, Leaflet 지도와 Google Maps 링크
- JSON Schema 1.0 검증, 중복 후보 탐지, Notion Draft/Published 반영
- 상세 패널에서 Notion 항목을 휴지통으로 이동하는 관리자 삭제
- 상세 패널에서 제목·요약·유형·중요도·신뢰도·Track·태그를 수정하고 Notion과 즉시 동기화
- 상단 눈 토글로 숨긴 사건을 함께 보고, 상세 패널에서 사건을 숨기거나 복원
- 목록 가상화, 목록/상세 캐시 분리, Notion webhook 캐시 무효화

### 빠른 시작

Node.js `>=22.13.0`이 필요합니다.

```bash
git clone https://github.com/Gie-ok-Hie-ut/kairosia-history-builder.git
cd kairosia-history-builder
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Notion 환경변수를 설정하지 않으면 샘플 데이터로 실행됩니다.

### Notion 연결

1. [Notion Connections](https://www.notion.so/profile/integrations)에서 내부 Connection을 만들고 **Read content**, **Insert content**, **Update content** 권한을 허용합니다.
2. 인증 방식은 개인 워크스페이스용 **Access token**을 선택합니다.
3. 아래 스키마로 `Tracks`, `Timeline Items` 데이터 소스를 만듭니다.
4. 두 데이터베이스의 `Connections` 메뉴에서 만든 Connection을 연결합니다.
5. Connection의 secret과 두 data source ID를 `.env.local`에 입력합니다.
6. 개발 서버를 다시 시작합니다.

```dotenv
NOTION_API_KEY=ntn_...
NOTION_TRACKS_DATA_SOURCE_ID=...
NOTION_ITEMS_DATA_SOURCE_ID=...
NOTION_WEBHOOK_TOKEN=...
ADMIN_EMAILS=you@example.com
```

토큰은 서버에서만 읽습니다. `.env.local`은 `.gitignore`에 포함되어 있으므로 GitHub에 커밋하지 마세요.

#### Tracks 스키마

| 속성 | Notion 타입 |
|---|---|
| `Name` | Title |
| `Key` | Rich text |
| `Order` | Number |
| `Color` | Select |
| `Parent` | 같은 data source Relation |
| `Visible` | Checkbox |
| `Description` | Rich text |

`Color`는 `teal`, `blue`, `amber`, `red`, `violet`, `green`, `gray` 또는 CSS 색상 문자열을 사용합니다.

#### Timeline Items 스키마

| 속성 | Notion 타입 |
|---|---|
| `Title` | Title |
| `Type`, `StartEra`, `EndEra`, `StartPrecision`, `EndPrecision`, `TimeBasis` | Select |
| `Importance`, `RecordLevel`, `Confidence`, `Status` | Select |
| `StartYear`, `StartMonth`, `StartDay`, `EndYear`, `EndMonth`, `EndDay` | Number |
| `Tracks` | Tracks Relation |
| `RelatedItems` | 같은 data source Relation |
| `Tags` | Multi-select |
| `Summary`, `UncertaintyNote`, `Slug`, `ImportFingerprint`, `PlaceName` | Rich text |
| `Latitude`, `Longitude` | Number |
| `LocationPrecision` | Select (`exact`, `approximate`) |

기본 연표와 공개 API에는 `Status=Published` 항목만 표시됩니다. `Hidden` 항목은 관리자용 눈 토글을 켰을 때만 별도 조회되며 `Draft`는 표시되지 않습니다. 상세 설명과 출처는 각 Timeline Item 페이지의 블록으로 저장됩니다.

### 기본 역사 데이터 넣기

미국사, 중국사, 이스라엘사, 철학사, 과학사 Track과 엄선한 핵심 사건을 선택적으로 넣을 수 있습니다.

```bash
npm run seed:core
```

시드는 Track key와 Import fingerprint를 기준으로 재실행 가능하게 설계됐습니다. 이스라엘의 성경 시대는 복음주의 개신교의 정경 서사와 전통적 연대를 기준으로 하며, 출애굽 연대나 통일왕국처럼 논쟁적인 항목에는 `Confidence=disputed`와 별도 설명이 포함됩니다.

### 사건 등록

상단의 **사건 등록**을 열면 왼쪽 직접 입력 폼과 오른쪽 JSON 편집기가 동시에 표시됩니다. 두 영역은 하나의 사건 데이터를 공유하므로 직접 입력한 내용은 즉시 JSON에 반영되고, JSON은 문법과 스키마가 유효할 때 직접 입력 폼에 반영됩니다. 한 번에 정확히 한 사건만 등록할 수 있으며, 오류, 경고와 중복 후보는 입력 중 자동으로 검사됩니다. 최종 확인 후 **Notion에 등록**을 누릅니다.

ChatGPT를 사용할 때는 `domain/import/schema.ts`의 구조를 따르고 `items`에 사건 하나만 포함하는 `schemaVersion: "1.0"` JSON을 요청한 뒤 오른쪽 JSON 편집기에 붙여넣습니다.

```json
{
  "schemaVersion": "1.0",
  "items": [
    {
      "title": "사건 이름",
      "type": "event",
      "time": {
        "start": { "year": 1546, "era": "CE", "precision": "year" },
        "end": null,
        "basis": "point"
      },
      "trackKeys": ["world-history"],
      "tags": ["예시"],
      "importance": "core",
      "summary": "280자 이하 요약",
      "detailMarkdown": "검토 가능한 상세 설명",
      "recordLevel": "standard",
      "confidence": "high",
      "uncertaintyNote": null,
      "location": null,
      "sources": [
        {
          "type": "reference",
          "title": "출처 제목",
          "author": "기관 또는 저자",
          "url": "https://example.com"
        }
      ]
    }
  ]
}
```

### 편집, 삭제와 Notion 배지

- 우측 상단 **Notion** 배지는 현재 연결된 Timeline Items 데이터베이스를 뜻하며, 클릭하면 로그인된 Notion에서 해당 데이터베이스를 엽니다.
- 상세 패널의 연필 버튼에서 제목, 요약, 유형, 중요도, 신뢰도, 불확실성 설명, Track과 태그를 수정할 수 있습니다. 저장하면 Notion 속성과 현재 연표가 함께 갱신됩니다.
- Track 필터 줄의 눈 버튼을 켜면 현재 Track 위에 숨긴 사건도 흐린 점선 카드로 함께 표시됩니다. 상세 패널의 눈 버튼은 Notion `Status`를 `Hidden` 또는 `Published`로 바꿔 사건을 숨기거나 복원합니다.
- 날짜 범위, 상세 본문 블록, 출처와 지도 좌표는 현재 편집 화면에서 변경하지 않으며 기존 값을 유지합니다.
- 상세 패널의 휴지통 버튼은 항목을 영구 삭제하지 않고 Notion **휴지통으로 이동**합니다. Notion API는 영구 삭제를 지원하지 않으므로 Notion에서 복구할 수 있습니다.
- 로컬 개발에서는 localhost의 관리자 쓰기를 허용합니다. 운영 환경에서는 Cloudflare Access가 인증한 이메일이 `ADMIN_EMAILS`에 포함되어야 합니다.

### 지도

Leaflet과 OpenStreetMap 타일을 기본으로 사용하며 Google Maps API 키는 필요하지 않습니다. 지도의 위치 링크를 누르면 같은 좌표가 Google Maps에서 열립니다.

```dotenv
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors
```

### GitHub와 배포

이 프로젝트의 권장 운영 구조는 다음과 같습니다. 저장소에는 코드만 공개하고, 각 사용자가 자신의 Cloudflare Worker와 Notion을 소유합니다.

```text
공개 GitHub 저장소
  -> Fork 또는 Deploy to Cloudflare
  -> 사용자별 Cloudflare Worker
  -> 사용자별 Notion Connection과 데이터베이스
```

GitHub Pages는 정적 파일만 제공하므로 Notion token과 편집 API가 필요한 Kairosia 전체 기능을 실행할 수 없습니다. GitHub에는 소스를 두고 Cloudflare Workers에서 앱을 실행합니다. 개인 서버는 필요하지 않습니다.

#### 처음 배포하는 사용자

1. 위의 **Deploy to Cloudflare** 버튼을 누르고 GitHub와 Cloudflare 계정에 로그인합니다.
2. Cloudflare가 만들 저장소와 Worker 이름을 확인합니다.
3. 배포 화면에서 아래 네 값을 입력합니다. 값은 Worker secret으로 저장되며 GitHub 저장소에는 들어가지 않습니다.

```dotenv
NOTION_API_KEY=ntn_...
NOTION_TRACKS_DATA_SOURCE_ID=...
NOTION_ITEMS_DATA_SOURCE_ID=...
ADMIN_EMAILS=you@example.com
```

4. 첫 배포가 끝나면 Cloudflare에서 **Workers & Pages > 해당 Worker > Access > Protect this Worker behind Access**를 선택합니다.
5. **All traffic**을 선택하고 본인 이메일을 허용하는 정책을 만든 뒤 적용합니다. Access에 허용한 이메일과 `ADMIN_EMAILS`가 같아야 등록·편집·숨김·삭제가 동작합니다.
6. 발급된 `*.workers.dev` 주소를 열고 읽기와 사건 편집을 확인합니다.

Cloudflare의 GitHub 연동은 이후 저장소의 `main` 브랜치에 변경을 push할 때 자동으로 다시 빌드하고 배포합니다. Notion token을 교체할 때는 GitHub가 아니라 **Worker > Settings > Variables and Secrets**에서 수정합니다.

#### 이 저장소 관리자의 첫 배포

1. GitHub에 빈 공개 저장소 `Gie-ok-Hie-ut/kairosia-history-builder`를 만들고 현재 코드를 `main`에 push합니다.
2. Cloudflare의 **Workers & Pages > Create > Import a repository**에서 이 저장소를 선택합니다.
3. Build command는 `npm run build`, Deploy command는 `npm run deploy`로 설정하고 위 네 secret을 입력합니다.
4. 배포 후 위와 같은 방법으로 Worker 전체에 Cloudflare Access를 적용합니다.

CLI로 직접 배포할 때는 Cloudflare 로그인 후 다음 명령을 사용합니다.

```bash
npm run deploy:local
```

`wrangler.jsonc`, `.dev.vars.example`, `package.json`의 binding 설명이 Cloudflare 배포 화면의 기본 구성을 제공합니다. 이 프로젝트는 MIT License를 사용하므로 누구나 Fork/Clone해 자신의 데이터를 연결할 수 있습니다.

> 보안: Cloudflare Access를 켜기 전에는 운영용 Notion secret을 연결하지 마세요. `cf-access-authenticated-user-email` 헤더는 Access가 Worker 앞에서 요청을 검증한다는 전제에서만 신뢰합니다. Notion token에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

### 구조

| 경로 | 역할 |
|---|---|
| `domain/timeline` | 역사 날짜, 시간축, 세기 구간, lane 계산과 canonical 타입 |
| `domain/import` | Schema 1.0, 정규화와 fingerprint |
| `server/use-cases` | 조회, Import, 편집, 숨김·복원, 삭제 흐름 조정 |
| `server/notion` | Notion API, mapper와 repository |
| `server/cache` | 목록과 상세 캐시 |
| `components/timeline` | 연표, hover 가이드, 지도와 상세 패널 |
| `components/import` | 직접 입력·JSON 동기화와 사건 등록 UI |
| `scripts` | 선택형 기본 역사 데이터 시드 |

```text
직접 입력 또는 ChatGPT JSON
  -> 자동 검증 API (/api/admin/import/preview)
  -> Zod 검증 / 날짜 정규화 / 중복 후보
  -> 사용자 승인
  -> Notion Draft + 본문/출처
  -> Published
  -> 캐시 무효화
  -> 연표 렌더링
```

### 검증

```bash
npm run typecheck
npm run lint
npm test
```

전체 기획과 결정 근거는 [`BRAIDED_HISTORY_PLAN.md`](./BRAIDED_HISTORY_PLAN.md)에 있습니다.

---

## English

**Kairosia: HistoryBuilder** is a personal history map that uses Notion as its data store and compares multiple historical fields on one vertical timeline. Ask ChatGPT for data in the agreed JSON schema, review it, and import only approved records into Notion.

### Features

- Continuous BCE/CE timeline with early, middle, and late century bands
- Absolute-time and compressed modes, year jump, and zoom controls. Compression also shortens long spans inside duration records while preserving their boundaries and nested event anchors
- Inline Track checkboxes for comparing national, religious, intellectual, and scientific histories
- Live horizontal hover guide showing labels such as `1546, 16C middle`
- Long-duration periods rendered as background ranges with shorter events layered above them
- Event details, sources, confidence, uncertainty, Leaflet maps, and Google Maps links
- JSON Schema 1.0 validation, duplicate detection, and Notion Draft/Published workflow
- Admin deletion that moves the corresponding Notion page to Trash
- Detail-panel editing for title, summary, type, importance, confidence, Tracks, and tags with immediate Notion synchronization
- Admin eye toggle for reviewing hidden records and detail-panel hide/restore actions
- Visible-range rendering, split list/detail caches, and Notion webhook invalidation

### Quick start

Node.js `>=22.13.0` is required.

```bash
git clone https://github.com/Gie-ok-Hie-ut/kairosia-history-builder.git
cd kairosia-history-builder
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Notion environment variables, the app runs with demo data.

### Connect Notion

1. Create an internal connection in [Notion Connections](https://www.notion.so/profile/integrations).
2. Grant **Read content**, **Insert content**, and **Update content** capabilities, then select **Access token** authentication for a personal workspace.
3. Create `Tracks` and `Timeline Items` data sources using the schemas below.
4. Open each Notion database and add the connection from its `Connections` menu.
5. Put the connection secret and both data source IDs in `.env.local`.
6. Restart the development server.

```dotenv
NOTION_API_KEY=ntn_...
NOTION_TRACKS_DATA_SOURCE_ID=...
NOTION_ITEMS_DATA_SOURCE_ID=...
NOTION_WEBHOOK_TOKEN=...
ADMIN_EMAILS=you@example.com
```

The token is server-only. `.env.local` is ignored by Git and must never be committed.

#### Tracks schema

| Property | Notion type |
|---|---|
| `Name` | Title |
| `Key` | Rich text |
| `Order` | Number |
| `Color` | Select |
| `Parent` | Relation to the same data source |
| `Visible` | Checkbox |
| `Description` | Rich text |

Use `teal`, `blue`, `amber`, `red`, `violet`, `green`, `gray`, or a CSS color string for `Color`.

#### Timeline Items schema

| Property | Notion type |
|---|---|
| `Title` | Title |
| `Type`, `StartEra`, `EndEra`, `StartPrecision`, `EndPrecision`, `TimeBasis` | Select |
| `Importance`, `RecordLevel`, `Confidence`, `Status` | Select |
| `StartYear`, `StartMonth`, `StartDay`, `EndYear`, `EndMonth`, `EndDay` | Number |
| `Tracks` | Relation to Tracks |
| `RelatedItems` | Relation to the same data source |
| `Tags` | Multi-select |
| `Summary`, `UncertaintyNote`, `Slug`, `ImportFingerprint`, `PlaceName` | Rich text |
| `Latitude`, `Longitude` | Number |
| `LocationPrecision` | Select (`exact`, `approximate`) |

Only records with `Status=Published` appear on the default timeline and public API. `Hidden` records are fetched separately only when an administrator enables the eye toggle, while `Draft` records never appear. Detail text and sources are stored as blocks inside each Timeline Item page.

### Seed the optional core dataset

The repository includes an idempotent seed for American, Chinese, Israel/Biblical, philosophy, and science history.

```bash
npm run seed:core
```

The biblical period follows an evangelical Protestant canonical narrative and traditional chronology. Disputed dates, including the Exodus and United Monarchy, are explicitly marked with `Confidence=disputed` and an uncertainty note.

### Register events

Open **Event registration** from the header to see the direct form and JSON editor side by side. Both areas share one event payload: direct edits are serialized to JSON immediately, while JSON updates the form only after its syntax and schema are valid. Registration accepts exactly one event at a time. Validation, warnings, and duplicate checks run automatically. Review them, then select **Register in Notion**.

When using ChatGPT, ask it to return only `schemaVersion: "1.0"` JSON matching `domain/import/schema.ts` with exactly one item, then paste that payload into the JSON editor.

The Korean section above contains a complete minimal JSON example.

### Editing, deletion, and the Notion badge

- The **Notion** badge identifies the connected Timeline Items database and opens it in Notion.
- The pencil button edits title, summary, type, importance, confidence, uncertainty notes, Tracks, and tags. Saving updates both Notion properties and the current timeline.
- The eye button in the Track filter row includes hidden records as muted dashed cards. The detail-panel eye button switches Notion `Status` between `Hidden` and `Published` to hide or restore one record.
- Date ranges, page-body details, sources, and map coordinates remain unchanged by this metadata editor.
- The trash button in the detail panel sends the page to **Notion Trash**. The Notion API does not support permanent page deletion, so the page remains recoverable from Notion.
- Localhost admin writes are allowed during development. In production, the email authenticated by Cloudflare Access must be listed in `ADMIN_EMAILS`.

### Maps

Leaflet and OpenStreetMap tiles are used by default, with no Google Maps API key. Each location can still be opened at the same coordinates in Google Maps.

### GitHub and deployment

The recommended deployment keeps source code public while every user owns a separate Cloudflare Worker, Notion connection, and Notion database.

```text
Public GitHub repository
  -> Fork or Deploy to Cloudflare
  -> One Cloudflare Worker per user
  -> That user's Notion connection and databases
```

GitHub Pages cannot run the complete app because it is static while Kairosia requires a private Notion token and server-side editing APIs. Keep the source on GitHub and run the app on Cloudflare Workers. No personal always-on server is required.

#### First-time users

1. Select **Deploy to Cloudflare** at the top of this README and sign in to GitHub and Cloudflare.
2. Confirm the repository copy and Worker name Cloudflare will create.
3. Enter the following four values. Cloudflare stores them as Worker secrets, not in GitHub.

```dotenv
NOTION_API_KEY=ntn_...
NOTION_TRACKS_DATA_SOURCE_ID=...
NOTION_ITEMS_DATA_SOURCE_ID=...
ADMIN_EMAILS=you@example.com
```

4. After the first deployment, open **Workers & Pages > your Worker > Access > Protect this Worker behind Access**.
5. Select **All traffic**, create an allow policy for your email, and apply it. The Access email and `ADMIN_EMAILS` must match for import, edit, visibility, and delete operations.
6. Open the assigned `*.workers.dev` URL and verify both reading and editing.

Cloudflare's GitHub integration rebuilds and deploys future pushes to `main`. Rotate Notion credentials under **Worker > Settings > Variables and Secrets**, never in GitHub.

#### First deployment for this repository's maintainer

1. Create the empty public repository `Gie-ok-Hie-ut/kairosia-history-builder` and push this working tree to `main`.
2. In Cloudflare, use **Workers & Pages > Create > Import a repository** and select that repository.
3. Set the build command to `npm run build`, the deploy command to `npm run deploy`, and add the four secrets above.
4. Protect all Worker traffic with Cloudflare Access after deployment.

For a direct CLI deployment after authenticating Wrangler, run:

```bash
npm run deploy:local
```

`wrangler.jsonc`, `.dev.vars.example`, and the binding descriptions in `package.json` provide Cloudflare's deployment defaults. The MIT License permits anyone to fork or clone the project and connect their own data.

> Security: do not attach production Notion secrets until Cloudflare Access protects the Worker. The app trusts `cf-access-authenticated-user-email` only when Access validates requests before they reach the Worker. Never prefix a Notion token with `NEXT_PUBLIC_`.

### Architecture

| Path | Responsibility |
|---|---|
| `domain/timeline` | Historical dates, scales, century phases, lane layout, canonical types |
| `domain/import` | Schema 1.0, normalization, fingerprints |
| `server/use-cases` | Read, import, edit, visibility, and delete orchestration |
| `server/notion` | Notion API, mappers, repository |
| `server/cache` | Dataset and detail caches |
| `components/timeline` | Timeline, hover guide, map, detail panel |
| `components/import` | Manual JSON validation and commit UI |
| `scripts` | Optional core-history seed |

### Verification

```bash
npm run typecheck
npm run lint
npm test
```

See [`BRAIDED_HISTORY_PLAN.md`](./BRAIDED_HISTORY_PLAN.md) for the original architecture plan and decision log.

## License

[MIT](./LICENSE)
