/* eslint-disable @typescript-eslint/no-explicit-any */
import * as nodemailer from "nodemailer";

// 이메일 전송을 담당하는 핵심 함수
export const sendAdminEmail = async (subject: string, htmlContent: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"STAYON 알림" <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[이메일 전송 성공] ${subject}`);
  } catch (err) {
    console.error("❌ 이메일 전송 오류 상세:", err);
  }
};

const bizRegStatus = (num: unknown) =>
  typeof num === "string" && num.trim() !== "" ? `등록완료 (${num})` : "미등록";

type FleetRow = { type?: string; count?: number };
const summarizeFleet = (fleet: unknown) => {
  if (!Array.isArray(fleet)) return undefined;
  return (fleet as FleetRow[])
    .filter((v) => (v.type || "").trim() !== "")
    .map((v) => `${v.type} ${v.count || 0}대`)
    .join(", ");
};

export const sendMailNotification = async (
  type:
    | "JOIN" | "VENUE" | "MISSION_VENUE" | "TEAM" | "TEAM_APPROVE"
    | "BANDROOM" | "BANDROOM_APPROVE"
    | "CHURCH" | "CHURCH_APPROVE"
    | "GOODS" | "GOODS_APPROVE"
    | "SHIRTS" | "SHIRTS_APPROVE"
    | "VEHICLE" | "VEHICLE_APPROVE"
    | "TEAM_BOOST"
    | "RESERVE" | "APPROVE" | "CONFIRM" | "FINAL_DECISION" | "PAYMENT_COMPLETE",
  data: any
) => {
  let title = "";
  let color = "#3182f6";
  let fields: { title: string; value: string }[] = [];

  switch (type) {
  case "JOIN":
    title = "🎉 STAYON에 새로운 가족이 합류했습니다!";
    fields = [
      {title: "이름", value: data.name},
      {title: "이메일", value: data.email},
      {title: "가입 일시", value: data.date},
    ];
    break;

  case "VENUE":
    title = "🏠 장소 등록 신청 접수";
    color = "#27ae60";
    fields = [
      {title: "장소명", value: data.venueName},
      {title: "신청자", value: data.applicant},
    ];
    break;

  case "MISSION_VENUE":
    title = "🌏 국내 선교 장소 등록 신청 접수";
    color = "#2563eb";
    fields = [
      {title: "장소명", value: data.venueName},
      {title: "신청자", value: data.applicant},
    ];
    break;

  case "TEAM":
    title = "🎤 외부 사역팀 등록 신청 접수";
    color = "#8b5cf6";
    fields = [
      {title: "팀 이름", value: data.teamName},
      {title: "분야", value: data.category},
      {title: "대표자", value: data.applicantName},
    ];
    break;

  case "TEAM_APPROVE":
    title = "✅ 외부 사역팀 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "팀 이름", value: data.teamName},
      {title: "분야", value: data.category},
      {title: "대표자", value: data.applicantName},
    ];
    break;

  case "BANDROOM":
    title = "🎸 합주실·연습실 등록 신청 접수";
    color = "#0ea5e9";
    fields = [
      {title: "공간명", value: data.roomName},
      {title: "유형", value: data.roomType},
      {title: "위치", value: data.address},
      {title: "신청자", value: data.applicantName},
      {title: "연락처", value: data.applicantContact},
      {title: "등록 이메일", value: data.applicantEmail},
      {title: "노출 방식", value: data.track},
    ];
    break;

  case "BANDROOM_APPROVE":
    title = "✅ 합주실·연습실 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "공간명", value: data.roomName},
      {title: "신청자", value: data.applicantName},
    ];
    break;

  case "CHURCH":
    title = "⛪ 전국 교회 등록 신청 접수";
    color = "#10b981";
    fields = [
      {title: "신청자명", value: data.applicantName},
      {title: "연락처", value: data.applicantContact},
      {title: "교회 이름", value: data.churchName},
      {title: "교회 연락처", value: data.churchContact},
      {title: "교단", value: data.denomination},
      {title: "교회 위치(주소)", value: data.churchAddress},
    ];
    break;

  case "CHURCH_APPROVE":
    title = "✅ 전국 교회 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "교회 이름", value: data.churchName},
      {title: "신청자", value: data.applicantName},
    ];
    break;

  case "GOODS":
    title = "🎁 교회 굿즈 판매 업체 신청 접수";
    color = "#F59E0B";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "대표자명", value: data.applicantName},
      {
        title: "사업자 등록 여부",
        value: bizRegStatus(data.businessRegistrationNumber),
      },
      {title: "사업자 소재지", value: "온라인 몰"},
      {title: "연락처", value: data.applicantContact},
    ];
    break;

  case "GOODS_APPROVE":
    title = "✅ 크리스천 굿즈 업체 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "신청자", value: data.applicantName},
    ];
    break;

  case "SHIRTS":
    title = "👕 단체 티셔츠 판매 업체 신청 접수";
    color = "#F59E0B";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "대표자명", value: data.applicantName},
      {
        title: "사업자 등록 여부",
        value: bizRegStatus(data.businessRegistrationNumber),
      },
      {title: "사업자 소재지", value: "온라인 몰"},
      {title: "연락처", value: data.applicantContact},
    ];
    break;

  case "SHIRTS_APPROVE":
    title = "✅ 단체티·기념품 업체 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "신청자", value: data.applicantName},
    ];
    break;

  case "VEHICLE": {
    const fleetSummary = summarizeFleet(data.vehicleFleet);
    const regionSummary = Array.isArray(data.serviceRegions) ?
      data.serviceRegions.join(", ") :
      undefined;
    title = "🚌 수련회 차량 렌트/대여 업체 신청 접수";
    color = "#F59E0B";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "대표자명", value: data.applicantName},
      {
        title: "사업자 등록 여부",
        value: bizRegStatus(data.businessRegistrationNumber),
      },
      {title: "사업자 소재지 위치", value: regionSummary},
      {title: "차량 보유 현황(차종)", value: fleetSummary},
      {title: "연락처", value: data.contactPhone},
    ];
    break;
  }

  case "VEHICLE_APPROVE":
    title = "✅ 차량·버스 대여 업체 등록 승인 완료";
    color = "#00d082";
    fields = [
      {title: "업체명", value: data.businessName},
      {title: "신청자", value: data.applicantName},
    ];
    break;

  case "TEAM_BOOST":
    // 외부 사역팀(섭외율 높이기)·합주실·연습실(예약률 높이기) 공용 신청 알림.
    title = `🚀 ${data.targetTypeLabel || "섭외율/예약률"} 높이기 신청 접수`;
    color = "#F59E0B";
    fields = [
      {title: "신청 플랜", value: data.planLabel},
      {title: "대상 유형", value: data.targetTypeLabel},
      {title: "이름", value: data.targetName},
      {title: "신청자", value: data.applicantName},
      {title: "연락처", value: data.applicantContact},
      {title: "이메일", value: data.applicantEmail},
    ];
    break;

  case "RESERVE": {
    const isInsp = data.dateTime?.includes("사전답사");
    title = isInsp ? "🔍 새로운 사전답사 신청" : "📅 새로운 장소 예약 문의";
    color = isInsp ? "#ffbb00" : "#f04452";
    fields = [
      {title: "장소명", value: data.venueName},
      {title: "신청기관", value: data.userName},
      {title: "연락처", value: data.phone},
      {title: "신청일정", value: data.dateTime},
    ];
    break;
  }

  case "APPROVE":
    title = "✅ 예약/답사 승인 완료";
    color = "#00d082";
    fields = [
      {title: "변경 상태", value: `🚀 ${data.status}`},
      {title: "장소명", value: data.venueName},
      {title: "대상기관", value: data.userName},
    ];
    break;

  case "CONFIRM":
    title = "📍 사용자: 답사 일정 최종 확정";
    fields = [
      {title: "확정 장소", value: data.venueName},
      {title: "신청자", value: data.userName},
      {title: "상태", value: "실물 답사 진행 예정"},
    ];
    break;

  case "FINAL_DECISION":
    title = "🔥 [중요] 사용자가 장소를 최종 결정했습니다!";
    color = "#f04452";
    fields = [
      {title: "결정 장소", value: data.venueName},
      {title: "결정자", value: data.userName},
      {title: "다음 단계", value: "💳 예약금 결제 페이지 진입함"},
    ];
    break;

  case "PAYMENT_COMPLETE":
    title = "🎉 [매출 발생] 최종 예약 결제 완료!";
    color = "#00d082";
    fields = [
      {title: "예약 장소", value: data.venueName},
      {title: "예약자", value: data.userName},
      {title: "결제 금액", value: `${data.amount?.toLocaleString()}원`},
      {title: "결제 상태", value: "✅ 예약금 결제 완료"},
    ];
    break;
  }

  const fieldsHtml = fields
    .map(
      (f) => `
      <div style="margin-bottom: 16px; padding-bottom: 12px; 
                  border-bottom: 1px solid #f2f4f6;">
        <div style="font-size: 13px; color: #8b95a1; margin-bottom: 4px;">
          ${f.title}
        </div>
        <div style="font-size: 16px; color: #333d4b; font-weight: 500; 
                    white-space: pre-wrap;">${f.value}</div>
      </div>
    `
    )
    .join("");

  const timeStr = new Date().toLocaleString("ko-KR", {timeZone: "Asia/Seoul"});
  const emailHtml = `
    <div style="background-color: #f2f4f6; padding: 30px 15px;
                font-family: sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background: #fff;
                  border-radius: 24px; padding: 32px;">
        <div style="width: 40px; height: 4px; background-color: ${color}; 
                    margin-bottom: 20px;"></div>
        <h2 style="font-size: 22px; margin: 0 0 24px 0;">${title}</h2>
        <div style="background: #fff;">${fieldsHtml}</div>
        <div style="margin-top: 32px; font-size: 12px; color: #b0b8c1; 
                    text-align: center;">
          STAYON 관리자 시스템 • ${timeStr}
        </div>
      </div>
    </div>
  `;

  await sendAdminEmail(`[STAYON 수련회 플랫폼] ${title}`, emailHtml);
};
