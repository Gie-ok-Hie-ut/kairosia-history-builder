import type { ImportItem } from "../domain/import/schema";

type DateSpec = {
  year: number;
  era?: "BCE" | "CE";
  precision?: ImportItem["time"]["start"]["precision"];
};

type ExpansionSeedItem = {
  title: string;
  start: DateSpec;
  end?: DateSpec;
  basis?: ImportItem["time"]["basis"];
  tracks: string[];
  tags: string[];
  summary: string;
  detail: string;
  confidence?: ImportItem["confidence"];
  uncertaintyNote?: string;
  location?: ImportItem["location"];
  sources: ImportItem["sources"];
};

const KOREA_ANCIENT_TIMELINE = source(
  "reference",
  "고대 사회의 발전 연표",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/ta/print.do?levelId=ta_h61_0040&whereStr=",
);
const GOJOSEON_HISTORY = source(
  "reference",
  "고조선의 성장과 변천",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/ta/view.do?levelId=ta_m71_0020_0020_0010_0020",
);
const KOREA_CHRONOLOGY = source(
  "reference",
  "한국사연대기",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/kc/setItemsKCList.do",
);
const UNIFIED_SILLA_AND_BALHAE = source(
  "reference",
  "통일 신라와 발해",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/ta/view.do?levelId=ta_m31_0060",
);
const GORYEO_HISTORY = source(
  "reference",
  "고려 왕조의 성립과 발전",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/nh/view.do?levelId=nh_012_0010",
);
const KOREAN_EMPIRE_HISTORY = source(
  "reference",
  "대한제국과 광무개혁",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/kc/printViewPopup.do?levelId=kc_i401000",
);
const COLONIAL_KOREA_HISTORY = source(
  "reference",
  "일제 강점기의 식민 통치",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/ta/view.do?levelId=ta_h62_0040_0020_0010",
);
const KOREAN_GOVERNMENTS_HISTORY = source(
  "reference",
  "1948년 남북한 정부 수립",
  "국사편찬위원회 우리역사넷",
  "https://contents.history.go.kr/front/hm/print.do?levelId=hm_145_0030",
);
const EAST_ASIA_1900_1950 = source(
  "reference",
  "Key Points Across East Asia, 1900-1950",
  "Columbia University, Asia for Educators",
  "https://afe.easia.columbia.edu/main_pop/kpct/kp_1900-1950.htm",
);
const MEDIEVAL_EUROPE = source(
  "reference",
  "Medieval Art: A Resource for Educators",
  "The Metropolitan Museum of Art",
  "https://resources.metmuseum.org/resources/metpublications/pdf/Medieval_Art_A_Resource_for_Educators.pdf",
);
const RENAISSANCE_EUROPE = source(
  "reference",
  "The Art of Renaissance Europe",
  "The Metropolitan Museum of Art",
  "https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/renaissance.pdf",
);
const EUROPEAN_INTEGRATION = source(
  "reference",
  "History of the European Union, 1945-1959",
  "European Union",
  "https://european-union.europa.eu/principles-countries-history/history-eu/1945-59_en",
);

export const HISTORY_EXPANSION_ITEMS: ImportItem[] = [
  historyItem({
    title: "고조선의 성립과 성장",
    start: { year: 800, era: "BCE", precision: "estimated" },
    end: { year: 108, era: "BCE" },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "고조선", "청동기", "초기 국가"],
    summary: "청동기 문화를 바탕으로 성장한 고조선이 기원전 4세기 무렵에는 넓은 영역을 다스리는 국가로 발전했다.",
    detail: "고조선은 한반도 북부와 요령 일대의 청동기 문화 속에서 성장한 한국사의 첫 국가다. 문헌에는 기원전 4세기부터 국가적 실체가 뚜렷하게 나타나며, 위만조선을 거쳐 기원전 108년 한과의 전쟁으로 멸망했다. 단군의 기원전 2333년 건국은 역사적 전통 연대로 구분해 이해할 필요가 있다.",
    confidence: "disputed",
    uncertaintyNote: "고조선의 정확한 성립 시기와 중심지는 학계의 견해가 갈린다. 시작점은 고조선 초기로 제시되는 기원전 8세기를 넓은 범위의 기준으로 사용했다.",
    sources: [GOJOSEON_HISTORY],
  }),
  historyItem({
    title: "신라 건국",
    start: { year: 57, era: "BCE" },
    tracks: ["korean-history"],
    tags: ["한국사", "신라", "건국", "삼국"],
    summary: "『삼국사기』의 전통 편년에 따르면 박혁거세가 기원전 57년 사로국을 세웠고, 이후 신라로 성장했다.",
    detail: "경주 지역의 여러 집단을 기반으로 출발한 사로국은 주변 소국을 통합하고 왕권과 율령 체제를 정비하며 신라로 발전했다. 기원전 57년은 후대 사서가 전하는 전통적 건국 연대다.",
    confidence: "disputed",
    uncertaintyNote: "초기 신라의 건국 연대는 후대 편찬 사료에 근거하므로 국가 형성의 실제 과정과 구분해야 한다.",
    location: location("경주", 35.8562, 129.2247, "approximate"),
    sources: [KOREA_ANCIENT_TIMELINE, KOREA_CHRONOLOGY],
  }),
  historyItem({
    title: "고구려 건국",
    start: { year: 37, era: "BCE" },
    tracks: ["korean-history"],
    tags: ["한국사", "고구려", "건국", "삼국"],
    summary: "전통 편년에 따르면 주몽이 기원전 37년 졸본 지역에 고구려를 세웠다.",
    detail: "압록강 중류와 졸본 일대에서 성장한 고구려는 주변 집단을 통합하고 한 군현 세력과 경쟁하며 강력한 고대 국가로 발전했다. 기원전 37년은 『삼국사기』가 전하는 건국 연대다.",
    confidence: "disputed",
    uncertaintyNote: "건국 설화의 전통 연대와 고고학적으로 확인되는 국가 형성 과정 사이에는 차이가 있다.",
    location: location("졸본 추정 지역", 41.15, 126.18, "approximate"),
    sources: [KOREA_ANCIENT_TIMELINE, KOREA_CHRONOLOGY],
  }),
  historyItem({
    title: "백제 건국",
    start: { year: 18, era: "BCE" },
    tracks: ["korean-history"],
    tags: ["한국사", "백제", "건국", "삼국"],
    summary: "전통 편년에 따르면 온조가 기원전 18년 한강 유역에 백제를 세웠다.",
    detail: "한강 유역에서 성장한 백제는 마한의 여러 세력을 통합하고 중국 및 일본 열도와 활발히 교류한 고대 국가로 발전했다. 기원전 18년은 『삼국사기』가 전하는 건국 연대다.",
    confidence: "disputed",
    uncertaintyNote: "초기 백제의 중심지와 국가 형성 시점은 문헌 해석과 고고학 자료에 따라 견해가 갈린다.",
    location: location("한성백제 유적 지구", 37.515, 127.116, "approximate"),
    sources: [KOREA_ANCIENT_TIMELINE, KOREA_CHRONOLOGY],
  }),
  historyItem({
    title: "삼국의 성립과 발전",
    start: { year: 57, era: "BCE", precision: "estimated" },
    end: { year: 668 },
    tracks: ["korean-history"],
    tags: ["한국사", "고구려", "백제", "신라", "삼국 시대"],
    summary: "고구려·백제·신라가 주변 소국을 통합하고 중앙집권 국가로 발전하며 한반도와 만주에서 경쟁했다.",
    detail: "삼국은 각각 독자적인 정치·문화 기반을 발전시키면서 중국 왕조, 북방 세력, 일본 열도와 교류하고 경쟁했다. 7세기 백제와 고구려의 멸망, 신라의 통일 질서 형성으로 이 장기 국면이 전환됐다.",
    confidence: "medium",
    uncertaintyNote: "시작점은 세 나라의 전통적 건국 연대 가운데 가장 이른 연대를 사용했으며, 중앙집권 국가의 실질적 성립은 더 늦게 진행됐다.",
    sources: [KOREA_ANCIENT_TIMELINE],
  }),
  historyItem({
    title: "가야 연맹의 형성과 전개",
    start: { year: 42, precision: "estimated" },
    end: { year: 562 },
    tracks: ["korean-history"],
    tags: ["한국사", "가야", "금관가야", "대가야", "철기"],
    summary: "낙동강 유역의 여러 가야 세력이 철 생산과 해상 교역을 바탕으로 연맹체를 이루었다.",
    detail: "가야는 하나의 통일 왕국이 아니라 금관가야와 대가야 등 여러 정치체가 주도권을 바꿔 가며 형성한 연맹 질서였다. 백제·신라 및 일본 열도와 교류했고, 562년 대가야가 신라에 병합되며 정치적 독립을 잃었다.",
    confidence: "disputed",
    uncertaintyNote: "42년은 김수로왕 설화에 따른 전통 연대이며 여러 가야 정치체의 실제 성립 시점은 서로 다르다.",
    location: location("김해 대성동 고분군", 35.236, 128.88, "approximate"),
    sources: [KOREA_CHRONOLOGY],
  }),
  historyItem({
    title: "통일신라 시대",
    start: { year: 676 },
    end: { year: 935 },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "통일신라", "남북국 시대"],
    summary: "신라가 대동강 이남의 통일 질서를 세우고 왕권·불교문화·대외 교류를 발전시켰다.",
    detail: "676년 나당전쟁 이후 신라는 한반도 중남부를 지배하는 통일 질서를 확립했다. 왕권과 관료제가 정비되고 불국사·석굴암 같은 불교문화가 발전했으나, 후기에는 귀족 갈등과 지방 호족의 성장으로 후삼국 분열을 맞았다.",
    sources: [UNIFIED_SILLA_AND_BALHAE],
  }),
  historyItem({
    title: "발해의 건국과 발전",
    start: { year: 698 },
    end: { year: 926 },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "발해", "고구려 계승", "남북국 시대"],
    summary: "대조영이 발해를 세우고 고구려 유민과 말갈계 집단을 아우르며 만주와 연해주 일대의 국가로 발전시켰다.",
    detail: "발해는 고구려의 정치·문화 전통을 계승하면서 당과 교류하고 독자적인 중앙 통치 체제를 발전시켰다. 926년 거란의 공격으로 멸망했으며 많은 유민이 고려로 이동했다.",
    location: location("발해 상경용천부 유적", 44.12, 129.22, "approximate"),
    sources: [UNIFIED_SILLA_AND_BALHAE],
  }),
  historyItem({
    title: "고려 왕조",
    start: { year: 918 },
    end: { year: 1392 },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "고려", "왕조", "후삼국 통일"],
    summary: "왕건이 세운 고려가 후삼국을 통일하고 문벌·무신 정권, 몽골 간섭기를 거치며 지속됐다.",
    detail: "고려는 936년 후삼국을 통일하고 불교와 유교 관료제를 함께 발전시켰다. 거란·여진·몽골과 관계를 맺고 전쟁과 교섭을 거듭했으며, 14세기 개혁과 권력 재편 끝에 조선으로 교체됐다.",
    location: location("개성", 37.97, 126.55, "approximate"),
    sources: [GORYEO_HISTORY],
  }),
  historyItem({
    title: "조선 왕조",
    start: { year: 1392 },
    end: { year: 1897 },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "조선", "왕조", "성리학"],
    summary: "조선이 성리학적 통치 질서와 중앙집권 체제를 세우고 5세기 동안 한반도를 통치했다.",
    detail: "조선은 관료제·법전·교육과 향촌 질서를 정비하고 훈민정음을 창제했다. 임진왜란과 병자호란, 사회경제 변화와 세도정치를 거쳐 19세기 제국주의 질서와 근대 개혁의 압력에 직면했다.",
    location: location("한양", 37.5796, 126.977, "approximate"),
    sources: [KOREA_CHRONOLOGY],
  }),
  historyItem({
    title: "대한제국 수립과 광무개혁",
    start: { year: 1897 },
    end: { year: 1910 },
    basis: "existence",
    tracks: ["korean-history"],
    tags: ["한국사", "대한제국", "광무개혁", "근대국가"],
    summary: "고종이 황제로 즉위해 대한제국을 선포하고 자주 독립과 근대 국가 건설을 위한 개혁을 추진했다.",
    detail: "대한제국은 국호와 황제국 체제를 선포하고 양전·지계 사업, 산업 진흥, 도시 정비와 군제 개혁을 추진했다. 그러나 러일전쟁 이후 일본의 침략이 심화되면서 외교권과 군사권을 잃고 1910년 강제 병합됐다.",
    location: location("환구단", 37.5657, 126.9793, "approximate"),
    sources: [KOREAN_EMPIRE_HISTORY],
  }),
  historyItem({
    title: "일제강점기",
    start: { year: 1910 },
    end: { year: 1945 },
    tracks: ["korean-history"],
    tags: ["한국사", "일제강점기", "식민 통치", "독립운동"],
    summary: "일본의 강제 병합으로 한국이 식민 통치를 받았고 국내외에서 다양한 독립운동이 전개됐다.",
    detail: "조선총독부는 무단 통치와 동화 정책, 경제적 수탈과 전시 동원을 시행했다. 이에 맞서 3·1운동, 대한민국임시정부, 의열·무장 투쟁과 문화·교육 운동 등 여러 독립운동이 이어졌다.",
    sources: [COLONIAL_KOREA_HISTORY],
  }),
  historyItem({
    title: "대한민국 정부와 북한 정부 수립",
    start: { year: 1948 },
    tracks: ["korean-history", "world-history"],
    tags: ["한국사", "대한민국", "북한", "정부 수립", "분단"],
    summary: "1948년 8월 대한민국 정부가, 9월 북한 정부가 각각 수립되면서 한반도의 분단 체제가 제도화됐다.",
    detail: "미소의 분할 점령과 통일 정부 수립 협상의 실패 속에서 5·10 총선거와 제헌국회를 거쳐 8월 15일 대한민국 정부가 출범했다. 북쪽에서는 9월 9일 조선민주주의인민공화국 수립이 선포됐다.",
    sources: [KOREAN_GOVERNMENTS_HISTORY],
  }),
  historyItem({
    title: "청일전쟁",
    start: { year: 1894 },
    end: { year: 1895 },
    tracks: [
      "east-asian-history",
      "chinese-history",
      "korean-history",
      "world-history",
    ],
    tags: ["동아시아사", "청일전쟁", "조선", "청", "일본"],
    summary: "조선을 둘러싼 청과 일본의 경쟁이 전쟁으로 폭발했고 일본의 승리로 동아시아 국제 질서가 크게 바뀌었다.",
    detail: "동학농민운동을 계기로 조선에 들어온 청·일 양국 군대의 대립이 전면전으로 이어졌다. 시모노세키조약 이후 청의 영향력이 약화되고 일본의 제국주의적 팽창이 본격화됐다.",
    sources: [EAST_ASIA_1900_1950],
  }),
  historyItem({
    title: "일본 제국의 동아시아 팽창",
    start: { year: 1895 },
    end: { year: 1945 },
    tracks: [
      "east-asian-history",
      "korean-history",
      "chinese-history",
      "world-history",
    ],
    tags: ["동아시아사", "일본 제국주의", "식민지", "아시아태평양전쟁"],
    summary: "일본이 타이완과 한국을 식민지화하고 중국 침략과 아시아태평양전쟁으로 제국의 지배권을 확대했다.",
    detail: "청일전쟁 이후 일본은 타이완을 식민지화하고 1910년 한국을 강제 병합했다. 만주사변과 중일전쟁을 거쳐 동남아시아와 태평양으로 전쟁을 확대했으며 1945년 패전으로 제국 질서가 해체됐다.",
    sources: [EAST_ASIA_1900_1950],
  }),
  historyItem({
    title: "중세 유럽",
    start: { year: 500, precision: "estimated" },
    end: { year: 1500, precision: "estimated" },
    tracks: ["european-history", "world-history", "christian-history"],
    tags: ["유럽사", "중세", "봉건제", "그리스도교 세계"],
    summary: "서로마 제국 이후 유럽에서 왕국·교회·도시와 봉건적 관계가 변화하며 중세 사회가 형성됐다.",
    detail: "중세 유럽은 하나의 고정된 체제가 아니라 서로마 제국 이후의 왕국 형성, 비잔틴과 이슬람 세계와의 관계, 교황권과 왕권, 봉건적 토지 관계, 도시와 대학의 성장까지 아우르는 긴 시기다.",
    confidence: "medium",
    uncertaintyNote: "중세의 시작과 끝은 지역과 연구 관점에 따라 달라지며 500~1500년은 널리 쓰이는 개괄적 범위다.",
    sources: [MEDIEVAL_EUROPE],
  }),
  historyItem({
    title: "유럽 르네상스",
    start: { year: 1400, precision: "estimated" },
    end: { year: 1650, precision: "estimated" },
    tracks: ["european-history", "world-history"],
    tags: ["유럽사", "르네상스", "인문주의", "예술", "과학"],
    summary: "고전 문화의 재해석과 인문주의, 도시 문화와 예술·학문의 변화가 유럽 여러 지역으로 확산됐다.",
    detail: "르네상스는 이탈리아 도시들에서 두드러지게 전개된 고전 문화의 재발견과 새로운 후원·교육·예술 실천이 유럽 각지로 확산된 장기 변화다. 중세와 단절된 단일 사건이라기보다 지역별로 시기와 양상이 달랐다.",
    confidence: "medium",
    uncertaintyNote: "르네상스의 범위는 지역과 분야에 따라 14세기부터 17세기까지 다르게 설정된다.",
    sources: [RENAISSANCE_EUROPE],
  }),
  historyItem({
    title: "유럽 통합의 전개",
    start: { year: 1951 },
    end: { year: 1993 },
    tracks: ["european-history", "world-history"],
    tags: ["유럽사", "유럽 통합", "유럽공동체", "유럽연합"],
    summary: "석탄철강공동체에서 유럽경제공동체를 거쳐 유럽연합 출범으로 이어지는 제도적 통합이 진행됐다.",
    detail: "제2차 세계대전 이후 서유럽 국가들은 전쟁 재발을 막고 경제를 재건하기 위해 핵심 산업과 시장을 공동 관리하기 시작했다. 1951년 석탄철강공동체, 1957년 로마조약을 거쳐 1993년 유럽연합이 출범했다.",
    sources: [EUROPEAN_INTEGRATION],
  }),
];

export const EAST_ASIAN_RELATED_TITLES = [
  "공자의 생애와 유가 사상의 형성",
  "당 왕조",
  "몽골 제국 성립",
  "원 왕조",
  "명 왕조",
  "청 왕조",
  "메이지 유신과 근대국가 체제의 형성",
  "중화인민공화국 수립",
  "개혁개방의 시작과 확대",
] as const;

export const EAST_ASIAN_KOREAN_TITLES_TO_DETACH = [
  "삼국의 성립과 발전",
  "가야 연맹의 형성과 전개",
  "통일신라 시대",
  "발해의 건국과 발전",
  "고려 왕조",
  "조선 왕조",
  "대한제국 수립과 광무개혁",
  "일제강점기",
  "대한민국 정부와 북한 정부 수립",
  "백제·고구려 멸망과 신라의 통일 질서 형성",
  "조선 건국",
  "임진왜란",
  "강화도조약 체결",
  "동학농민운동",
  "8·15 광복과 한반도 분단",
  "한국전쟁",
] as const;

export const EUROPEAN_RELATED_TITLES = [
  "클레이스테네스 개혁과 아테네 민주정의 기반",
  "로마 공화정",
  "포에니 전쟁",
  "로마 제국 시대",
  "서로마 제국의 종말",
  "동서 교회 분열의 상징적 분기",
  "토마스 아퀴나스의 『신학대전』 집필",
  "콘스탄티노폴리스 함락",
  "콜럼버스의 카리브해 도착과 대서양 교환의 확대",
  "루터의 95개조와 종교개혁의 전개",
  "코페르니쿠스의 『천구의 회전에 관하여』",
  "트리엔트 공의회",
  "데카르트의 『성찰』 출간",
  "뉴턴의 『프린키피아』 출간",
  "산업혁명",
  "칸트의 『순수이성비판』 출간",
  "프랑스 혁명",
  "다윈의 『종의 기원』 출간",
  "제1차 세계대전",
  "아인슈타인의 상대성이론",
  "양자역학의 정립",
  "제2차 세계대전",
] as const;

function historyItem(input: ExpansionSeedItem): ImportItem {
  return {
    title: input.title,
    type: "event",
    time: {
      start: instant(input.start),
      end: input.end ? instant(input.end) : null,
      basis: input.basis ?? (input.end ? "duration" : "point"),
    },
    trackKeys: input.tracks,
    tags: input.tags,
    importance: "core",
    summary: input.summary,
    detailMarkdown: input.detail,
    recordLevel: "standard",
    confidence: input.confidence ?? "high",
    uncertaintyNote: input.uncertaintyNote ?? null,
    location: input.location ?? null,
    sources: input.sources,
  };
}

function instant(input: DateSpec): ImportItem["time"]["start"] {
  return {
    year: input.year,
    era: input.era ?? "CE",
    precision: input.precision ?? "year",
  };
}

function location(
  name: string,
  latitude: number,
  longitude: number,
  precision: "exact" | "approximate",
): NonNullable<ImportItem["location"]> {
  return { name, latitude, longitude, precision };
}

function source(
  type: ImportItem["sources"][number]["type"],
  title: string,
  author: string,
  url: string,
): ImportItem["sources"][number] {
  return { type, title, author, url };
}
