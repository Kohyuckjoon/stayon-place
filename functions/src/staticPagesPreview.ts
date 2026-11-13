import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";
import {buildListPageHtml, fetchApprovedItems} from "./utils/prerender";

// 그동안 전용 함수가 없어 index.html(홈 제목/설명/주소)이 그대로 나가던 공개 페이지들.
// 구글이 전부 홈의 복사본으로 보지 않도록 페이지별 제목/설명/주소(canonical)와
// 본문 요약을 넣어 보낸다. 문구는 각 페이지 화면에 실제로 있는 내용 기준.
interface StaticPage {
  title: string;
  description: string;
  heading: string;
  paragraphs?: string[];
}

const SUFFIX = " | 스테이온(STAYON PLACE)";

const PAGES: Record<string, StaticPage> = {
  "/about": {
    title: "안심 검증 시스템 - 이단 차단·교단 검증 수련회 장소" + SUFFIX,
    description:
      "스테이온은 이단 방지부터 시설 안전까지 직접 검증한 수련회 장소만 " +
      "엄선합니다. 교단 검증, 현장 실사, 6개월 정기 갱신.",
    heading: "장소 고민은 스테이온에 맡기고, 사역의 본질에만 집중하세요.",
    paragraphs: [
      "주요 교단이 금지한 이단 관련 시설을 원천 차단하고, " +
      "시설 현황·가용 인원·주변 환경 정보를 한곳에 모았습니다.",
    ],
  },
  "/story": {
    title: "스테이온 이야기 - 수련회 준비, 본질에 집중하도록" + SUFFIX,
    description:
      "매 시즌 발로 뛰며 확인한 장소와 수많은 문서 작업 끝에 탄생한 " +
      "수련회 준비 플랫폼, 스테이온의 이야기입니다.",
    heading: "수련회 준비, 더 본질적인 것에 집중할 순 없을까?",
  },
  "/faq": {
    title: "자주 묻는 질문(FAQ)" + SUFFIX,
    description:
      "스테이온 수련회 장소 예약 절차, 수수료, 장소 검증, 환불 규정, " +
      "세금계산서 발행 등 자주 묻는 질문을 확인하세요.",
    heading: "자주 묻는 질문",
    paragraphs: [
      "스테이온은 어떤 플랫폼인가요? 전국의 기독교 수련회 장소(수양관, " +
      "기도원, 청소년 수련장 등)를 한눈에 비교하고 예약 가능 날짜를 " +
      "확인할 수 있는 수련회 전문 큐레이션 플랫폼입니다.",
      "장소 예약금 외에 플랫폼 이용료나 수수료가 따로 있나요? 예약을 " +
      "진행하는 교회가 지불하는 추가 플랫폼 수수료는 0원입니다.",
      "이단/사이비 단체의 장소도 필터링이 되나요? 등록 요청 시 교단 검증 " +
      "절차를 거치며, 검증되지 않은 단체나 장소의 등록은 차단됩니다.",
      "세금계산서나 현금영수증 발행이 가능한가요? 예약 확정 단계에서 " +
      "사업자등록증을 제출하시면 정식 지출증빙을 발행해 드립니다.",
    ],
  },
  "/planner": {
    title: "스마트 플래너 - 수련회 장소 비교 보고서 만들기" + SUFFIX,
    description:
      "저장한 수련회 장소의 위치, 수용 인원, 예상 비용, 시설을 한눈에 " +
      "비교하고 PDF나 엑셀 보고서로 내려받으세요.",
    heading: "스마트 플래너",
  },
  "/budget": {
    title: "수련회 예산 플래너 - 회비 자동 계산" + SUFFIX,
    description:
      "수련회 수입·지출 항목을 정리하고, 적자 없이 받으려면 인당 회비가 " +
      "얼마인지 자동으로 계산해 보세요.",
    heading: "수련회 예산 플래너",
  },
  "/booking-guide": {
    title: "수련회 장소 예약 절차 안내" + SUFFIX,
    description:
      "장소 찾기부터 예약 신청, 사전답사, 결제까지 스테이온 수련회 장소 " +
      "예약의 전체 절차를 안내합니다.",
    heading: "수련회 장소를 예약하는 전체 절차입니다",
  },
  "/safety": {
    title: "플랫폼 수수료 및 환불 정책" + SUFFIX,
    description:
      "스테이온 수련회 장소 예약의 환불 규정과 플랫폼 수수료 정책을 " +
      "확인하세요.",
    heading: "플랫폼 수수료 및 환불 정책 가이드",
  },
  "/notices": {
    title: "공지사항" + SUFFIX,
    description: "STAYON의 새로운 소식과 유용한 안내를 전해드립니다.",
    heading: "공지사항",
  },
  "/terms": {
    title: "이용약관" + SUFFIX,
    description: "스테이온(STAYON) 서비스 이용약관입니다.",
    heading: "이용약관",
  },
  "/privacy": {
    title: "개인정보처리방침" + SUFFIX,
    description: "스테이온(STAYON) 개인정보처리방침입니다.",
    heading: "개인정보처리방침",
  },
};

const VEHICLES_TITLE = "수련회 차량·버스 대여 업체 찾기" + SUFFIX;
const VEHICLES_DESCRIPTION =
  "차종·운행 지역별로 등록된 수련회 차량·버스 대여 업체를 확인하세요. " +
  "스테이온에 등록된 업체는 모두 관리자 검토를 거친 업체예요.";

/**
 * /vehicles(목록)와 /vehicles/:id(상세)의 메타 정보를 만든다.
 * @param {string} path 요청 경로.
 * @return {Promise<MetaPatch>} 치환할 메타 정보.
 */
async function vehiclesMeta(path: string): Promise<MetaPatch> {
  const match = path.match(/^\/vehicles\/([^/]+)/);
  if (!match) {
    const items = await fetchApprovedItems(
      "vehicleRentals", "/vehicles/", (d) => ({
        name: String(d.businessName || "").trim(),
      })
    );
    return {
      title: VEHICLES_TITLE,
      description: VEHICLES_DESCRIPTION,
      path: "/vehicles",
      bodyHtml: buildListPageHtml(
        "수련회 이동 수단을 찾아보세요", VEHICLES_DESCRIPTION, items
      ),
    };
  }

  const meta: MetaPatch = {title: VEHICLES_TITLE, path};
  try {
    const snap = await admin.firestore()
      .collection("vehicleRentals").doc(match[1]).get();
    const data = snap.exists ? snap.data() : undefined;
    const name = String(data?.businessName || "").trim();
    const photos = data?.photos as string[] | undefined;
    if (data?.status === "approved" && name) {
      meta.title = `${name} | 수련회 차량·버스 대여${SUFFIX}`;
      meta.description =
        `${name} - 스테이온에서 수련회 차량·버스 대여 문의를 진행하세요.`;
      meta.bodyHtml = buildListPageHtml(name, meta.description);
      if (photos && photos.length > 0) meta.image = photos[0];
    }
  } catch (error) {
    logger.error("staticPagesPreview: 차량 업체 조회 실패", error);
  }
  return meta;
}

/**
 * Firebase Hosting에서 위 PAGES 경로들과 /vehicles, /vehicles/** 요청을
 * 이 함수로 rewrite한다.
 */
export const staticPagesPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const path = req.path.replace(/\/+$/, "") || "/";
    let meta: MetaPatch | undefined;

    if (path === "/vehicles" || path.startsWith("/vehicles/")) {
      meta = await vehiclesMeta(path);
    } else {
      const page = PAGES[path];
      if (page) {
        meta = {
          title: page.title,
          description: page.description,
          path,
          bodyHtml: buildListPageHtml(
            page.heading, page.description, [], page.paragraphs
          ),
        };
      }
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(meta ? patchMeta(html, meta) : html);
    } catch (error) {
      logger.error("staticPagesPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
