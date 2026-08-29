import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Plus, Trash2, ChevronRight, PieChart, Coins, Users,
  CheckCircle2, Info, Lock, ArrowDownRight, ArrowUpLeft, Wallet, Sparkles
} from "lucide-react";

// 초기 가이드 데이터 정의
const INITIAL_GUIDE_DATA = [
  { id: 1, category: "수입", name: "청년회비", amount: "55000" },
  { id: 2, category: "지출", name: "식비", amount: "3000000" },
  { id: 3, category: "지출", name: "상품비", amount: "500000" },
  { id: 4, category: "지출", name: "상비약", amount: "60000" },
  { id: 5, category: "지출", name: "차량유지비", amount: "150000" },
  { id: 6, category: "지출", name: "여행자보험", amount: "100000" },
  { id: 7, category: "지출", name: "간식비", amount: "100000" },
  { id: 8, category: "지출", name: "숙소", amount: "1000000" },
  { id: 9, category: "지출", name: "권사님 숙소", amount: "500000" },
];

/** --- [기존 코드 유지] 스타일 및 보조 컴포넌트 --- */
const SectionCard = ({ children, title, description, icon: Icon, className = "" }: any) => (
  <div className={`bg-white rounded-[24px] p-6 border border-[#E5E8EB] shadow-sm ${className}`}>
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

export function BudgetPlanner() {
  const [participants, setParticipants] = useState<number>(0);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [totalBudget, setTotalBudget] = useState<number>(0);

  // 처음 마운트 시 가이드 데이터 로드
  useEffect(() => {
    setBudgetItems(INITIAL_GUIDE_DATA);
  }, []);

  const totalIncome = budgetItems.filter(i => i.category === "수입").reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const totalExpense = budgetItems.filter(i => i.category !== "수입").reduce((a, b) => a + (Number(b.amount) || 0), 0);

  const calculateTotal = () => { setTotalBudget(totalExpense); };

  useEffect(() => { calculateTotal(); }, [budgetItems]);

  const addBudgetItem = () => setBudgetItems([...budgetItems, { id: Date.now(), category: "지출", name: "", amount: "" }]);
  const addIncomeItem = () => setBudgetItems([...budgetItems, { id: Date.now(), category: "수입", name: "", amount: "" }]);
  const removeBudgetItem = (id: number) => setBudgetItems(budgetItems.filter(i => i.id !== id));
  const handleInputChange = (id: number, field: string, value: string) => {
    setBudgetItems(budgetItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-10 p-4 md:p-6 font-sans">
      <main className="max-w-5xl mx-auto space-y-6">
        
        {/* 대시보드 요약부: 한 화면에 들어오도록 콤팩트하게 수정 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "예상 수입", value: totalIncome, color: "text-[#00D45E]" },
            { label: "예상 지출", value: totalExpense, color: "text-[#F04452]" },
            { label: "잔액", value: netBalance, color: netBalance >= 0 ? "text-[#3182F6]" : "text-[#F04452]" }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-[20px] border border-[#E5E8EB] shadow-xs">
              <p className="text-[12px] font-bold text-[#8B95A1] mb-1">{stat.label}</p>
              <p className={`text-[24px] font-black ${stat.color}`}>{stat.value.toLocaleString()}<span className="text-[14px]">원</span></p>
            </div>
          ))}
        </div>

        {/* 가이드 및 인원 설정 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="참가자 수 입력" description="BASIC INFO" icon={Users}>
             <input type="number" placeholder="예: 50명" onChange={(e) => setParticipants(Number(e.target.value))} className="w-full bg-[#F2F4F6] rounded-xl px-4 py-3 font-bold outline-none" />
          </SectionCard>
          <div className="bg-[#3182F6] rounded-[24px] p-6 text-white flex flex-col justify-center">
            <span className="text-[#E8F3FF] text-[12px] font-bold mb-1">인당 예상 분담액</span>
            <span className="text-[28px] font-black">{(participants > 0 ? Math.floor(totalExpense / participants) : 0).toLocaleString()}원</span>
          </div>
        </div>

        {/* 수입/지출 통합 리스트: 가독성을 높인 리스트형 디자인 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="수입 항목" description="INCOME" icon={Coins}>
            {budgetItems.filter(i => i.category === "수입").map((item) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <input value={item.name} onChange={(e) => handleInputChange(item.id, "name", e.target.value)} className="w-full bg-white border border-[#E5E8EB] rounded-lg px-3 py-2 text-[13px] font-bold" placeholder="항목명" />
                <input type="number" value={item.amount} onChange={(e) => handleInputChange(item.id, "amount", e.target.value)} className="w-24 bg-white border border-[#E5E8EB] rounded-lg px-2 py-2 text-[13px] font-bold text-right" />
                <button onClick={() => removeBudgetItem(item.id)} className="text-[#E5E8EB] hover:text-[#F04452]"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={addIncomeItem} className="mt-2 w-full text-[12px] font-bold text-[#3182F6] flex items-center justify-center gap-1">+ 항목 추가</button>
          </SectionCard>

          <SectionCard title="지출 항목" description="EXPENSES" icon={PieChart}>
            {budgetItems.filter(i => i.category !== "수입").map((item) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <input value={item.name} onChange={(e) => handleInputChange(item.id, "name", e.target.value)} className="w-full bg-white border border-[#E5E8EB] rounded-lg px-3 py-2 text-[13px] font-bold" placeholder="항목명" />
                <input type="number" value={item.amount} onChange={(e) => handleInputChange(item.id, "amount", e.target.value)} className="w-24 bg-white border border-[#E5E8EB] rounded-lg px-2 py-2 text-[13px] font-bold text-right" />
                <button onClick={() => removeBudgetItem(item.id)} className="text-[#E5E8EB] hover:text-[#F04452]"><Trash2 size={16}/></button>
              </div>
            ))}
            <button onClick={addBudgetItem} className="mt-2 w-full text-[12px] font-bold text-[#3182F6] flex items-center justify-center gap-1">+ 항목 추가</button>
          </SectionCard>
        </div>

      </main>
    </div>
  );
}
