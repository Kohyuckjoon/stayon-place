// // src/utils/slackNotify.ts
// import * as nodemailer from "nodemailer";

// // 아까 발급받은 긴 주소를 여기에 넣으세요!
// const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

// // 1. 구글 메일 전송 설정 (이제 .env 파일의 값을 읽어옵니다)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER, // .env의 GMAIL_USER 사용
//     pass: process.env.GMAIL_PASS, // .env의 GMAIL_PASS 사용
//   },
// });

// // 2. 메일 발송 함수
// export const sendAdminEmail = async (subject: string, content: string) => {
//   const mailOptions = {
//     from: `"STAYON 알림" <${process.env.GMAIL_USER}>`,
//     to: process.env.GMAIL_USER,
//     subject: subject,
//     html: `<div style="font-family: sans-serif; padding: 20px;">
//              <h2 style="color: #3182f6;">STAYON 알림</h2>
//              <p>${content}</p>
//            </div>`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log("이메일 전송 성공!");
//   } catch (err) {
//     console.error("이메일 전송 오류:", err);
//   }
// };

// // export const sendSlackNotification = async (type: 'JOIN' | 'VENUE' | 'RESERVE', data: any) => {
// export const sendSlackNotification = async (type: 'JOIN' | 'VENUE' | 'RESERVE' | 'APPROVE' | 'CONFIRM' | 'FINAL_DECISION' | 'PAYMENT_COMPLETE', data: any) => {
//   let title = "";
//   let color = "";
//   let fields = [];
//   let mention = "<!here>";

//   // 상황에 따른 메시지 구성
//   switch (type) {
//     case 'JOIN':
//       title = "🎉 STAYON에 새로운 가족이 합류했습니다!"; // 문구 수정
//       color = "#3182f6";
//       fields = [
//         { title: "이름", value: data.name, short: true },
//         { title: "이메일", value: data.email, short: true }, // 이메일 추가
//         { title: "가입 일시", value: data.date, short: false } // 가입 시간 추가
//       ];
//       break;
      
//     case 'VENUE':
//       title = "🏠 장소 등록 신청 접수";
//       color = "#27ae60"; // 초록색
//       fields = [
//         { title: "장소명", value: data.venueName, short: true },
//         { title: "신청자", value: data.applicant, short: true }
//       ];
//       break;
//     case 'RESERVE':
//       // title = "📅 사전답사 예약 신청";
//       // color = "#f04452"; // 빨간색
//       // fields = [
//       //   { title: "예약자", value: data.userName, short: true },
//       //   { title: "희망일시", value: data.dateTime, short: false }
//       // ];
//       // break;
//       const isInspection = data.dateTime.includes("사전답사");
//       title = isInspection ? "🔍 새로운 사전답사 신청" : "📅 새로운 장소 예약 문의";
//       color = isInspection ? "#FFBB00" : "#f04452"; // 답사는 노란색, 예약은 빨간색 구분
//       fields = [
//         { title: "장소명", value: data.venueName, short: true },
//         { title: "신청기관", value: data.userName, short: true },
//         { title: "연락처", value: data.phone, short: true },
//         { title: "신청일정", value: data.dateTime, short: false }
//       ];
//       break;

//     case 'APPROVE': // 관리자 승인 알림 추가
//       title = "✅ 예약/답사 승인 완료";
//       color = "#00D082"; // 토스 스타일 초록색
//       mention = ""; // 승인은 내부 공유용이므로 강제 알림은 뺍니다 (필요시 추가)
//       fields = [
//         { title: "변경 상태", value: `🚀 ${data.status}`, short: true },
//         { title: "장소명", value: data.venueName, short: true },
//         { title: "대상기관", value: data.userName, short: false }
//       ];
//       break;

//     case 'CONFIRM': // 사용자의 답사 최종 확정 알림 추가
//       title = "📍 사용자: 답사 일정 최종 확정";
//       color = "#3182f6"; // 확정은 신뢰의 파란색
//       mention = "<!here>"; // 관리자가 즉시 인지해야 하므로 멘션 포함
//       fields = [
//         { title: "확정 장소", value: data.venueName, short: true },
//         { title: "신청자", value: data.userName, short: true },
//         { title: "상태", value: "실물 답사 진행 예정", short: false }
//       ];
//       break;

//     case 'FINAL_DECISION': // 신규 추가: 답사 후 최종 장소 결정 알림
//       title = "🔥 [중요] 사용자가 장소를 최종 결정했습니다!";
//       color = "#F04452"; // 긴급도를 나타내는 빨간색
//       mention = "<!here>";
//       fields = [
//         { title: "결정 장소", value: data.venueName, short: true },
//         { title: "결정자", value: data.userName, short: true },
//         { title: "다음 단계", value: "💳 예약금 결제 페이지 진입함", short: false }
//       ];
//       break;

//     case 'PAYMENT_COMPLETE': // 신규 추가: 최종 결제 완료 알림
//       title = "🎉 [매출 발생] 최종 예약 결제 완료!";
//       color = "#00D082"; // 성공을 알리는 토스 그린
//       mention = "<!here>";
//       fields = [
//         { title: "예약 장소", value: data.venueName, short: true },
//         { title: "예약자", value: data.userName, short: true },
//         { 
//           title: "결제 금액", 
//           value: `${data.amount?.toLocaleString()}원`, // 콤마 추가 및 '원' 표시
//           short: true 
//         },
//         { title: "결제 상태", value: "✅ 예약금 결제 완료 (Billing Key 생성)", short: false }
//       ];
//       break;

    
//   }
//   const message = {
//     text: mention ? `${mention} 알림이 발생했습니다.` : "",
//     attachments: [
//       {
//         fallback: title,
//         color: color,
//         pretext: title,
//         fields: fields,
//         footer: "StayOn 관리자 액션 로그",
//         ts: Math.floor(Date.now() / 1000)
//       }
//     ]
//   };

//   try {
//     const response = await fetch(SLACK_WEBHOOK_URL, {
//       method: "POST",
//       body: JSON.stringify(message),
//     });
//     if (response.ok) console.log("슬랙 알림 전송 완료!");
//   } catch (error) {
//     console.error("슬랙 알림 전송 실패:", error);
//   }
// };

// src/utils/slackNotify.ts (프론트엔드용)
import { getFunctions, httpsCallable } from "firebase/functions";

export const sendMailNotification = async (type: string, data: any) => {
  // 배포 안 하고 로컬에서 확인하고 싶을 때 쓰는 로그
  console.log("로컬 알림 테스트:", type, data);
  
  const functions = getFunctions();
  const trigger = httpsCallable(functions, 'triggerNotification');
  return trigger({ type, payload: data });
};