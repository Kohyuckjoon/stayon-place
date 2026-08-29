// 실제 운영 중인 정적 index.html을 그대로 가져와 title/description/keywords 계열
// 메타 태그만 라우트별로 치환해 돌려주는 공용 유틸. venuePreview.ts, teamsPreview.ts가
// 공유한다. 나머지 정적 자산(JS 번들 등) 참조는 그대로라 실제 사용자 화면 동작에는
// 영향이 없고, 카카오톡 등 링크 미리보기 크롤러가 보는 메타 태그만 라우트별로 달라진다.
const HOSTING_ORIGIN = "https://place.stayon-platform.com";

/** 운영 중인 정적 index.html 원본을 그대로 가져온다. */
export async function fetchIndexHtml(): Promise<string> {
  const response = await fetch(`${HOSTING_ORIGIN}/index.html`);
  if (!response.ok) {
    throw new Error(`index.html fetch 실패: ${response.status}`);
  }
  return await response.text();
}

/**
 * HTML 속성 값에 안전하게 삽입할 수 있도록 특수문자를 이스케이프한다.
 * @param {string} value 이스케이프할 원본 문자열.
 * @return {string} 이스케이프된 문자열.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface MetaPatch {
  title: string;
  description?: string;
  keywords?: string;
}

/**
 * index.html의 title/description/keywords 계열 메타 태그를 치환한다.
 * @param {string} html 원본 index.html 문자열.
 * @param {MetaPatch} meta 치환할 제목/설명/키워드.
 * @return {string} 메타 태그가 치환된 HTML 문자열.
 */
export function patchMeta(html: string, meta: MetaPatch): string {
  const escapedTitle = escapeHtml(meta.title);
  // index.html에 주석 처리된 예전 메타 태그 잔재가 남아있어, 실제로 활성화된
  // 태그까지 확실히 잡히도록 g 플래그로 전체(주석 포함) 치환한다.
  // 주석 안쪽이 바뀌어도 어차피 렌더링/크롤링에 영향 없어 안전하다.
  const ogTitleRe = /(<meta property="og:title" content=")[^"]*(")/g;
  const twitterTitleRe = /(<meta name="twitter:title" content=")[^"]*(")/g;
  let patched = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapedTitle}</title>`)
    .replace(ogTitleRe, `$1${escapedTitle}$2`)
    .replace(twitterTitleRe, `$1${escapedTitle}$2`);

  if (meta.description) {
    const escapedDesc = escapeHtml(meta.description);
    const descRe = /(<meta name="description" content=")[^"]*(")/g;
    const ogDescRe = /(<meta property="og:description" content=")[^"]*(")/g;
    const twitterDescRe =
      /(<meta name="twitter:description" content=")[^"]*(")/g;
    patched = patched
      .replace(descRe, `$1${escapedDesc}$2`)
      .replace(ogDescRe, `$1${escapedDesc}$2`)
      .replace(twitterDescRe, `$1${escapedDesc}$2`);
  }

  if (meta.keywords) {
    const escapedKeywords = escapeHtml(meta.keywords);
    const keywordsRe = /(<meta name="keywords" content=")[^"]*(")/g;
    patched = patched.replace(keywordsRe, `$1${escapedKeywords}$2`);
  }

  return patched;
}
