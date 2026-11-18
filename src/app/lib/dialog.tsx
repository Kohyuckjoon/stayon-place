import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Info } from "lucide-react";

// 사이트 공용 알림/확인 팝업.
// 브라우저 기본 alert()/confirm() 대신 쓴다. 기본 alert/confirm은 사용자가 버튼을 누를 때까지
// 코드가 멈추는데, 이 팝업도 똑같이 "기다리게" 하려고 Promise를 돌려준다.
//
//   alert("완료");            →  await showAlert("완료");
//   if (!confirm("할까요?"))  →  if (!(await showConfirm("할까요?"))) return;
//
// await를 붙이면 기존 코드의 실행 순서(알림 → 확인 클릭 → 다음 동작)가 그대로 유지된다.
// React 컴포넌트 밖(일반 함수)에서도 호출할 수 있고, 화면에는 App.tsx의 <DialogHost />가 그린다.

type Tone = "success" | "error" | "info";

interface DialogOptions {
  title?: string;        // 굵은 제목. 없으면 메시지가 제목 자리에 크게 나온다.
  tone?: Tone;           // 아이콘 색/모양. 지정 안 하면 메시지 내용으로 추정한다.
  confirmText?: string;  // 확인 버튼 문구 (기본 "확인")
  cancelText?: string;   // 취소 버튼 문구 (기본 "취소", 확인 팝업에서만)
}

interface DialogRequest extends DialogOptions {
  id: number;
  kind: "alert" | "confirm";
  message: string;
  resolve: (value: boolean) => void;
}

let nextId = 1;
const queue: DialogRequest[] = [];
let notify: (() => void) | null = null;

function push(kind: "alert" | "confirm", message: unknown, options: DialogOptions = {}) {
  return new Promise<boolean>((resolve) => {
    queue.push({ id: nextId++, kind, message: String(message ?? ""), resolve, ...options });
    if (notify) {
      notify();
    } else {
      // 혹시 DialogHost가 아직 그려지기 전이면 브라우저 기본 창으로 대신 처리 (동작 누락 방지)
      const req = queue.pop()!;
      resolve(kind === "confirm" ? window.confirm(req.message) : (window.alert(req.message), true));
    }
  });
}

export function showAlert(message: unknown, options?: DialogOptions): Promise<void> {
  return push("alert", message, options).then(() => undefined);
}

export function showConfirm(message: unknown, options?: DialogOptions): Promise<boolean> {
  return push("confirm", message, options);
}

// 메시지 내용으로 아이콘 종류를 추정 (기존 alert 문구를 그대로 쓸 수 있게)
function guessTone(message: string): Tone {
  if (/오류|실패|에러|없습니다|불가|않습니다|못했|확인해주세요|입력해주세요|선택해주세요|동의해주세요/.test(message)) return "error";
  if (/완료|되었습니다|됐습니다|성공|저장|등록되었|변경되었/.test(message)) return "success";
  return "info";
}

const TONE_STYLE: Record<Tone, { bg: string; color: string; Icon: typeof Check }> = {
  success: { bg: "bg-[#F2F8FF]", color: "text-[#3182F6]", Icon: Check },
  error: { bg: "bg-[#FFF0F1]", color: "text-[#F04452]", Icon: AlertCircle },
  info: { bg: "bg-[#F2F8FF]", color: "text-[#3182F6]", Icon: Info },
};

export function DialogHost() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    notify = () => setVersion((v) => v + 1);
    return () => { notify = null; };
  }, []);

  const current = queue[0];

  const close = (value: boolean) => {
    const req = queue.shift();
    setVersion((v) => v + 1);
    req?.resolve(value);
  };

  // Enter = 확인, Esc = 취소(알림 팝업은 닫기)
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); close(true); }
      if (e.key === "Escape") { e.preventDefault(); close(current.kind === "alert"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const tone = current ? (current.tone || guessTone(current.message)) : "info";
  const { bg, color, Icon } = TONE_STYLE[tone];

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          // 바깥을 눌러도 닫히지 않게 한다: 확인 팝업에서 실수로 바깥을 눌러 "취소"가 되는 것 방지
          className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            role={current.kind === "confirm" ? "alertdialog" : "dialog"} aria-modal="true"
            className="w-full max-w-[360px] bg-white rounded-[32px] p-7 text-center shadow-[0_24px_80px_-20px_rgba(0,0,0,0.3)]"
          >
            <div className={`w-16 h-16 mx-auto mb-5 ${bg} rounded-full flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${color}`} strokeWidth={3} />
            </div>
            {current.title ? (
              <>
                <h2 className="text-[20px] font-black tracking-tight text-[#191F28] mb-2 break-keep">{current.title}</h2>
                <p className="text-[15px] font-bold text-[#6B7684] leading-relaxed break-keep whitespace-pre-line mb-7">{current.message}</p>
              </>
            ) : (
              <p className="text-[17px] font-black text-[#191F28] leading-relaxed break-keep whitespace-pre-line mb-7">{current.message}</p>
            )}
            {current.kind === "confirm" ? (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="flex-1 h-[54px] bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] rounded-[18px] font-black text-[16px] transition-all active:scale-[0.98]"
                >
                  {current.cancelText || "취소"}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className="flex-[1.4] h-[54px] bg-[#3182F6] hover:bg-[#1B64DA] text-white rounded-[18px] font-black text-[16px] shadow-lg shadow-[#3182F6]/20 transition-all active:scale-[0.98]"
                >
                  {current.confirmText || "확인"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className="w-full h-[54px] bg-[#3182F6] hover:bg-[#1B64DA] text-white rounded-[18px] font-black text-[16px] shadow-lg shadow-[#3182F6]/20 transition-all active:scale-[0.98]"
              >
                {current.confirmText || "확인"}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
