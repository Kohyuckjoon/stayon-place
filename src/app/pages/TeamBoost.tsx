import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration, useNavigate, useSearchParams } from "react-router-dom";
import { db, functions } from "../lib/firebase";
import {
  collection, query, where, onSnapshot, doc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Lock, Zap, Sparkles, Check, Search, ChevronRight, PartyPopper,
} from "lucide-react";
import { CustomInput } from "../components/forms/TeamFormControls";
import { TOP_BOOST_MAX_SLOTS, MAIN_BANNER_MAX_SLOTS, isTeamBoosted } from "../lib/teamDisplay";
import { ROOM_TOP_BOOST_MAX_SLOTS, ROOM_MAIN_BANNER_MAX_SLOTS } from "../lib/bandRoomDisplay";

type PlanId = "top" | "banner";
type TargetType = "team" | "bandroom";

// 외부 사역팀 "섭외율 높이기"와 합주실·연습실 "예약률 높이기"는 컬렉션·필드명만 다를 뿐
// 화면 흐름은 완전히 동일해서, 이 설정 하나로 같은 페이지를 두 종류로 재사용한다.
const TARGET_CONFIG: Record<TargetType, {
  collection: string; nameField: string; categoryField: string;
  tickerDoc: string; tickerField: string; registerPath: string; listPath: string;
  typeLabel: string; unitNoun: string; badgeLabel: string;
  heroTitle: string; heroSubtitle: string; topSlots: number; bannerSlots: number;
}> = {
  team: {
    collection: "ministryTeams",
    nameField: "teamName",
    categoryField: "category",
    tickerDoc: "teamTicker",
    tickerField: "teamIds",
    registerPath: "/team-register",
    listPath: "/teams",
    typeLabel: "외부 사역팀",
    unitNoun: "팀",
    badgeLabel: "섭외율 높이기",
    heroTitle: "우리 팀을 더 많은 담당자에게 보여주세요",
    heroSubtitle: "목록에서 눈에 띄는 위치를 신청하면, 섭외 문의가 더 빨리 들어와요.",
    topSlots: TOP_BOOST_MAX_SLOTS,
    bannerSlots: MAIN_BANNER_MAX_SLOTS,
  },
  bandroom: {
    collection: "bandRooms",
    nameField: "roomName",
    categoryField: "roomType",
    tickerDoc: "bandRoomTicker",
    tickerField: "roomIds",
    registerPath: "/band-room-register",
    listPath: "/teams?category=bandroom",
    typeLabel: "합주실·연습실",
    unitNoun: "공간",
    badgeLabel: "예약률 높이기",
    heroTitle: "우리 공간을 더 많은 예약자에게 보여주세요",
    heroSubtitle: "목록에서 눈에 띄는 위치를 신청하면, 예약 문의가 더 빨리 들어와요.",
    topSlots: ROOM_TOP_BOOST_MAX_SLOTS,
    bannerSlots: ROOM_MAIN_BANNER_MAX_SLOTS,
  },
};

const PLANS: {
  id: PlanId;
  emoji: string;
  title: string;
  bullets: string[];
  badge: string;
  price: number;
  buttonLabel: string;
  accent: string;
  accentBg: string;
}[] = [
  {
    id: "top",
    emoji: "🔼",
    title: "상단 노출",
    bullets: ["목록 맨 위쪽에 고정돼요", "목록 훑어볼 때 가장 먼저 보임", `"추천" 배지 부착`],
    badge: "🔥 추천",
    price: 39000,
    buttonLabel: "상단 노출 신청",
    accent: "#3182F6",
    accentBg: "#E8F3FF",
  },
  {
    id: "banner",
    emoji: "⭐",
    title: "메인 배너 노출",
    bullets: ["페이지 접속하자마자 보이는 곳에 노출돼요", "스크롤 없이 바로 눈에 띔 (제일 강력)", "상단 캐러셀 슬라이드 노출"],
    badge: "가장 강력",
    price: 89000,
    buttonLabel: "메인 배너 신청",
    accent: "#F59E0B",
    accentBg: "#FFF7E6",
  },
];

export function TeamBoost() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetType: TargetType = searchParams.get("type") === "bandroom" ? "bandroom" : "team";
  const cfg = TARGET_CONFIG[targetType];
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<"plans" | "apply" | "done">("plans");
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);

  // 슬롯 현황: 끌어올리기 중인 수(상단 노출), 티커에 등록된 수(메인 배너)
  const [approvedTargets, setApprovedTargets] = useState<any[]>([]);
  const [tickerIds, setTickerIds] = useState<string[]>([]);

  // "신청" 진입 시점에만 불러오는, 로그인한 사용자 본인 계정으로 등록한 승인된 대상 목록.
  // 관리자가 신청자를 대신해 등록해준 경우 applicantUid가 관리자 계정으로 남아있어서
  // 여기 안 뜨기 때문에, 아래 이름 검색으로도 어떤 승인된 대상이든 찾아서 신청할 수 있게 했다.
  const [myTargets, setMyTargets] = useState<any[]>([]);
  const [myTargetsLoading, setMyTargetsLoading] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");

  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  // 중복 신청 체크는 "누가 신청했는지"가 아니라 "이 대상으로 이미 대기 중인 신청이 있는지"로
  // 봐야 한다 (다른 계정이 신청했을 수도 있으므로) — targetId 기준으로 조회한다.
  const [targetPendingRequests, setTargetPendingRequests] = useState<any[]>([]);

  const [applicantName, setApplicantName] = useState("");
  const [applicantContact, setApplicantContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 탭(외부사역/합주실)이 바뀌면 완전히 새로운 신청 흐름이므로 처음부터 다시 시작한다.
  useEffect(() => {
    setStep("plans");
    setSelectedPlanId(null);
    setSelectedTarget(null);
    setTargetSearchQuery("");
  }, [targetType]);

  useEffect(() => {
    const unsubTargets = onSnapshot(
      query(collection(db, cfg.collection), where("status", "==", "approved")),
      (snap) => setApprovedTargets(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTicker = onSnapshot(doc(db, "settings", cfg.tickerDoc), (snap) => {
      setTickerIds(snap.exists() ? (snap.data()[cfg.tickerField] || []) : []);
    });
    return () => { unsubTargets(); unsubTicker(); };
  }, [cfg.collection, cfg.tickerDoc, cfg.tickerField]);

  useEffect(() => {
    if (step !== "apply" || !user) return;
    setMyTargetsLoading(true);
    const unsubMyTargets = onSnapshot(
      query(collection(db, cfg.collection), where("applicantUid", "==", user.uid), where("status", "==", "approved")),
      (snap) => {
        setMyTargets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setMyTargetsLoading(false);
      },
      () => setMyTargetsLoading(false)
    );
    return () => unsubMyTargets();
  }, [step, user, cfg.collection]);

  useEffect(() => {
    if (!selectedTarget) {
      setTargetPendingRequests([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, "teamBoostRequests"),
        where("targetId", "==", selectedTarget.id),
        where("targetType", "==", targetType),
        where("status", "==", "pending")
      ),
      (snap) => setTargetPendingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedTarget?.id, targetType]);

  useEffect(() => {
    if (!selectedTarget) return;
    setApplicantName(selectedTarget.applicantName || "");
    setApplicantContact(selectedTarget.applicantContact || "");
  }, [selectedTarget?.id]);

  const searchResults = useMemo(() => {
    const q = targetSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return approvedTargets.filter((t) => (t[cfg.nameField] || "").toLowerCase().includes(q)).slice(0, 8);
  }, [approvedTargets, targetSearchQuery, cfg.nameField]);

  const topBoostedCount = approvedTargets.filter(isTeamBoosted).length;
  const bannerCount = tickerIds.length;

  const openApply = (planId: PlanId) => {
    setSelectedPlanId(planId);
    setStep("apply");
  };

  const plan = PLANS.find((p) => p.id === selectedPlanId) || null;

  // 선택한 대상이 이 플랜을 이미 이용 중이거나, 같은 플랜으로 대기 중인 신청이 이미 있는지
  const alreadyActive = plan?.id === "top"
    ? isTeamBoosted(selectedTarget)
    : plan?.id === "banner" && !!selectedTarget && tickerIds.includes(selectedTarget.id);
  const alreadyPending = targetPendingRequests.some((r) => r.plan === plan?.id);

  const canSubmit = !!plan && !!selectedTarget && applicantName.trim() && applicantContact.trim() && !alreadyActive && !alreadyPending;

  const handleSubmit = async () => {
    if (!canSubmit || !plan || !selectedTarget || !user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "teamBoostRequests"), {
        targetType,
        targetId: selectedTarget.id,
        targetName: selectedTarget[cfg.nameField] || "",
        targetCategory: selectedTarget[cfg.categoryField] || "",
        plan: plan.id,
        applicantUid: user.uid,
        applicantName: applicantName.trim(),
        applicantContact: applicantContact.trim(),
        applicantEmail: user.email || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "TEAM_BOOST",
        payload: {
          planLabel: `${plan.emoji} ${plan.title} (월 ${plan.price.toLocaleString()}원)`,
          targetTypeLabel: cfg.typeLabel,
          targetName: selectedTarget[cfg.nameField] || "",
          applicantName: applicantName.trim(),
          applicantContact: applicantContact.trim(),
          applicantEmail: user.email || "",
        },
      });

      setStep("done");
    } catch (error) {
      console.error("높이기 신청 실패:", error);
      alert("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <div className="max-w-[720px] mx-auto px-5 pt-8">
        <button
          onClick={() => (step === "plans" ? navigate(cfg.listPath) : setStep("plans"))}
          className="flex items-center gap-1 text-[#8B95A1] hover:text-[#191F28] transition-all font-bold text-[13px] mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> {step === "plans" ? "목록으로" : "플랜 다시 고르기"}
        </button>

        <AnimatePresence mode="wait">
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-black bg-[#FFF7E6] text-[#F59E0B]">
                <Zap className="w-4 h-4" /> {cfg.badgeLabel}
              </div>
              <h1 className="text-[24px] md:text-[26px] font-black tracking-tight mb-2 break-keep">
                {cfg.heroTitle}
              </h1>
              <p className="text-[14px] text-[#8B95A1] font-bold mb-8 break-keep">
                {cfg.heroSubtitle}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {PLANS.map((p) => (
                  <div key={p.id} className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[20px]" style={{ background: p.accentBg }}>
                        {p.emoji}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black" style={{ background: p.accentBg, color: p.accent }}>
                        {p.badge}
                      </span>
                    </div>
                    <h3 className="text-[18px] font-black mb-3">{p.title}</h3>
                    <ul className="flex flex-col gap-2 mb-6 flex-1">
                      {p.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-[13px] font-bold text-[#4E5968]">
                          <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: p.accent }} />
                          <span className="break-keep">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[22px] font-black mb-4">
                      월 {p.price.toLocaleString()}원
                    </p>
                    <button
                      onClick={() => openApply(p.id)}
                      className="w-full py-3.5 rounded-2xl font-black text-[14px] text-white transition-all active:scale-95"
                      style={{ background: p.accent }}
                    >
                      {p.buttonLabel}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 p-4 bg-white border border-[#F2F4F6] rounded-2xl">
                <Sparkles className="w-4 h-4 text-[#ADB5BD] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#8B95A1] font-bold leading-relaxed break-keep">
                  슬롯이 한정돼 있어서 신청 순서대로 채워져요
                  (현재 상단 노출 {topBoostedCount}/{cfg.topSlots}, 메인 배너 {bannerCount}/{cfg.bannerSlots})
                </p>
              </div>
            </motion.div>
          )}

          {step === "apply" && plan && (
            <motion.div key="apply" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-2xl border border-[#F2F4F6]">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-[20px]" style={{ background: plan.accentBg }}>
                  {plan.emoji}
                </div>
                <div>
                  <p className="text-[15px] font-black">{plan.title}</p>
                  <p className="text-[13px] font-bold text-[#8B95A1]">월 {plan.price.toLocaleString()}원</p>
                </div>
              </div>

              {authLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
                </div>
              ) : !user ? (
                <div className="text-center py-16 bg-white rounded-[24px] border border-[#F2F4F6]">
                  <p className="text-[16px] font-black mb-2">로그인이 필요해요</p>
                  <p className="text-[13px] font-bold text-[#8B95A1] mb-6 break-keep">신청서를 작성하려면 먼저 로그인해주세요.</p>
                  <button
                    onClick={() => loginWithGoogle().catch(() => { })}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#191F28] text-white rounded-xl font-bold text-[14px]"
                  >
                    <Lock className="w-4 h-4" /> 로그인하고 계속하기
                  </button>
                </div>
              ) : !selectedTarget ? (
                <div className="bg-white rounded-[24px] border border-[#F2F4F6] p-6">
                  {myTargetsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <div className="w-6 h-6 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
                    </div>
                  ) : myTargets.length > 0 && (
                    <>
                      <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">내 계정으로 등록한 {cfg.unitNoun}</label>
                      <div className="flex flex-col gap-2 mb-6">
                        {myTargets.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTarget(t)}
                            className="text-left px-4 py-3.5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-2xl text-[14px] font-bold hover:border-[#3182F6] transition-all"
                          >
                            {t[cfg.nameField]} <span className="text-[#8B95A1] text-[13px]">({t[cfg.categoryField]})</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                    {myTargets.length > 0 ? `또는 다른 ${cfg.unitNoun} 찾기` : `신청할 ${cfg.unitNoun} 찾기`}
                  </label>
                  <p className="text-[12px] font-bold text-[#ADB5BD] mb-3 ml-1 break-keep">
                    관리자가 대신 등록해준 {cfg.unitNoun}이라 목록에 안 보인다면, 이름으로 검색해서 찾을 수 있어요.
                  </p>
                  <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                    <input
                      type="text"
                      value={targetSearchQuery}
                      onChange={(e) => setTargetSearchQuery(e.target.value)}
                      placeholder={`${cfg.unitNoun} 이름으로 검색`}
                      className="w-full h-11 bg-[#F9FAFB] rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
                    />
                  </div>

                  {targetSearchQuery.trim() && (
                    searchResults.length === 0 ? (
                      <p className="text-[13px] font-bold text-[#ADB5BD] py-4 text-center">검색 결과가 없어요.</p>
                    ) : (
                      <div className="flex flex-col gap-2 mb-2">
                        {searchResults.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTarget(t)}
                            className="text-left px-4 py-3 border border-[#F2F4F6] rounded-2xl hover:border-[#3182F6] transition-all"
                          >
                            <p className="text-[14px] font-black">{t[cfg.nameField]} <span className="text-[#8B95A1] text-[12px] font-bold">({t[cfg.categoryField]})</span></p>
                            <p className="text-[12px] font-bold text-[#ADB5BD]">신청자: {t.applicantName}</p>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  <button
                    onClick={() => navigate(cfg.registerPath)}
                    className="w-full mt-4 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-black text-[#8B95A1] border border-[#E5E8EB] hover:border-[#191F28] hover:text-[#191F28] transition-all"
                  >
                    찾는 {cfg.unitNoun}이 없어요 · 새로 등록하기 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-[#F2F4F6] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#8B95A1] mb-1">신청할 {cfg.unitNoun}</p>
                      <p className="text-[16px] font-black truncate">
                        {selectedTarget[cfg.nameField]} <span className="text-[#8B95A1] text-[13px] font-bold">({selectedTarget[cfg.categoryField]})</span>
                      </p>
                    </div>
                    <button onClick={() => setSelectedTarget(null)} className="shrink-0 text-[12px] font-bold text-[#8B95A1] hover:text-[#191F28]">
                      변경
                    </button>
                  </div>

                  {alreadyActive && (
                    <div className="flex items-center gap-2 p-3.5 bg-[#ECFDF5] rounded-xl mb-6 text-[13px] font-bold text-[#047857]">
                      <Check className="w-4 h-4 shrink-0" /> 이미 이 플랜을 이용 중이에요.
                    </div>
                  )}
                  {!alreadyActive && alreadyPending && (
                    <div className="flex items-center gap-2 p-3.5 bg-[#FFF7E6] rounded-xl mb-6 text-[13px] font-bold text-[#B45309]">
                      <Zap className="w-4 h-4 shrink-0" /> 이미 신청이 접수돼서 확인 중이에요.
                    </div>
                  )}

                  <CustomInput label="신청자 이름" value={applicantName} onChange={setApplicantName} placeholder="이름" required />
                  <CustomInput label="연락처" value={applicantContact} onChange={setApplicantContact} placeholder="010-0000-0000" required />

                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="w-full py-4 rounded-2xl font-black text-[15px] text-white transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    style={{ background: plan.accent }}
                  >
                    {submitting ? "신청 접수 중..." : "신청 접수하기"}
                  </button>
                  <p className="text-[12px] font-bold text-[#ADB5BD] text-center mt-3 break-keep">
                    신청 후 담당자가 결제 방법을 안내해드려요. 슬롯 상황에 따라 대기가 있을 수 있어요.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 bg-white rounded-[24px] border border-[#F2F4F6]">
              <PartyPopper className="w-10 h-10 text-[#F59E0B] mx-auto mb-4" />
              <p className="text-[18px] font-black mb-2">신청이 접수됐어요</p>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-8 break-keep">확인 후 안내드릴게요. 조금만 기다려주세요.</p>
              <button
                onClick={() => navigate(cfg.listPath)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#191F28] text-white rounded-xl font-bold text-[14px]"
              >
                목록으로 돌아가기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
