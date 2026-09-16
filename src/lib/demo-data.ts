import type {
  AnalysisHistory,
  AnalysisHistorySummary,
  BusinessPhrase,
  HistoryPage,
  PhrasePage,
  NuanceResponse,
} from "@/lib/backend";

/**
 * 백엔드 없이 배포된 사이트가 보여 줄 고정 예시.
 *
 * <p>`satisfies` 로 고정해 두었기 때문에 백엔드 DTO 에서 필드 이름이 바뀌거나 사라지면
 * 여기서 컴파일이 깨진다. 예시가 조용히 낡는 것을 막으려는 것이다.
 * (생성된 타입은 모든 필드가 선택이라, 백엔드에 *추가된* 필드까지 잡아내지는 못한다)
 *
 * <p>아래 값들은 실제 분석 응답을 그대로 옮긴 것이다. 그럴듯하게 지어낸 숫자가 아니라
 * 진짜 출력이어야 예시로서 의미가 있다.
 */

/** 사외에 보낸 완곡한 보류 — 이 제품이 잡아내려는 전형적인 소프트 리젝션. */
const SOFT_REJECTION = {
  totalScore: 73,
  category: "EMAIL",
  metrics: { politeness: 35, indirectness: 23, etiquette: 15 },
  evaluation: {
    summary:
      "경어 표현은 문법적으로 바르지만, 구체적인 검토 기한이나 후속 조치에 대한 언급이 없어 비즈니스상 완곡한 거절(소프트 리젝션)일 가능성이 있습니다.",
    keigo_check: true,
    cushion_phrase_check: false,
  },
  feedback: {
    issues: [
      "검토 기한이나 회신 일정에 대한 언급이 없습니다.",
      "쿠션어나 정중한 감사 표현이 생략되어 단순 보류 답변으로 느껴질 수 있습니다.",
    ],
    cultural_nuance:
      "일본 비즈니스에서 '検討させていただきます'는 긍정적 검토보다 완곡한 거절로 쓰이는 경우가 많습니다. 기한을 함께 묻지 않으면 그대로 흐지부지되기 쉽습니다.",
  },
  suggestions: [
    { text: "ご提案の件、社内で前向きに検討させていただきます。", level: "standard" },
    {
      text: "ご提案の件、社内で検討のうえ、今週中に改めてご連絡差し上げます。",
      level: "highest",
    },
  ],
  sentiment: {
    polarity: "Neutral",
    confidence: 0.85,
    honne: {
      tatemae: "제안해주신 내용은 내부에서 잘 검토해보겠습니다.",
      trueIntent: "현재로서는 채택할 의사가 크지 않으며, 우선순위에서 밀려 있거나 보류하고 싶습니다.",
      actionItem:
        "답변을 무작정 기다리기보다는 추가 논의나 피드백을 받을 수 있도록 기한 확인 및 대안 제안 메일을 송부하세요.",
    },
  },
  riskAnalysis: {
    riskLevel: "CAUTION",
    redFlags: ["'검토(検討)' 시그널 감지"],
    copingStrategy:
      "수동적으로 답변을 기다리기보다는 검토에 필요한 대략적인 일정(기한)을 정중히 묻거나, 제안 내용 수정 및 추가 안내가 가능함을 전달하는 것이 좋습니다.",
  },
  smartReplies: [
    {
      scenario: "Clarification",
      content:
        "ご検討いただき誠にありがとうございます。差し支えございませんでしたら、いつ頃を目処にご回答をいただけそうか、おおよそのスケジュールをお聞かせいただけますでしょうか。",
      description: "상대방의 실제 의도와 일정을 확인하기 위해 검토 완료 예상 시점을 정중히 묻는 질문입니다.",
      nuanceLevel: "Standard",
    },
    {
      scenario: "Soft Acceptance",
      content:
        "承知いたしました。ご検討のほど、何卒よろしくお願い申し上げます。ご不明な点がございましたら、いつでもお申し付けください。",
      description: "압박하지 않으면서 문을 열어 두는 답장입니다. 관계를 해치지 않고 후속 연락의 여지를 남깁니다.",
      nuanceLevel: "Soft",
    },
    {
      scenario: "Counter-proposal",
      content:
        "ご検討ありがとうございます。もしご懸念の点がございましたら、条件を調整したうえで改めてご提案させていただくことも可能です。",
      description: "거절 가능성을 전제로 대안을 먼저 제시해, 논의를 끝내지 않고 이어 가는 전략입니다.",
      nuanceLevel: "Firm",
    },
  ],
} satisfies NuanceResponse;

/** 사외에 반말 — PROMPT_DESIGN 의 few-shot 예시가 15점을 예상하는 입력. */
const TOO_CASUAL = {
  totalScore: 20,
  category: "EMAIL",
  metrics: { politeness: 10, indirectness: 10, etiquette: 0 },
  evaluation: {
    summary:
      "경어가 전혀 사용되지 않았습니다. 사외 상대에게는 그대로 보낼 수 없는 수준의 표현입니다.",
    keigo_check: false,
    cushion_phrase_check: false,
  },
  feedback: {
    issues: [
      "경어(敬語)가 사용되지 않았습니다.",
      "쿠션어가 없어 일방적인 통보로 읽힙니다.",
      "인사·맺음말이 없어 메일로서의 형식을 갖추지 못했습니다.",
    ],
    cultural_nuance:
      "'よろしく'는 친한 사이의 구어입니다. 사외 상대에게 쓰면 예의를 모르는 사람으로 인식될 수 있습니다.",
  },
  suggestions: [
    { text: "よろしくお願いいたします。", level: "standard" },
    { text: "何卒よろしくお願い申し上げます。", level: "highest" },
  ],
  sentiment: {
    polarity: "Neutral",
    confidence: 0.92,
    honne: {
      tatemae: "잘 부탁합니다.",
      trueIntent: "특별한 의도는 없으나, 상대와의 거리감을 고려하지 않은 표현입니다.",
      actionItem: "사외 상대에게는 정중체로 바꿔 다시 보내세요.",
    },
  },
  riskAnalysis: {
    riskLevel: "SAFE",
    redFlags: [],
    copingStrategy: "내용 자체에 위험 신호는 없습니다. 표현의 정중도만 올리면 됩니다.",
  },
  smartReplies: [
    {
      scenario: "Clarification",
      content: "お世話になっております。本件につきまして、何卒よろしくお願いいたします。",
      description: "가장 기본적인 정중체로 바꾼 형태입니다. 사외 메일의 최소 기준입니다.",
      nuanceLevel: "Standard",
    },
    {
      scenario: "Soft Acceptance",
      content: "お忙しいところ恐縮ですが、何卒よろしくお願い申し上げます。",
      description: "쿠션어를 앞에 두어 상대의 부담을 배려하는 형태입니다.",
      nuanceLevel: "Soft",
    },
    {
      scenario: "Counter-proposal",
      content:
        "お世話になっております。本件、ご対応いただけますと幸いです。ご都合をお聞かせいただけますでしょうか。",
      description: "부탁에 그치지 않고 상대의 사정을 묻는 형태로, 회신을 이끌어냅니다.",
      nuanceLevel: "Firm",
    },
  ],
} satisfies NuanceResponse;

/** 쿠션어와 완곡 어미를 모두 갖춘 정중한 의뢰 — 감점이 걸리지 않는 쪽 예시. */
const POLITE_REQUEST = {
  totalScore: 92,
  category: "EMAIL",
  metrics: { politeness: 38, indirectness: 27, etiquette: 27 },
  evaluation: {
    summary:
      "쿠션어와 완곡 어미가 모두 갖춰진 모범적인 의뢰 표현입니다. 사외 메일에 그대로 사용할 수 있습니다.",
    keigo_check: true,
    cushion_phrase_check: true,
  },
  feedback: {
    issues: [],
    cultural_nuance:
      "'お手数ですが'로 상대의 수고를 먼저 인정하고, 'いただけますでしょうか'로 선택권을 넘기는 구조입니다. 일본 비즈니스 의뢰문의 표준형입니다.",
  },
  suggestions: [
    { text: "お手数をおかけしますが、ご確認いただけますと幸いです。", level: "standard" },
    { text: "お忙しいところ恐縮ですが、ご確認賜りますようお願い申し上げます。", level: "highest" },
  ],
  sentiment: {
    polarity: "Positive",
    confidence: 0.88,
    honne: {
      tatemae: "번거로우시겠지만 확인 부탁드립니다.",
      trueIntent: "표면과 본심이 일치합니다. 숨은 의도가 없는 정중한 의뢰입니다.",
      actionItem: "그대로 보내셔도 됩니다.",
    },
  },
  riskAnalysis: {
    riskLevel: "SAFE",
    redFlags: [],
    copingStrategy: "위험 신호가 없습니다. 회신을 기다리시면 됩니다.",
  },
  smartReplies: [
    {
      scenario: "Clarification",
      content: "ご確認の期日について、ご希望がございましたらお知らせください。",
      description: "기한을 함께 전달해 상대가 우선순위를 정하기 쉽게 만듭니다.",
      nuanceLevel: "Standard",
    },
    {
      scenario: "Soft Acceptance",
      content: "お手すきの際にご確認いただけますと幸いです。",
      description: "급하지 않음을 전해 상대의 부담을 덜어 주는 형태입니다.",
      nuanceLevel: "Soft",
    },
    {
      scenario: "Counter-proposal",
      content: "もしご確認が難しいようでしたら、こちらで進めさせていただいてもよろしいでしょうか。",
      description: "상대가 응답하지 못할 경우의 대안을 함께 제시해 일이 멈추지 않게 합니다.",
      nuanceLevel: "Firm",
    },
  ],
} satisfies NuanceResponse;

/**
 * 입력에 따라 고를 예시. 무엇을 입력해도 같은 결과가 나오면 고장 난 것처럼 보이고,
 * 입력마다 다른 결과를 지어내면 거짓말이 된다. 그래서 몇 개의 진짜 응답 중에서 고른다.
 */
const SAMPLES: { match: (text: string) => boolean; result: NuanceResponse }[] = [
  { match: (text) => /検討|難しい|考えておく/.test(text), result: SOFT_REJECTION },
  { match: (text) => /お手数|恐縮|でしょうか|いただけますか/.test(text), result: POLITE_REQUEST },
  { match: (text) => text.trim().length <= 6, result: TOO_CASUAL },
];

export function pickDemoAnalysis(text: string): NuanceResponse {
  return SAMPLES.find((sample) => sample.match(text))?.result ?? SOFT_REJECTION;
}

/** 백엔드 기본 사전(R__seed_default_phrases.sql)과 같은 목록. */
export const DEMO_PHRASES: BusinessPhrase[] = [
  {
    id: 1,
    phrase: "承知いたしました",
    meaning: "알겠습니다 (확인 및 수락)",
    situation: "EMAIL",
    politenessLevel: 5,
    usageExample: "ご依頼の件、承知いたしました。速やかに対応いたします。",
  },
  {
    id: 2,
    phrase: "お含み置きください",
    meaning: "참고해 주시기 바랍니다 (미리 양해 구함)",
    situation: "NOTIFICATION",
    politenessLevel: 4,
    usageExample: "来週月曜日はシステムメンテナンスのため、お含み置きください。",
  },
  {
    id: 3,
    phrase: "検討させていただきます",
    meaning: "검토하겠습니다 (완곡한 보류/거절 시그널)",
    situation: "NEGOTIATION",
    politenessLevel: 3,
    usageExample: "今回のご提案につきましては、一度社内で検討させていただきます。",
  },
  {
    id: 4,
    phrase: "左様でございますか",
    meaning: "그러하십니까? (정중한 맞장구)",
    situation: "MEETING",
    politenessLevel: 4,
    usageExample: "左様でございますか。詳細について伺ってもよろしいでしょうか。",
  },
  {
    id: 5,
    phrase: "恐縮でございますが",
    meaning: "죄송합니다만 / 실례지만 (쿠션어)",
    situation: "CUSHION",
    politenessLevel: 5,
    usageExample: "恐縮でございますが、もう一度ご説明いただけますでしょうか。",
  },
  {
    id: 6,
    phrase: "念のため",
    meaning: "만약을 위해 (확인 강조)",
    situation: "CONFIRMATION",
    politenessLevel: 2,
    usageExample: "念のため、修正したソースコードを共有いたします。",
  },
  {
    id: 7,
    phrase: "お手数ですが",
    meaning: "번거로우시겠지만 (요청 시 필수)",
    situation: "REQUEST",
    politenessLevel: 4,
    usageExample: "お手数ですが、サーバーの再起動をお願いいたします。",
  },
];

/** 이력 예시. 목록 요약과 상세가 어긋나지 않도록 한 곳에서 만든다. */
// 타입을 따로 붙이지 않는다. satisfies 로 검사된 상수의 좁은 타입이 그대로 살아 있어야
// riskAnalysis 같은 중첩 필드를 옵셔널 체이닝 없이 읽을 수 있다.
const HISTORY_SOURCE = [
  {
    id: 3,
    createdAt: "2026-09-12T14:22:10",
    input: "ご提案の件、社内で検討させていただきます。",
    result: SOFT_REJECTION,
  },
  {
    id: 2,
    createdAt: "2026-09-11T09:05:44",
    input: "お手数ですが、ご確認いただけますでしょうか。",
    result: POLITE_REQUEST,
  },
  {
    id: 1,
    createdAt: "2026-09-10T18:47:02",
    input: "よろしく",
    result: TOO_CASUAL,
  },
];

export const DEMO_HISTORY: AnalysisHistory[] = HISTORY_SOURCE.map((row) => ({
  id: row.id,
  userInput: row.input,
  totalScore: row.result.totalScore,
  category: row.result.category,
  riskLevel: row.result.riskAnalysis.riskLevel,
  fullAnalysisJson: JSON.stringify(row.result),
  createdAt: row.createdAt,
}));

// 필드를 하나씩 적는다. 스프레드로 fullAnalysisJson 만 빼면 어느 필드가 요약에 실리는지
// 코드만 봐서는 알 수 없고, 백엔드 요약 DTO 와 어긋나도 눈치채기 어렵다.
export const DEMO_HISTORY_SUMMARIES: AnalysisHistorySummary[] = DEMO_HISTORY.map(
  ({ id, userInput, totalScore, category, riskLevel, createdAt }) => ({
    id,
    userInput,
    totalScore,
    category,
    riskLevel,
    createdAt,
  }),
);

/** 예시 이력을 페이지로 잘라 준다. 백엔드의 PageResponse 와 같은 모양이어야 한다. */
export function demoHistoryPage(page: number, size: number): HistoryPage {
  const safeSize = Math.min(100, Math.max(1, size));
  const safePage = Math.max(0, page);
  const start = safePage * safeSize;
  const content = DEMO_HISTORY_SUMMARIES.slice(start, start + safeSize);

  return {
    content,
    page: safePage,
    size: safeSize,
    totalElements: DEMO_HISTORY_SUMMARIES.length,
    totalPages: Math.ceil(DEMO_HISTORY_SUMMARIES.length / safeSize),
    hasNext: start + safeSize < DEMO_HISTORY_SUMMARIES.length,
  };
}

export function findDemoHistory(id: number): AnalysisHistory | undefined {
  return DEMO_HISTORY.find((row) => row.id === id);
}

/** 예시 숙어를 페이지로 자른다. 백엔드와 같은 정렬(정중도 내림차순, id 오름차순)을 따른다. */
export function demoPhrasePage(situation: string | undefined, page: number, size: number): PhrasePage {
  const matching = situation
    ? DEMO_PHRASES.filter((phrase) => phrase.situation === situation)
    : DEMO_PHRASES;
  const sorted = [...matching].sort(
    (left, right) => (right.politenessLevel ?? 0) - (left.politenessLevel ?? 0) || (left.id ?? 0) - (right.id ?? 0),
  );

  const safeSize = Math.min(100, Math.max(1, size));
  const safePage = Math.max(0, page);
  const start = safePage * safeSize;

  return {
    content: sorted.slice(start, start + safeSize),
    page: safePage,
    size: safeSize,
    totalElements: sorted.length,
    totalPages: Math.ceil(sorted.length / safeSize),
    hasNext: start + safeSize < sorted.length,
  };
}
