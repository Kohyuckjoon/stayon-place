// 실제 운영 중인 정적 index.html을 그대로 가져와 title/description/keywords 계열
// 메타 태그만 라우트별로 치환해 돌려주는 공용 유틸. venuePreview.ts, teamsPreview.ts가
// 공유한다. 나머지 정적 자산(JS 번들 등) 참조는 그대로라 실제 사용자 화면 동작에는
// 영향이 없고, 카카오톡 등 링크 미리보기 크롤러가 보는 메타 태그만 라우트별로 달라진다.
export const HOSTING_ORIGIN = "https://place.stayon-platform.com";

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
  // 지정 시 og:image/twitter:image를 이 URL로 바꾼다(예: 팀 대표 이미지).
  // 미지정 시 index.html의 기본 스테이온 배너 이미지가 그대로 유지된다.
  image?: string;
  // 지정 시(예: "/venue/abc") 그 페이지의 진짜 주소를 og:url과 canonical 링크로
  // 넣는다. 미지정 시 index.html의 홈 주소가 그대로 유지된다.
  path?: string;
  // 지정 시 <div id="root"></div> 안에 이 HTML을 미리 채워 보낸다. 구글봇이
  // 자바스크립트 실행 없이도 첫 화면부터 실제 내용을 보게 하기 위함이며,
  // 앱이 마운트되면(createRoot) 이 내용은 실제 화면으로 통째로 교체된다.
  bodyHtml?: string;
  // 지정 시 <script type="application/ld+json">으로 구조화 데이터를 넣는다.
  jsonLd?: Record<string, unknown>;
  // 지정 시 <script>window[globalName] = data</script>를 앱 스크립트보다 먼저
  // 실행되게 넣는다. 앱이 데이터베이스 조회를 기다리지 않고 첫 렌더부터 실제
  // 내용을 그리게 하기 위함이다(구글봇 렌더링 시 빈 화면 방지). 공개돼도 되는
  // 값만 넣어야 한다.
  preload?: {globalName: string; data: Record<string, unknown>};
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

  if (meta.path) {
    const pageUrl = escapeHtml(`${HOSTING_ORIGIN}${meta.path}`);
    const ogUrlRe = /(<meta property="og:url" content=")[^"]*(")/g;
    const canonicalRe = /<link rel="canonical" href="[^"]*"\s*\/?>/;
    const canonicalTag = `<link rel="canonical" href="${pageUrl}" />`;
    patched = patched.replace(ogUrlRe, `$1${pageUrl}$2`);
    patched = canonicalRe.test(patched) ?
      patched.replace(canonicalRe, () => canonicalTag) :
      patched.replace("</head>", () => `    ${canonicalTag}\n  </head>`);
  }

  if (meta.jsonLd) {
    // </script> 조기 종료를 막기 위해 "<"를 유니코드로 이스케이프한다.
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    const ldTag = `<script type="application/ld+json">${json}</script>`;
    patched = patched.replace("</head>", () => `    ${ldTag}\n  </head>`);
  }

  if (meta.preload) {
    // "<" 와 줄바꿈 계열 문자를 이스케이프해 스크립트 조기 종료/깨짐을 막는다.
    const json = JSON.stringify(meta.preload.data)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
    const name = JSON.stringify(meta.preload.globalName);
    const preloadTag = `<script>window[${name}]=${json};</script>`;
    patched = patched.replace(
      "</head>", () => `    ${preloadTag}\n  </head>`
    );
  }

  if (meta.bodyHtml) {
    const bodyHtml = meta.bodyHtml;
    patched = patched.replace(
      "<div id=\"root\"></div>",
      () => `<div id="root">${bodyHtml}</div>`
    );
  }

  if (meta.image) {
    const escapedImage = escapeHtml(meta.image);
    const ogImageRe = /(<meta property="og:image" content=")[^"]*(")/g;
    const twitterImageRe = /(<meta name="twitter:image" content=")[^"]*(")/g;
    patched = patched
      .replace(ogImageRe, `$1${escapedImage}$2`)
      .replace(twitterImageRe, `$1${escapedImage}$2`);

    // og:image:width/height는 기본 배너(1200x630 고정 비율) 기준 힌트라, 팀이 올린
    // 이미지처럼 비율을 모르는 사진으로 바꿀 땐 통째로 빼버린다 — 잘못된 비율값을
    // 남겨두면 카카오톡 등에서 이미지가 눌리거나 늘어나 보일 수 있다.
    const ogImageWidthRe =
      /\s*<meta property="og:image:width" content="[^"]*"\s*\/>\n?/;
    const ogImageHeightRe =
      /\s*<meta property="og:image:height" content="[^"]*"\s*\/>\n?/;
    patched = patched
      .replace(ogImageWidthRe, "\n")
      .replace(ogImageHeightRe, "\n");
  }

  return patched;
}
