import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { ChevronLeft, ChevronRight, Lock, Star, PlusCircle, ClipboardCheck, Trash2 } from "lucide-react";
import { getTotalChecklistItems } from "../lib/preVisitChecklistItems";
import { showAlert, showConfirm } from "../lib/dialog";

export default function ChecklistList() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, "preVisitChecklists"), where("ownerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setChecklists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => { console.error("체크리스트 목록 조회 실패:", error); setLoading(false); });
    return () => unsub();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!(await showConfirm("이 체크리스트를 삭제할까요?"))) return;
    try {
      await deleteDoc(doc(db, "preVisitChecklists", id));
    } catch (error) {
      console.error("삭제 실패:", error);
      await showAlert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">내가 작성한 사전답사 체크리스트는 로그인 후 볼 수 있어요.</p>
        <button onClick={() => loginWithGoogle().catch(() => {})} className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] hover:bg-[#1b64da] transition-all">
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] py-5 sm:py-10 px-3 sm:px-6 font-sans antialiased">
      <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4E5968] hover:text-[#191F28] transition-all font-bold group px-1">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[15px]">뒤로가기</span>
        </button>

        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#191F28] tracking-tight">나의 사전답사 체크리스트</h1>
            <p className="text-[13px] font-bold text-[#8B95A1] mt-1">{checklists.length}개 작성됨</p>
          </div>
          <button onClick={() => navigate("/checklist/new")} className="shrink-0 flex items-center gap-1.5 px-4 py-3 bg-[#3182F6] text-white rounded-2xl text-[13px] font-black active:scale-95 transition-transform">
            <PlusCircle className="w-4 h-4" /> 새로 작성
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#ADB5BD] font-bold">불러오는 중...</div>
        ) : checklists.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E8EB]/60">
            <ClipboardCheck className="w-10 h-10 text-[#D1D6DB] mx-auto mb-3" />
            <p className="text-[14px] font-bold text-[#8B95A1] mb-5">아직 작성한 체크리스트가 없어요.</p>
            <button onClick={() => navigate("/checklist/new")} className="inline-flex items-center gap-1.5 px-5 py-3 bg-[#3182F6] text-white rounded-xl text-[13px] font-black">
              <PlusCircle className="w-4 h-4" /> 첫 체크리스트 작성하기
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {checklists.map((c) => {
              const checkedCount = Object.values(c.items || {}).filter((it: any) => it?.checked).length;
              const totalForThis = getTotalChecklistItems(!!c.venueId);
              return (
                <div key={c.id} onClick={() => navigate(`/checklist/${c.id}`)} className="bg-white rounded-2xl p-4 border border-[#E5E8EB]/60 shadow-sm active:bg-[#FAFAFB] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-black text-[#191F28] truncate">{c.venueName || "이름 없음"}</p>
                      <p className="text-[12px] font-bold text-[#3182F6] mt-0.5">{checkedCount}/{totalForThis} 체크 완료</p>
                    </div>
                    <button onClick={(e) => handleDelete(e, c.id)} className="shrink-0 p-2 text-[#D1D6DB] hover:text-[#F04452] active:scale-90 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    {c.evaluation?.rating ? (
                      <span className="flex items-center gap-0.5 text-[#FFC53D] text-[12px] font-bold">
                        <Star className="w-3.5 h-3.5 fill-[#FFC53D]" /> {c.evaluation.rating}
                      </span>
                    ) : <span />}
                    <ChevronRight className="w-4 h-4 text-[#D1D6DB]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
