import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, PieChart, Coins, Users, ChevronDown, RotateCcw, Lightbulb
} from "lucide-react";

type SubItem = { id: number; name: string; amount: string };
type BudgetItem = {
  id: number;
  category: "수입" | "지출";
  name: string;
  amount: string;
  memo: string;
  subItems: SubItem[];
};
type BudgetState = {
  participants: string;
  feePerPerson: string;
  items: BudgetItem[];
};

// 실제 교회 청년부 여름수련회 결산 내역을 바탕으로 만든 기본 예시.
// 회비는 "참가 인원 × 인당 회비"로 자동 계산되므로 여기 항목에는 넣지 않는다.
const INITIAL_GUIDE_ITEMS: BudgetItem[] = [
  { id: 1, category: "수입", name: "재정 (교회 지원)", amount: "4500000", memo: "", subItems: [] },
  { id: 2, category: "수입", name: "찬조 (후원)", amount: "1900000", memo: "", subItems: [] },
  {
    id: 3, category: "지출", name: "숙소", amount: "", memo: "", subItems: [
      { id: 31, name: "장소 대여비", amount: "1000000" },
      { id: 32, name: "인솔자 숙소", amount: "333770" },
    ],
  },
  {
    id: 4, category: "지출", name: "식비", amount: "", memo: "", subItems: [
      { id: 41, name: "식사 (4일치)", amount: "2460000" },
      { id: 42, name: "추가 식사 (3일차 점심)", amount: "418000" },
      { id: 43, name: "마트 장보기", amount: "375970" },
    ],
  },
  { id: 5, category: "지출", name: "감사헌금", amount: "200000", memo: "", subItems: [] },
  { id: 6, category: "지출", name: "단체티", amount: "871900", memo: "", subItems: [] },
  {
    id: 7, category: "지출", name: "프로그램 시상", amount: "", memo: "", subItems: [
      { id: 71, name: "현금 지급", amount: "360000" },
      { id: 72, name: "네이버페이", amount: "50000" },
    ],
  },
  { id: 8, category: "지출", name: "운영비", amount: "497320", memo: "프로그램 운영비, 비품 등", subItems: [] },
  { id: 9, category: "지출", name: "차량·여행자 보험", amount: "89300", memo: "", subItems: [] },
  { id: 10, category: "지출", name: "상비약", amount: "55200", memo: "", subItems: [] },
];

const INITIAL_STATE: BudgetState = { participants: "", feePerPerson: "", items: INITIAL_GUIDE_ITEMS };

// 입력한 내용은 이 브라우저에만 임시 저장된다(새로고침해도 유지). 사파리 개인정보 보호 모드
// 등에서는 저장소 접근 자체가 막힐 수 있어 읽기/쓰기 모두 try/catch로 감싼다.
const STORAGE_KEY = "stayon_budget_planner_v1";

const loadState = (): BudgetState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.items)) return { ...INITIAL_STATE, ...parsed };
    }
  } catch { /* 저장소를 못 쓰면 기본 예시로 시작 */ }
  return INITIAL_STATE;
};

const toNumber = (value: string) => Number(String(value).replace(/[^0-9]/g, "")) || 0;
const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");
const formatComma = (value: string) => (value === "" ? "" : toNumber(value).toLocaleString());

// 세부 내역이 있으면 세부 내역 합계가 그 항목의 금액이 된다.
const itemTotal = (item: BudgetItem) =>
  item.subItems.length > 0
    ? item.subItems.reduce((sum, s) => sum + toNumber(s.amount), 0)
    : toNumber(item.amount);

const SectionCard = ({ children, title, description, icon: Icon, className = "" }: any) => (
  <div className={`bg-white rounded-[24px] p-5 md:p-6 border border-[#E5E8EB] shadow-sm ${className}`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#4E5968]" />
      </div>
      <div>
        <h3 className="text-[16px] font-black text-[#191F28]">{title}</h3>
        <p className="text-[11px] text-[#8B95A1] font-bold uppercase tracking-widest">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

// 쉼표가 자동으로 붙는 금액 입력칸. 7자리(수백만 원)도 잘리지 않게 폭을 넉넉히 잡는다.
const AmountInput = ({ value, onChange, readOnly = false, small = false }: { value: string; onChange?: (v: string) => void; readOnly?: boolean; small?: boolean }) => (
  <div className={`relative shrink-0 ${small ? "w-[112px]" : "w-[128px]"}`}>
    <input
      inputMode="numeric"
      value={formatComma(value)}
      readOnly={readOnly}
      onChange={(e) => onChange?.(onlyDigits(e.target.value))}
      placeholder="0"
      className={`w-full rounded-lg pl-2 pr-6 py-2 font-bold text-right outline-none ${small ? "text-[12px]" : "text-[13px]"} ${readOnly ? "bg-[#F2F4F6] text-[#4E5968] border border-transparent" : "bg-white border border-[#E5E8EB] focus:border-[#3182F6]"}`}
    />
    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[#8B95A1] font-bold ${small ? "text-[11px]" : "text-[12px]"}`}>원</span>
  </div>
);

export function BudgetPlanner() {
  const [state, setState] = useState<BudgetState>(loadState);
  const [openSubIds, setOpenSubIds] = useState<number[]>([]);
  const { participants, feePerPerson, items } = state;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* 저장 실패는 무시 */ }
  }, [state]);

  const updateItems = (updater: (items: BudgetItem[]) => BudgetItem[]) =>
    setState((prev) => ({ ...prev, items: updater(prev.items) }));

  const peopleCount = toNumber(participants);
  const feeIncome = peopleCount * toNumber(feePerPerson);
  const otherIncome = items.filter((i) => i.category === "수입").reduce((a, i) => a + itemTotal(i), 0);
  const totalIncome = feeIncome + otherIncome;
  const totalExpense = items.filter((i) => i.category === "지출").reduce((a, i) => a + itemTotal(i), 0);
  const netBalance = totalIncome - totalExpense;
  // 적자가 나지 않으려면 인당 회비를 얼마 받아야 하는지: (지출 − 재정·찬조 등 회비 외 수입) ÷ 인원,
  // 1,000원 단위로 올림.
  const neededFee = peopleCount > 0 ? Math.max(0, Math.ceil((totalExpense - otherIncome) / peopleCount / 1000) * 1000) : 0;

  const addItem = (category: "수입" | "지출") =>
    updateItems((list) => [...list, { id: Date.now(), category, name: "", amount: "", memo: "", subItems: [] }]);
  const removeItem = (id: number) => updateItems((list) => list.filter((i) => i.id !== id));
  const changeItem = (id: number, field: "name" | "amount" | "memo", value: string) =>
    updateItems((list) => list.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const addSubItem = (id: number) => {
    updateItems((list) => list.map((i) => {
      if (i.id !== id) return i;
      // 처음 세부 내역을 만들 때 이미 적어둔 금액이 사라지지 않도록 첫 세부 내역으로 옮긴다.
      const seed = i.subItems.length === 0 && i.amount ? [{ id: Date.now() - 1, name: "", amount: i.amount }] : [];
      return { ...i, amount: "", subItems: [...i.subItems, ...seed, { id: Date.now(), name: "", amount: "" }] };
    }));
    setOpenSubIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const changeSubItem = (id: number, subId: number, field: "name" | "amount", value: string) =>
    updateItems((list) => list.map((i) => (i.id === id
      ? { ...i, subItems: i.subItems.map((s) => (s.id === subId ? { ...s, [field]: value } : s)) }
      : i)));
  const removeSubItem = (id: number, subId: number) =>
    updateItems((list) => list.map((i) => {
      if (i.id !== id) return i;
      const rest = i.subItems.filter((s) => s.id !== subId);
      // 세부 내역을 다 지우면 마지막 금액을 다시 항목 금액으로 돌려준다.
      return rest.length === 0 ? { ...i, amount: i.subItems[0]?.amount || "", subItems: [] } : { ...i, subItems: rest };
    }));
  const toggleSub = (id: number) =>
    setOpenSubIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetToGuide = () => {
    if (!window.confirm("입력한 내용을 모두 지우고 기본 예시로 되돌릴까요?")) return;
    setState(INITIAL_STATE);
    setOpenSubIds([]);
  };

  const renderItem = (item: BudgetItem) => {
    const hasSub = item.subItems.length > 0;
    const isOpen = openSubIds.includes(item.id);
    return (
      <div key={item.id} className="py-3 border-b border-[#F2F4F6] last:border-b-0">
        <div className="flex items-center gap-2">
          <input
            value={item.name}
            onChange={(e) => changeItem(item.id, "name", e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#E5E8EB] focus:border-[#3182F6] rounded-lg px-3 py-2 text-[13px] font-bold outline-none"
            placeholder="항목명"
          />
          <AmountInput
            value={hasSub ? String(itemTotal(item)) : item.amount}
            readOnly={hasSub}
            onChange={(v) => changeItem(item.id, "amount", v)}
          />
          <button onClick={() => removeItem(item.id)} className="shrink-0 p-1 text-[#D1D6DB] hover:text-[#F04452]" aria-label="항목 삭제">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <input
            value={item.memo}
            onChange={(e) => changeItem(item.id, "memo", e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-1 text-[12px] font-medium text-[#6B7684] outline-none placeholder:text-[#C4C9CF]"
            placeholder="비고 (선택)"
          />
          {hasSub ? (
            <button onClick={() => toggleSub(item.id)} className="shrink-0 flex items-center gap-0.5 text-[12px] font-bold text-[#4E5968]">
              세부 내역 {item.subItems.length}건
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <button onClick={() => addSubItem(item.id)} className="shrink-0 text-[12px] font-bold text-[#8B95A1] hover:text-[#3182F6]">
              + 세부 내역
            </button>
          )}
        </div>

        {hasSub && isOpen && (
          <div className="mt-2 ml-2 pl-3 border-l-2 border-[#E5E8EB] space-y-1.5">
            {item.subItems.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2">
                <input
                  value={sub.name}
                  onChange={(e) => changeSubItem(item.id, sub.id, "name", e.target.value)}
                  className="flex-1 min-w-0 bg-[#F9FAFB] border border-[#F2F4F6] focus:border-[#3182F6] rounded-lg px-2.5 py-1.5 text-[12px] font-bold outline-none"
                  placeholder="세부 항목"
                />
                <AmountInput small value={sub.amount} onChange={(v) => changeSubItem(item.id, sub.id, "amount", v)} />
                <button onClick={() => removeSubItem(item.id, sub.id)} className="shrink-0 p-1 text-[#D1D6DB] hover:text-[#F04452]" aria-label="세부 내역 삭제">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => addSubItem(item.id)} className="text-[12px] font-bold text-[#3182F6]">+ 세부 내역 추가</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-10 p-4 md:p-6 font-sans">
      <main className="max-w-5xl mx-auto space-y-4 md:space-y-6">

        {/* 요약: 수입 총액 / 지출 총액 / 잔액 */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {[
            { label: "수입 총액", value: totalIncome, color: "text-[#00B050]" },
            { label: "지출 총액", value: totalExpense, color: "text-[#F04452]" },
            { label: "잔액", value: netBalance, color: netBalance >= 0 ? "text-[#3182F6]" : "text-[#F04452]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-3 md:p-5 rounded-[16px] md:rounded-[20px] border border-[#E5E8EB]">
              <p className="text-[11px] md:text-[12px] font-bold text-[#8B95A1] mb-1">{stat.label}</p>
              <p className={`text-[15px] md:text-[24px] font-black ${stat.color} break-all`}>
                {stat.value.toLocaleString()}<span className="text-[11px] md:text-[14px]">원</span>
              </p>
            </div>
          ))}
        </div>

        {/* 회비 계산: 참가 인원 × 인당 회비 = 회비 수입, 그리고 적자 없이 받으려면 얼마가 필요한지 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <SectionCard title="회비 계산" description="MEMBERSHIP FEE" icon={Users}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[12px] font-bold text-[#6B7684] mb-1.5">참가 인원</span>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={formatComma(participants)}
                    onChange={(e) => setState((prev) => ({ ...prev, participants: onlyDigits(e.target.value) }))}
                    placeholder="0"
                    className="w-full bg-[#F2F4F6] rounded-xl pl-4 pr-8 py-3 font-bold text-right outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#8B95A1]">명</span>
                </div>
              </label>
              <label className="block">
                <span className="block text-[12px] font-bold text-[#6B7684] mb-1.5">인당 회비</span>
                <div className="relative">
                  <input
                    inputMode="numeric"
                    value={formatComma(feePerPerson)}
                    onChange={(e) => setState((prev) => ({ ...prev, feePerPerson: onlyDigits(e.target.value) }))}
                    placeholder="0"
                    className="w-full bg-[#F2F4F6] rounded-xl pl-4 pr-8 py-3 font-bold text-right outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#8B95A1]">원</span>
                </div>
              </label>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F2F4F6]">
              <span className="text-[13px] font-bold text-[#6B7684]">회비 수입 (자동 계산)</span>
              <span className="text-[16px] font-black text-[#191F28]">{feeIncome.toLocaleString()}원</span>
            </div>
          </SectionCard>

          <div className="bg-[#3182F6] rounded-[24px] p-5 md:p-6 text-white flex flex-col justify-center">
            <span className="flex items-center gap-1.5 text-[#E8F3FF] text-[12px] font-bold mb-1">
              <Lightbulb className="w-4 h-4" /> 적자 없이 받으려면 인당 회비
            </span>
            <span className="text-[28px] font-black">
              {peopleCount > 0 ? `${neededFee.toLocaleString()}원` : "참가 인원을 입력하세요"}
            </span>
            <span className="text-[12px] text-[#E8F3FF] font-medium mt-2 leading-relaxed">
              (지출 총액 − 재정·찬조 등 회비 외 수입) ÷ 참가 인원, 1,000원 단위 올림
            </span>
          </div>
        </div>

        {/* 수입 / 지출 항목 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
          <SectionCard title="수입 항목" description="INCOME" icon={Coins}>
            <div className="flex items-center justify-between py-3 border-b border-[#F2F4F6]">
              <span className="text-[13px] font-bold text-[#4E5968]">회비 <span className="text-[11px] text-[#8B95A1]">(회비 계산에서 자동)</span></span>
              <span className="text-[13px] font-black text-[#191F28]">{feeIncome.toLocaleString()}원</span>
            </div>
            {items.filter((i) => i.category === "수입").map(renderItem)}
            <button onClick={() => addItem("수입")} className="mt-3 w-full py-2.5 rounded-xl bg-[#F2F8FF] text-[13px] font-bold text-[#3182F6] flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> 수입 항목 추가
            </button>
          </SectionCard>

          <SectionCard title="지출 항목" description="EXPENSES" icon={PieChart}>
            {items.filter((i) => i.category === "지출").map(renderItem)}
            <button onClick={() => addItem("지출")} className="mt-3 w-full py-2.5 rounded-xl bg-[#F2F8FF] text-[13px] font-bold text-[#3182F6] flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> 지출 항목 추가
            </button>
          </SectionCard>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[12px] font-bold text-[#8B95A1]">
          <span>입력한 내용은 이 기기의 브라우저에 자동 저장돼요.</span>
          <button onClick={resetToGuide} className="flex items-center gap-1 w-fit hover:text-[#4E5968]">
            <RotateCcw className="w-3.5 h-3.5" /> 기본 예시로 되돌리기
          </button>
        </div>
      </main>
    </div>
  );
}
