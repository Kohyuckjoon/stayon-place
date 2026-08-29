import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";

const DEFAULT_TITLE = "외부사역·예배 반주·음향 | 외부사역 문의는 STAYON에서";

/**
 * Firebase Hosting에서 /teams/** (팀 상세 페이지) 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 해당 팀 이름 기반으로
 * title / og:title / twitter:title / description 등을 치환해서 반환한다.
 * 카카오톡 등 링크 미리보기 크롤러가 팀별로 다른 미리보기를 보게 하기 위함이다.
 */
export const teamDetailPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const meta: MetaPatch = {title: DEFAULT_TITLE};

    try {
      const match = req.path.match(/\/teams\/([^/]+)/);
      const teamId = match?.[1];

      if (teamId) {
        const teamRef = admin.firestore()
          .collection("ministryTeams").doc(teamId);
        const snap = await teamRef.get();
        const teamData = snap.exists ? snap.data() : undefined;
        const teamName = teamData?.teamName as string | undefined;
        const category = teamData?.category as string | undefined;
        const churchName = teamData?.churchNamePrivate ?
          undefined :
          (teamData?.churchName as string | undefined);
        const teamSize = teamData?.teamSize as string | undefined;

        if (teamName) {
          meta.title = `${teamName} 외부사역·예배 반주·음향 | 외부사역 문의는 STAYON에서`;

          meta.description = [
            `${teamName} 소개`,
            [category, churchName, teamSize ? `${teamSize} 구성` : undefined]
              .filter(Boolean).join(" · "),
            "스테이온에서 섭외 문의를 진행하세요.",
          ].filter(Boolean).join(" | ");

          meta.keywords = [
            teamName, category, "외부사역팀", "찬양팀섭외", "찬양사역자섭외", "스테이온",
          ].filter(Boolean).join(", ");
        }
      }
    } catch (error) {
      logger.error("teamDetailPreview: 팀 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, meta));
    } catch (error) {
      logger.error("teamDetailPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
