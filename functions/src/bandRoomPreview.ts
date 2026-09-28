import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";

const DEFAULT_TITLE = "교회 찬양팀 합주 공간 소개 | STAYON에서.";

/**
 * Firebase Hosting에서 /band-room/** (합주실·연습실 상세 페이지) 요청을
 * 이 함수로 rewrite한다. 정적 index.html을 그대로 서빙하되, 해당 공간명
 * 기반으로 title / og:title / twitter:title / description 등을 치환해서
 * 반환한다. 카카오톡·쓰레드 등 링크 미리보기 크롤러가 공간별로 다른
 * 미리보기를 보게 하기 위함이다 (teamDetailPreview.ts와 동일한 패턴).
 */
export const bandRoomPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const meta: MetaPatch = {title: DEFAULT_TITLE};

    try {
      const match = req.path.match(/\/band-room\/([^/]+)/);
      const roomId = match?.[1];

      if (roomId) {
        const roomRef = admin.firestore()
          .collection("bandRooms").doc(roomId);
        const snap = await roomRef.get();
        const roomData = snap.exists ? snap.data() : undefined;
        const roomName = roomData?.roomName as string | undefined;
        const roomType = roomData?.roomType as string | undefined;
        const address = roomData?.address as string | undefined;
        const photos = roomData?.photos as string[] | undefined;

        // 등록한 첫 번째 사진이 있으면 카카오톡 등 미리보기 이미지를 그걸로 바꾼다.
        // 없으면 index.html의 기본 스테이온 배너 이미지가 그대로 유지된다.
        if (photos && photos.length > 0) {
          meta.image = photos[0];
        }

        if (roomName) {
          meta.title = `${roomName} | 교회 찬양팀 합주 공간 소개 | STAYON에서.`;

          meta.description = [
            `${roomName} 소개`,
            [roomType, address].filter(Boolean).join(" · "),
            "스테이온에서 대여 문의를 진행하세요.",
          ].filter(Boolean).join(" | ");

          meta.keywords = [
            roomName, roomType, "합주실", "연습실", "녹음실", "스테이온",
          ].filter(Boolean).join(", ");
        }
      }
    } catch (error) {
      logger.error("bandRoomPreview: 공간 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, meta));
    } catch (error) {
      logger.error("bandRoomPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
