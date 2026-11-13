import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";
import {buildListPageHtml, fetchApprovedItems} from "./utils/prerender";

// /teams는 목록형 고정 페이지라 venuePreview처럼 Firestore 조회 없이
// 고정된 메타 정보로 치환한다. "외부사역팀"이라는 사이트 내 명칭보다
// 실제 검색 의도가 높은 "찬양팀 섭외", "찬양사역자 섭외" 등을 제목에 반영했다.
const TITLE = "교회 찬양팀·찬양사역자 섭외 | 스테이온(STAYON PLACE)";
const DESCRIPTION =
  "찬양팀, 음향·조명팀, 찬양사역자, 세션 등 외부 사역팀을 무료로 찾고 섭외하세요. " +
  "수련회 장소와 상관없이 이용할 수 있어요.";
const KEYWORDS = [
  "외부사역팀", "찬양팀섭외", "찬양사역자섭외", "세션섭외",
  "교회찬양팀", "수련회찬양팀", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/place_find_out.png";

// /teams?category=bandroom (합주실·연습실 탭)으로 접근했을 때 보여줄 메타 정보.
// 쿼리스트링은 Hosting rewrite의 source 매칭에 영향을 주지 않아 /teams와
// 동일하게 이 함수로 들어오므로, 여기서 category 쿼리로 분기한다.
const BANDROOM_TITLE = "합주 공간 소개 | 교회·외부사역 찬양팀 | STAYON에서.";
const BANDROOM_DESCRIPTION =
  "교회 찬양팀·외부 사역팀을 위한 합주실·연습실·녹음실을 스테이온에서 찾아보세요.";
const BANDROOM_KEYWORDS = [
  "합주실", "연습실", "녹음실", "찬양팀합주실", "교회합주실", "스테이온",
].join(", ");
const BANDROOM_IMAGE =
  "https://place.stayon-platform.com/place_find_music_room.png";

/**
 * Firebase Hosting에서 /teams 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 외부 사역팀 목록 페이지(또는 category=bandroom
 * 쿼리가 붙은 합주실·연습실 탭)에 맞는 title / description / keywords 메타 태그로
 * 치환해서 반환한다.
 */
export const teamsPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const isBandRoomTab = req.query.category === "bandroom";
    // 승인된 팀(또는 합주실) 목록을 본문에 미리 채워 구글봇이 상세페이지 링크를 따라가게 한다.
    const items = isBandRoomTab ?
      await fetchApprovedItems("bandRooms", "/band-room/", (d) => ({
        name: String(d.roomName || "").trim(),
        info: [d.roomType, d.address].filter(Boolean).join(" · "),
      })) :
      await fetchApprovedItems("ministryTeams", "/teams/", (d) => ({
        name: String(d.teamName || "").trim(),
        info: [d.category, d.churchNamePrivate ? "" : d.churchName]
          .filter(Boolean).join(" · "),
      }));
    const bodyHtml = isBandRoomTab ?
      buildListPageHtml("합주실·연습실 찾기", BANDROOM_DESCRIPTION, items) :
      buildListPageHtml("교회 찬양팀·찬양사역자 섭외", DESCRIPTION, items);

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        path: isBandRoomTab ? "/teams?category=bandroom" : "/teams",
        bodyHtml,
        title: isBandRoomTab ? BANDROOM_TITLE : TITLE,
        description: isBandRoomTab ? BANDROOM_DESCRIPTION : DESCRIPTION,
        keywords: isBandRoomTab ? BANDROOM_KEYWORDS : KEYWORDS,
        image: isBandRoomTab ? BANDROOM_IMAGE : IMAGE,
      }));
    } catch (error) {
      logger.error("teamsPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
