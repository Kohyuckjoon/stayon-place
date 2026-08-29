// src/utils/slackNotify.ts
// import * as nodemailer from "nodemailer";

// 아까 발급받은 긴 주소를 여기에 넣으세요!
// const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASS,
//   },
// });

// export const sendAdminEmail = async (subject: string, content: string) => {
//   // 🔥 핵심: 함수가 실행될 때 transporter를 생성해야 process.env 값을 정상적으로 읽습니다.
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.GMAIL_USER,
//       pass: process.env.GMAIL_PASS,
//     },
//   });

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
//     console.error("이메일 전송 오류 상세:", err); // 에러 로그를 상세히 찍도록 변경
//   }
// };

// export const sendSlackNotification = async (
//   type:
//     | "JOIN" | "VENUE" | "RESERVE" | "APPROVE"
//     | "CONFIRM" | "FINAL_DECISION" | "PAYMENT_COMPLETE",
//   data: any
// ) => {
//   let title = "";
//   let color = "";
//   let fields: any[] = [];
//   let mention = "<!here>";

//   switch (type) {
//   case "JOIN": {
//     title = "🎉 STAYON에 새로운 가족이 합류했습니다!";
//     color = "#3182f6";
//     fields = [
//       {title: "이름", value: data.name, short: true},
//       {title: "이메일", value: data.email, short: true},
//       {title: "가입 일시", value: data.date, short: false},
//     ];
//     break;
//   }
//   case "VENUE": {
//     title = "🏠 장소 등록 신청 접수";
//     color = "#27ae60";
//     fields = [
//       {title: "장소명", value: data.venueName, short: true},
//       {title: "신청자", value: data.applicant, short: true},
//     ];
//     break;
//   }
//   case "RESERVE": {
//     const isInsp = data.dateTime.includes("사전답사");
//     title = isInsp ? "🔍 새로운 사전답사 신청" : "📅 새로운 장소 예약 문의";
//     color = isInsp ? "#FFBB00" : "#f04452";
//     fields = [
//       {title: "장소명", value: data.venueName, short: true},
//       {title: "신청기관", value: data.userName, short: true},
//       {title: "연락처", value: data.phone, short: true},
//       {title: "신청일정", value: data.dateTime, short: false},
//     ];
//     break;
//   }
//   case "APPROVE": {
//     title = "✅ 예약/답사 승인 완료";
//     color = "#00D082";
//     mention = "";
//     fields = [
//       {title: "변경 상태", value: `🚀 ${data.status}`, short: true},
//       {title: "장소명", value: data.venueName, short: true},
//       {title: "대상기관", value: data.userName, short: false},
//     ];
//     break;
//   }
//   case "CONFIRM": {
//     title = "📍 사용자: 답사 일정 최종 확정";
//     color = "#3182f6";
//     fields = [
//       {title: "확정 장소", value: data.venueName, short: true},
//       {title: "신청자", value: data.userName, short: true},
//       {title: "상태", value: "실물 답사 진행 예정", short: false},
//     ];
//     break;
//   }
//   case "FINAL_DECISION": {
//     title = "🔥 [중요] 사용자가 장소를 최종 결정했습니다!";
//     color = "#F04452";
//     fields = [
//       {title: "결정 장소", value: data.venueName, short: true},
//       {title: "결정자", value: data.userName, short: true},
//       {title: "다음 단계", value: "💳 예약금 결제 페이지 진입함", short: false},
//     ];
//     break;
//   }
//   case "PAYMENT_COMPLETE": {
//     title = "🎉 [매출 발생] 최종 예약 결제 완료!";
//     color = "#00D082";
//     fields = [
//       {title: "예약 장소", value: data.venueName, short: true},
//       {title: "예약자", value: data.userName, short: true},
//       {
//         title: "결제 금액",
//         value: `${data.amount?.toLocaleString()}원`,
//         short: true,
//       },
//       {title: "결제 상태", value: "✅ 예약금 결제 완료", short: false},
//     ];
//     break;
//   }
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
//         ts: Math.floor(Date.now() / 1000),
//       },
//     ],
//   };

//   try {
//     const response = await fetch(SLACK_WEBHOOK_URL, {
//       method: "POST",
//       body: JSON.stringify(message),
//     });

//     if (response.ok) {
//       console.log("슬랙 알림 전송 완료!");
//     } else {
//       // 슬랙 응답이 실패했을 경우 로그 추가
//       const errorText = await response.text();
//       console.error("슬랙 응답 에러:", errorText);
//     }

//     await sendAdminEmail(
//       `[STAYON 알림] ${title}`,
//       `${title}\n\n상세 데이터:\n${JSON.stringify(data, null, 2)}`
//     );
//   } catch (error) {
//     console.error("알림 전송 오류:", error);
//   }
// };

// 임시
