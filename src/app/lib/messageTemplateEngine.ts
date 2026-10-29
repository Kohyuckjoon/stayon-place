// 문자 템플릿 본문 문법 해석기. 문법 설명은 messageTemplateDefaults.ts 상단 주석 참고.

export type TemplateField =
  | { name: string; kind: "text" }
  | { name: string; kind: "choice"; options: string[] };

export interface TemplateToggle {
  name: string;
  defaultOn: boolean;
}

// 미리보기에서 입력값(value)과 아직 안 채운 빈칸(empty)을 강조하려고 조각으로 나눠서 돌려준다.
export interface PreviewPart {
  text: string;
  kind: "plain" | "value" | "empty";
}

const TOGGLE_RE = /\[\[([^[\]/][^[\]]*)\]\]([\s\S]*?)\[\[\/\]\]/g;
const FIELD_RE = /\{([^{}:]+)(?::([^{}]+))?\}(을\(를\)|를\(을\)|이\(가\)|가\(이\)|은\(는\)|는\(은\)|과\(와\)|와\(과\)|으로\(로\)|로\(으로\))?/g;

// [받침 있을 때, 받침 없을 때]
const PARTICLES: Record<string, [string, string]> = {
  "을(를)": ["을", "를"], "를(을)": ["을", "를"],
  "이(가)": ["이", "가"], "가(이)": ["이", "가"],
  "은(는)": ["은", "는"], "는(은)": ["은", "는"],
  "과(와)": ["과", "와"], "와(과)": ["과", "와"],
  "으로(로)": ["으로", "로"], "로(으로)": ["으로", "로"],
};

function pickParticle(word: string, particle: string): string {
  const pair = PARTICLES[particle];
  if (!pair) return particle;
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  // 한글이 아닌 글자로 끝나면(영문·숫자 등) 받침 없는 쪽으로 처리
  if (code < 0 || code > 11171) return pair[1];
  const jong = code % 28;
  // "으로/로"는 ㄹ 받침(8)도 "로"
  if (pair[1] === "로" && jong === 8) return pair[1];
  return jong > 0 ? pair[0] : pair[1];
}

function parseToggleHead(head: string): TemplateToggle {
  const trimmed = head.trim();
  if (trimmed.endsWith(":끔")) return { name: trimmed.slice(0, -2).trim(), defaultOn: false };
  return { name: trimmed, defaultOn: true };
}

export function analyzeTemplate(body: string): { fields: TemplateField[]; toggles: TemplateToggle[] } {
  const toggles: TemplateToggle[] = [];
  for (const m of body.matchAll(TOGGLE_RE)) {
    const t = parseToggleHead(m[1]);
    if (!toggles.some((x) => x.name === t.name)) toggles.push(t);
  }

  const fields: TemplateField[] = [];
  for (const m of body.matchAll(FIELD_RE)) {
    const name = m[1].trim();
    const options = m[2] ? m[2].split("|").map((o) => o.trim()).filter(Boolean) : [];
    const idx = fields.findIndex((f) => f.name === name);
    if (idx === -1) {
      fields.push(options.length > 0 ? { name, kind: "choice", options } : { name, kind: "text" });
    } else if (options.length > 0 && fields[idx].kind === "text") {
      // {호칭}이 먼저 나오고 뒤에 {호칭:목사님|...}가 나와도 고르기 버튼으로 보이게
      fields[idx] = { name, kind: "choice", options };
    }
  }
  return { fields, toggles };
}

export function resolveFieldValue(field: TemplateField, values: Record<string, string>): string {
  const v = (values[field.name] || "").trim();
  if (field.kind === "choice") return field.options.includes(v) ? v : field.options[0];
  return v;
}

export function renderTemplate(
  body: string,
  values: Record<string, string>,
  toggleState: Record<string, boolean>,
): PreviewPart[] {
  const { fields } = analyzeTemplate(body);

  // [[문단]] / [[/]]를 각각 한 줄에 따로 쓴 경우, 그 표시 줄의 줄바꿈도 같이 없앤다.
  // 안 그러면 문단을 뺐을 때 빈 줄이 하나 남는다.
  let text = body
    .replace(/(^|\n)(\[\[[^[\]/][^[\]]*\]\])\n/g, "$1$2")
    .replace(/(^|\n)\[\[\/\]\]\n/g, "$1[[/]]");
  text = text.replace(TOGGLE_RE, (_all, head: string, inner: string) => {
    const t = parseToggleHead(head);
    const on = toggleState[t.name] ?? t.defaultOn;
    return on ? inner : "";
  });
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  const parts: PreviewPart[] = [];
  let last = 0;
  for (const m of text.matchAll(FIELD_RE)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), kind: "plain" });
    const name = m[1].trim();
    const field = fields.find((f) => f.name === name) || { name, kind: "text" as const };
    const value = resolveFieldValue(field, values);
    if (value) {
      parts.push({ text: value, kind: "value" });
      if (m[3]) parts.push({ text: pickParticle(value, m[3]), kind: "plain" });
    } else {
      parts.push({ text: `{${name}}`, kind: "empty" });
      if (m[3]) parts.push({ text: m[3], kind: "plain" });
    }
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), kind: "plain" });
  return parts;
}

export function partsToText(parts: PreviewPart[]): string {
  return parts.map((p) => p.text).join("");
}

export function emptyFieldNames(parts: PreviewPart[]): string[] {
  return Array.from(new Set(parts.filter((p) => p.kind === "empty").map((p) => p.text.slice(1, -1))));
}
