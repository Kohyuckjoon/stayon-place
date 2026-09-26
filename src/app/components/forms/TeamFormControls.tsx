import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// 외부 사역팀 등록 폼(TeamRegistrationForm.tsx)에서 처음 만들어진 입력 컴포넌트 모음.
// 합주실·연습실 등록 폼(BandRoomRegistrationForm.tsx) 등 같은 톤이 필요한 화면에서 공유한다.

// [Input Component]
export const CustomInput = ({
  label, value, onChange, placeholder, required = false, error = "", autoFocus = false, hint = "",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; error?: string; autoFocus?: boolean; hint?: string;
}) => (
  <div className="group relative mb-5 md:mb-8">
    <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1 group-focus-within:text-[#3182f6] transition-colors tracking-tight">
      {label} {required && <span className="text-[#3182f6]">*</span>}
    </label>
    <input
      type="text"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 px-1 border-b-2 outline-none transition-all bg-transparent placeholder:text-[#d1d6db] text-[#191f28] ${error ? "border-[#f04452]" : "border-[#f2f4f6] focus:border-[#3182f6]"
        }`}
    />
    {hint && !error && (
      <p className="text-[12px] text-[#8b95a1] font-bold mt-2 ml-1">{hint}</p>
    )}
    <AnimatePresence>
      {error && (
        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[#f04452] text-xs font-semibold mt-2 ml-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

// PC용 columns 값(2~4)을 실제 Tailwind 클래스 문자열로 매핑. Tailwind는 빌드 시
// 소스 코드를 텍스트로 스캔해서 클래스를 골라내기 때문에 `md:grid-cols-${columns}`처럼
// 문자열을 그때그때 조합하면 인식하지 못한다 — 그래서 각 경우를 고정 문자열로 나열해둔다.
const DESKTOP_COLS_CLASS: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

// [Pill Selector] 짧은 보기 목록용 버튼 그룹 (단일 선택)
// 옵션 중 "레크리에이션 강사"처럼 글자 수가 긴 항목이 있으면, PC 기준 3~4열 그리드를
// 모바일 폭 그대로 쓸 때 버튼 하나가 너무 좁아져서 글자가 뭉개져 보인다. 모바일에서는
// 항상 2열로 고정하고, PC에서만 원래 지정한 columns 값을 쓰도록 반응형으로 바꿨다.
export const PillSelector = ({
  label, options, value, onChange, required = false, columns = 2,
}: {
  label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
  required?: boolean; columns?: number;
}) => (
  <div className="mb-5 md:mb-8">
    <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
      {label} {required && <span className="text-[#3182f6]">*</span>}
    </label>
    <div className={`grid grid-cols-2 gap-2 ${DESKTOP_COLS_CLASS[columns] ?? "md:grid-cols-3"}`}>
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          className={`py-3 md:py-3.5 px-2 rounded-2xl text-[12.5px] md:text-[14px] font-bold border-2 leading-snug break-keep transition-all ${value === opt
            ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
            : "border-[#f2f4f6] bg-white text-[#8b95a1] hover:border-[#e5e8eb]"
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

// [Card Selector] 선택지마다 짧은 설명이 붙어 있어야 할 때 (예: 장비 보유 여부) 쓰는 세로 카드형 단일 선택
export const CardSelector = ({
  label, options, value, onChange, required = false,
}: {
  label: string;
  options: readonly { value: string; desc: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) => (
  <div className="mb-5 md:mb-8">
    <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
      {label} {required && <span className="text-[#3182f6]">*</span>}
    </label>
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-left px-4 py-3.5 rounded-2xl border-2 transition-all ${value === opt.value
            ? "border-[#3182f6] bg-[#f2f8ff]"
            : "border-[#f2f4f6] bg-white hover:border-[#e5e8eb]"
            }`}
        >
          <span className={`block text-[14px] font-bold ${value === opt.value ? "text-[#3182f6]" : "text-[#191f28]"}`}>
            {opt.value}
          </span>
          <span className={`block text-[12px] font-bold mt-0.5 ${value === opt.value ? "text-[#3182f6]/70" : "text-[#8b95a1]"}`}>
            {opt.desc}
          </span>
        </button>
      ))}
    </div>
  </div>
);

// [Multi Pill Selector] 복수 선택용 - "전체" 버튼은 모든 항목을 한 번에 선택/해제하는 단축키 역할을 한다.
export const MultiPillSelector = ({
  label, options, value, onChange, required = false, columns = 3,
}: {
  label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void;
  required?: boolean; columns?: number;
}) => {
  const allSelected = options.every((o) => value.includes(o));
  const toggleAll = () => onChange(allSelected ? [] : [...options]);
  const toggleOne = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="mb-5 md:mb-8">
      <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
        {label} {required && <span className="text-[#3182f6]">*</span>}
      </label>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        <button
          type="button"
          onClick={toggleAll}
          className={`py-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${allSelected
            ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
            : "border-[#f2f4f6] bg-white text-[#8b95a1] hover:border-[#e5e8eb]"
            }`}
        >
          전체
        </button>
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => toggleOne(opt)}
            className={`py-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${value.includes(opt)
              ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
              : "border-[#f2f4f6] bg-white text-[#8b95a1] hover:border-[#e5e8eb]"
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
