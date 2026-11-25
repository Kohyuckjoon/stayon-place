import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, arrayUnion, arrayRemove,
  query, where, orderBy, limit, getDocs,
} from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { isAdminEmail } from "../lib/adminEmails";
import { uploadPartnerImage } from "../lib/storage";
import { ALL_CHECKLIST_ITEM_IDS, getVisibleSections, getTotalChecklistItems } from "../lib/preVisitChecklistItems";
import { TIME_OPTIONS } from "../lib/bandRoomDisplay";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Camera, X, Star, Pencil, Lock, Gift, MapPin, ClipboardCheck, Cloud, UserCheck } from "lucide-react";
import { showAlert, showConfirm } from "../lib/dialog";

// 답사 가서 뭘 체크해야 할지 막막한 문제를 풀어주는 도구. 처음엔 10개 섹션을 아코디언으로
// 펼치고 항목마다 숫자/시간/날짜 등 입력 형식이 다 달랐는데, "서식 작성"처럼 느껴져서
// 폰 들고 현장에서 빠르게 체크하기 불편하다는 피드백을 받았다. 그래서 모든 문항을
// "체크 + 한 줄 메모"라는 하나의 동일한 패턴으로 통일했다.
// 로그인 안 한 사람도 그냥 체크리스트 자체는 보고 체크해볼 수 있게(저장은 안 됨) 열어두고,
// 로그인한 사람만 메모 입력 + 자동 저장이 된다. 저장 버튼이 따로 없고 건드릴 때마다 바로 저장된다.

function ChecklistRow({
  id, label, checked, note, editable, onToggle, onNoteChange, onNoteBlur,
}: {
  id: string; label: string; checked: boolean; note: string; editable: boolean;
  onToggle: (id: string) => void; onNoteChange: (id: string, v: string) => void; onNoteBlur: (id: string, v: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(!!note);
  return (
    <div className="px-4 py-4 lg:py-3.5 flex items-start gap-3">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${checked ? "bg-[#3182F6] border-[#3182F6]" : "border-[#D1D6DB]"}`}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] lg:text-[13.5px] font-bold leading-normal lg:leading-snug break-keep transition-colors ${checked ? "text-[#ADB5BD] line-through" : "text-[#191F28]"}`}>{label}</p>
        {editable ? (
          noteOpen ? (
            <input
              autoFocus={!note}
              value={note}
              onChange={(e) => onNoteChange(id, e.target.value)}
              onBlur={(e) => { onNoteBlur(id, e.target.value); if (!e.target.value) setNoteOpen(false); }}
              placeholder="메모 입력"
              className="mt-1.5 w-full h-10 lg:h-9 bg-[#F9FAFB] rounded-lg px-3 text-[14px] lg:text-[12.5px] font-medium outline-none border border-transparent focus:border-[#3182F6] transition-all"
            />
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} className="mt-1.5 lg:mt-1 text-[13px] lg:text-[11.5px] font-bold text-[#8B95A1] lg:text-[#ADB5BD] flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5 lg:w-3 lg:h-3" /> 메모 추가
            </button>
          )
        ) : note ? (
          <p className="mt-1 text-[13.5px] lg:text-[12px] font-medium text-[#6B7684]">{note}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function ChecklistForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const venueIdParam = searchParams.get("venueId");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [docId, setDocId] = useState<string | null>(id || null);
  const [venueId, setVenueId] = useState<string | null>(venueIdParam || null);
  const [venueName, setVenueName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [evaluation, setEvaluation] = useState<{ pros: string; cons: string; rating: number | null; memo: string }>({ pros: "", cons: "", rating: null, memo: "" });
  const [savedPulse, setSavedPulse] = useState(false);
  const [photoSectionOpen, setPhotoSectionOpen] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  // 상단 "마이페이지에서 열면 체크리스트가 자동!" 가이드 배너 접기/펼치기 - 한 번 접으면
  // 다음에 와도 접힌 채로 보이게 브라우저에 기억해둔다.
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem("checklistGuideOpen") !== "false"; } catch { return true; }
  });
  const toggleGuide = () => {
    setGuideOpen((prev) => {
      try { localStorage.setItem("checklistGuideOpen", String(!prev)); } catch {}
      return !prev;
    });
  };
  const [checkinOverride, setCheckinOverride] = useState<{ enabled: boolean; checkIn: string; checkOut: string }>({ enabled: false, checkIn: "", checkOut: "" });
  const [activeBooking, setActiveBooking] = useState<{ venueId: string; venueName: string } | null>(null);
  // 장소 이름 필수 - 이름 없이 첫 체크/메모/사진 등을 하면 "어느 장소 답사인가요?" 팝업을
  // 띄우고, 이름을 받아야 체크리스트가 저장된다(관리자 화면 "장소 이름 미입력" 방지).
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameResolverRef = useRef<((name: string | null) => void) | null>(null);
  const askVenueName = () => new Promise<string | null>((resolve) => {
    nameResolverRef.current = resolve;
    setNameDraft("");
    setNameModalOpen(true);
  });
  const closeNameModal = (name: string | null) => {
    setNameModalOpen(false);
    const resolve = nameResolverRef.current;
    nameResolverRef.current = null;
    resolve?.(name);
  };
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestVenueName, setSuggestVenueName] = useState("");
  const [suggestLocation, setSuggestLocation] = useState("");
  const [suggestContact, setSuggestContact] = useState("");
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  const docCreationRef = useRef<Promise<string | null> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserRef = useRef<typeof user>(null);

  useEffect(() => {
    if (authLoading) return;
    const applyDoc = (docId: string, d: any) => {
      setDocId(docId);
      setVenueId(d.venueId || null);
      setVenueName(d.venueName || "");
      const itemsMap = d.items || {};
      const c: Record<string, boolean> = {};
      const n: Record<string, string> = {};
      Object.keys(itemsMap).forEach((k) => { c[k] = !!itemsMap[k]?.checked; n[k] = itemsMap[k]?.note || ""; });
      setChecked(c);
      setNotes(n);
      setPhotos(d.photos || []);
      setEvaluation({ pros: d.evaluation?.pros || "", cons: d.evaluation?.cons || "", rating: d.evaluation?.rating ?? null, memo: d.evaluation?.memo || "" });
      setCheckinOverride({ enabled: !!d.checkinOverride?.enabled, checkIn: d.checkinOverride?.checkIn || "", checkOut: d.checkinOverride?.checkOut || "" });
    };
    const init = async () => {
      try {
        if (id) {
          if (!user) { setLoadingInitial(false); return; }
          const snap = await getDoc(doc(db, "preVisitChecklists", id));
          if (!snap.exists()) { await showAlert("체크리스트를 찾을 수 없습니다."); navigate("/checklists"); return; }
          const d = snap.data() as any;
          if (d.ownerId !== user.uid && !isAdminEmail(user.email)) { setForbidden(true); setLoadingInitial(false); return; }
          applyDoc(id, d);
        } else if (venueIdParam) {
          const snap = await getDoc(doc(db, "venues", venueIdParam));
          if (snap.exists()) {
            const v = snap.data() as any;
            setVenueId(venueIdParam);
            setVenueName(v.venueName || "");
          }
          // 이 장소로 전에 이미 만들어둔 체크리스트가 있으면 빈 걸로 새로 시작하지 않고
          // 그걸 이어서 쓴다 - 같은 장소 체크리스트가 중복으로 쌓이는 문제 방지.
          if (user) {
            const q = query(
              collection(db, "preVisitChecklists"),
              where("ownerId", "==", user.uid),
              where("venueId", "==", venueIdParam),
              limit(5)
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
              const docs = existing.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() as any }));
              docs.sort((a, b) => (b.data.updatedAt?.toMillis?.() || 0) - (a.data.updatedAt?.toMillis?.() || 0));
              const latest = docs[0];
              applyDoc(latest.id, latest.data);
              navigate(`/checklist/${latest.id}`, { replace: true });
            }
          }
        }
      } catch (error) {
        console.error("체크리스트 초기화 실패:", error);
      } finally {
        setLoadingInitial(false);
      }
    };
    init();
  }, [id, venueIdParam, user, authLoading, navigate]);

  // 장소 지정 없이(헤더 메뉴로) 들어온 로그인 사용자에게 - "마이페이지 가면 있어요"라고만
  // 말해서는 처음 보는 사람이 가볼 이유를 못 느낀다는 피드백. 로그인 상태면 바로
  // 진행 중인 예약(답사 확정 대기/완료 단계)을 조회해서, 있으면 그 장소 이름을 직접
  // 보여주고 바로 연결되는 배너로 교체한다.
  useEffect(() => {
    if (!user || id || venueIdParam) { setActiveBooking(null); return; }
    (async () => {
      try {
        const q = query(
          collection(db, "bookings"),
          where("email", "==", user.email || ""),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        const match = snap.docs
          .map((d) => d.data() as any)
          .find((b) => b.venueId && (b.status === "inspection_confirmed" || b.status === "confirmed"));
        if (match) setActiveBooking({ venueId: match.venueId, venueName: match.venueName || "" });
      } catch (error) {
        console.error("진행 중인 예약 조회 실패:", error);
      }
    })();
  }, [user, id, venueIdParam]);

  const pulseSaved = () => {
    setSavedPulse(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedPulse(false), 1500);
  };

  const ensureDoc = async (): Promise<string | null> => {
    if (!user) return null;
    if (docId) return docId;
    if (!docCreationRef.current) {
      docCreationRef.current = (async () => {
        let name = venueName.trim();
        if (!name) {
          const entered = await askVenueName();
          if (!entered) {
            // 팝업을 닫으면 저장하지 않고, 다음 체크 때 다시 물어본다.
            docCreationRef.current = null;
            return null;
          }
          name = entered;
          setVenueName(entered);
        }
        const ref = await addDoc(collection(db, "preVisitChecklists"), {
          ownerId: user.uid,
          ownerEmail: user.email,
          venueId: venueId || null,
          venueName: name,
          items: {},
          photos: [],
          evaluation: { pros: "", cons: "", rating: null, memo: "" },
          checkinOverride: { enabled: false, checkIn: "", checkOut: "" },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setDocId(ref.id);
        navigate(`/checklist/${ref.id}`, { replace: true });
        return ref.id;
      })();
    }
    return docCreationRef.current;
  };

  // 팝업이 떠 있는 동안 뒤 배경이 같이 스크롤되던 문제 - 열려있는 동안 배경 스크롤을 잠근다.
  useEffect(() => {
    if (!suggestModalOpen && !nameModalOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [suggestModalOpen, nameModalOpen]);

  // 장소 추천 팝업의 주소 검색 - RegisterVenue.tsx와 동일한 다음 우편번호 API.
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const handleSuggestAddressSearch = () => {
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setSuggestLocation(data.address);
      },
    }).open();
  };

  // 로그인 전에 체크해둔 내용이 있으면, 로그인하는 순간 그대로 저장해서 잃어버리지 않게 한다.
  useEffect(() => {
    const justLoggedIn = !prevUserRef.current && !!user;
    prevUserRef.current = user;
    if (!justLoggedIn || id) return;
    const hasLocalProgress = Object.values(checked).some(Boolean) || Object.values(notes).some((n) => !!n?.trim());
    if (!hasLocalProgress || docId) return;
    (async () => {
      try {
        const items: Record<string, any> = {};
        ALL_CHECKLIST_ITEM_IDS.forEach((iid) => {
          if (checked[iid] || notes[iid]?.trim()) items[iid] = { checked: !!checked[iid], note: notes[iid] || "" };
        });
        // 로그인 전에 체크해둔 내용 - 장소 이름부터 받는다. 팝업을 닫아도 체크한 내용은
        // 잃어버리지 않게 이름 없이 저장한다.
        let name = venueName.trim();
        if (!name) {
          name = (await askVenueName()) || "";
          if (name) setVenueName(name);
        }
        const ref = await addDoc(collection(db, "preVisitChecklists"), {
          ownerId: user!.uid, ownerEmail: user!.email, venueId: venueId || null, venueName: name,
          items, photos: [], evaluation: { pros: "", cons: "", rating: null, memo: "" },
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        setDocId(ref.id);
        navigate(`/checklist/${ref.id}`, { replace: true });
        pulseSaved();
      } catch (error) {
        console.error("체크 내용 저장 실패:", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggle = async (itemId: string) => {
    const next = !checked[itemId];
    setChecked((prev) => ({ ...prev, [itemId]: next }));
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) {
        // 장소 이름 팝업을 닫은 경우 - 저장 안 됐으니 체크도 되돌린다.
        setChecked((prev) => ({ ...prev, [itemId]: !next }));
        return;
      }
      await updateDoc(doc(db, "preVisitChecklists", dId), { [`items.${itemId}.checked`]: next, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  const handleNoteBlur = async (itemId: string, value: string) => {
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { [`items.${itemId}.note`]: value, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  const handleVenueNameBlur = async () => {
    if (!user || venueId || !venueName.trim()) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { venueName, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  // 로그인 없이도 제출 가능 - 답사 가서 STAYON에 없는 곳을 발견했을 때 바로 제보할 수 있어야
  // 하는데, 로그인부터 시키면 그 자리에서 포기하고 나갈 가능성이 높다. /admin/venue-suggestions
  // 목록에 쌓인다.
  const handleSuggestSubmit = async () => {
    if (!suggestVenueName.trim() || !suggestContact.trim()) return;
    setSuggestSubmitting(true);
    try {
      await addDoc(collection(db, "venueSuggestions"), {
        venueName: suggestVenueName.trim(),
        location: suggestLocation.trim(),
        contact: suggestContact.trim(),
        status: "new",
        suggestedByUid: user?.uid || null,
        suggestedByEmail: user?.email || null,
        createdAt: serverTimestamp(),
      });
      // 관리자 메일 알림 - 메일이 실패해도 제보 자체는 이미 저장됐으니 제출 실패로 보지 않는다.
      httpsCallable(functions, "triggerAdminNotification")({
        type: "VENUE_SUGGESTION",
        payload: {
          venueName: suggestVenueName.trim(),
          location: suggestLocation.trim(),
          contact: suggestContact.trim(),
          email: user?.email || null,
        },
      }).catch((err) => console.error("장소 추천 알림 메일 실패:", err));
      setSuggestModalOpen(false);
      setSuggestVenueName("");
      setSuggestLocation("");
      setSuggestContact("");
      setSuggestSuccess(true);
      setTimeout(() => setSuggestSuccess(false), 2500);
    } catch (error) {
      console.error("장소 추천 제출 실패:", error);
      await showAlert("제출 중 오류가 발생했습니다.");
    } finally {
      setSuggestSubmitting(false);
    }
  };

  // 작성 중인 내용이 있으면 바깥을 눌러도 바로 닫지 않고 한 번 확인한다.
  const handleSuggestClose = async () => {
    const hasDraft = suggestVenueName.trim() || suggestLocation.trim() || suggestContact.trim();
    if (hasDraft && !(await showConfirm("작성 중인 내용이 있습니다. 취소할까요?"))) return;
    setSuggestModalOpen(false);
  };

  const handleCheckinToggle = async () => {
    const next = { ...checkinOverride, enabled: !checkinOverride.enabled, checkIn: checkinOverride.checkIn || "15:00", checkOut: checkinOverride.checkOut || "11:00" };
    setCheckinOverride(next);
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { checkinOverride: next, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  const handleCheckinTimeChange = async (field: "checkIn" | "checkOut", value: string) => {
    const next = { ...checkinOverride, [field]: value };
    setCheckinOverride(next);
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { checkinOverride: next, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0 || !user) return;
    setUploadingPhoto(true);
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      for (const file of files) {
        const url = await uploadPartnerImage(file, "checklists", venueName || "unknown", user.displayName || user.email || "anonymous");
        setPhotos((prev) => [...prev, url]);
        await updateDoc(doc(db, "preVisitChecklists", dId), { photos: arrayUnion(url), updatedAt: serverTimestamp() });
      }
      pulseSaved();
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      await showAlert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (url: string) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
    if (!docId) return;
    try {
      await updateDoc(doc(db, "preVisitChecklists", docId), { photos: arrayRemove(url), updatedAt: serverTimestamp() });
    } catch (error) { console.error("삭제 실패:", error); }
  };

  const handleRatingChange = async (value: number | null) => {
    setEvaluation((prev) => ({ ...prev, rating: value }));
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { "evaluation.rating": value, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  const handleEvalTextBlur = async (field: "pros" | "cons" | "memo", value: string) => {
    if (!user) return;
    try {
      const dId = await ensureDoc();
      if (!dId) return;
      await updateDoc(doc(db, "preVisitChecklists", dId), { [`evaluation.${field}`]: value, updatedAt: serverTimestamp() });
      pulseSaved();
    } catch (error) { console.error("저장 실패:", error); }
  };

  if (authLoading || loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  if (id && !user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">저장된 체크리스트는 로그인 후 볼 수 있어요.</p>
        <button onClick={() => loginWithGoogle().catch(() => {})} className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] hover:bg-[#1b64da] transition-all">
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[18px] font-black text-[#191f28] mb-3">볼 수 없는 체크리스트입니다.</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">본인이 작성한 체크리스트만 볼 수 있어요.</p>
        <button onClick={() => navigate("/checklists")} className="inline-flex px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px]">목록으로</button>
      </div>
    );
  }

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const visibleSections = getVisibleSections(!!venueId);
  const totalChecklistItems = getTotalChecklistItems(!!venueId);

  return (
    <div className="min-h-screen bg-[#F2F4F6] py-4 sm:py-10 px-3 sm:px-6 font-sans antialiased">
      {/* 뒤로가기는 가이드 배너 아래가 아니라 최상단에 - 오른쪽엔 배너 접기/펼치기 버튼. */}
      <div className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto mb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4E5968] hover:text-[#191F28] transition-all font-bold group px-1">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[15px]">뒤로가기</span>
        </button>
        {!venueId && !activeBooking && (
          <button
            type="button"
            onClick={toggleGuide}
            className="hidden md:flex items-center gap-1 rounded-full bg-white border border-[#E5E8EB] px-3.5 py-1.5 text-[12.5px] font-bold text-[#6B7684] hover:text-[#191F28] active:scale-95 transition-all"
          >
            {guideOpen ? "가이드 접기" : "가이드 펼치기"}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${guideOpen ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {/* 축소해서 안 보일 자리에 끼워넣지 말고, 최상단에 크게 보여달라는 피드백 - 본문은
          좁은 max-w-xl 칼럼인데 이 배너만 훨씬 넓게 쓰려고 그 바깥(이 레벨)에 둔다.
          접기/펼치기는 height auto 애니메이션으로 스르륵 열리고 닫히게 한다. */}
      {!venueId && !activeBooking && (
        <AnimatePresence initial={false}>
          {guideOpen && (
            <motion.div
              key="checklist-guide"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="hidden md:block max-w-4xl lg:max-w-5xl mx-auto overflow-hidden"
            >
              <button
                type="button"
                onClick={() => navigate("/mypage")}
                className="block w-full mb-4 overflow-hidden rounded-[28px] shadow-sm active:scale-[0.99] transition-transform"
              >
                <img src="/checklist_guide_v2.png" alt="마이페이지에서 열면 체크리스트가 자동으로 만들어져요" className="w-full h-auto" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <div className="max-w-xl lg:max-w-5xl mx-auto space-y-3">

        {/* PC에서는 제목 카드 + 로그인/안내 박스를 좌우 한 줄로 - 넓어진 화면에서 세로로만
            쌓이면 공간이 비어 보인다는 피드백. 모바일은 그대로 위아래로 쌓는다.
            items-stretch로 제목 카드 높이를 옆 로그인 이미지(memo_login_new) 높이에 맞춘다. */}
        <div className="lg:flex lg:gap-3 lg:items-stretch">
        <div className={`lg:flex-1 lg:flex lg:flex-col ${!user ? "lg:h-[260px]" : ""} bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-[#E5E8EB]/60`}>
          {venueId && venueName ? (
            <h1 className="text-lg sm:text-xl font-black text-[#191F28] mb-1">{venueName} 답사 체크리스트</h1>
          ) : user ? (
            <>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">장소 이름 <span className="text-[#F04452]">(필수)</span></label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                onBlur={handleVenueNameBlur}
                placeholder="답사하는 장소 이름"
                className="w-full h-12 bg-[#F9FAFB] rounded-[14px] px-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all mb-3"
              />
            </>
          ) : (
            <h1 className="text-lg sm:text-xl font-black text-[#191F28] mb-1">수련회 답사 체크리스트</h1>
          )}
          {/* 회색 한 줄 문장이 밋밋하다는 피드백 - 토스식 안내 리스트로 바꿨다(연한 색 원형
              아이콘 + 굵은 한 줄). 두 번째 줄은 로그인 여부에 따라 지금 사용자에게 필요한 안내로. */}
          <ul className="mt-3 space-y-2.5 lg:space-y-2">
            <li className="flex items-start lg:items-center gap-2.5">
              <span className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F3FF]">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#3182F6]" />
              </span>
              <p className="text-[clamp(11px,3.5vw,14px)] whitespace-nowrap lg:whitespace-normal lg:text-[13px] font-bold text-[#4E5968] leading-snug break-keep">답사 가서 뭘 확인해야 할지, <span className="text-[#3182F6]">스테이온이 미리 정리</span>했어요.</p>
            </li>
            <li className="flex items-start lg:items-center gap-2.5">
              {user ? (
                <>
                  <span className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFEEEE]">
                    <Cloud className="w-3.5 h-3.5 text-[#F04452]" />
                  </span>
                  <p className="text-[clamp(11px,3.5vw,14px)] whitespace-nowrap lg:whitespace-normal lg:text-[13px] font-bold text-[#4E5968] leading-snug break-keep">별도 저장 버튼 없이 <span className="text-[#F04452]">자동 저장</span>돼요.</p>
                </>
              ) : (
                <>
                  <span className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E5F8EE]">
                    <UserCheck className="w-3.5 h-3.5 text-[#03B26C]" />
                  </span>
                  <p className="text-[clamp(11px,3.5vw,14px)] whitespace-nowrap lg:whitespace-normal lg:text-[13px] font-bold text-[#4E5968] leading-snug break-keep">꼭 로그인/회원가입을 하지 않아도 <span className="text-[#03B26C]">바로 사용</span>할 수 있어요.</p>
                </>
              )}
            </li>
          </ul>

          {/* 주황색이 파랑/네이비/흰색 톤인 페이지 전체에서 혼자 튀고 화면에서 제일 진한
              덩어리라 메인인 체크리스트보다 눈에 먼저 들어온다는 피드백 - "3초만에 시작하기"
              버튼과 같은 다크 네이비(#191F28)로 바꾸고, 커피쿠폰 부분만 카카오톡 버튼과
              같은 노란색(#FEE500) 뱃지로 포인트를 줬다. 클릭 가능하다는 건 색/그림자가 아니라
              화살표로 보여준다. */}
          {!venueId && (
            <button
              type="button"
              onClick={() => setSuggestModalOpen(true)}
              className="group mt-4 lg:mt-auto w-full flex items-center justify-between gap-3 rounded-2xl bg-[#191F28] px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <MapPin className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-[14px] font-bold text-white">스테이온에 없는 장소인가요?</p>
                  <span className="mt-1 inline-block rounded-full bg-[#FEE500] px-2 py-0.5 text-[11px] font-black text-[#373206]">☕ 등록되면 커피쿠폰 100%</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 shrink-0 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>

        {/* 로그인 배너 + 마이페이지 배너가 따로 색 박스로 쌓여 산만해 보인다는 피드백으로
            하나의 회색 박스에 같이 넣었었는데, memo_login.png 자체가 이미 카드 모양으로
            디자인되어 있어서 그걸 또 박스로 감싸면 "박스 안에 박스"가 되어 불필요했다.
            그래서 이미지는 박스 없이 그 자리를 그대로 채우고, 마이페이지/진행중 예약
            안내만 필요할 때 자기 박스를 갖는다. */}
        {(!user || !venueId) && (
          <div className={`${user ? "lg:flex-1" : "lg:flex-none"} mt-3 lg:mt-0 space-y-3`}>
            {/* PC에선 이미지 높이를 고정하고 너비는 비율대로 둔다 - 너비 기준(w-full)이면 칼럼
                폭에 따라 높이가 달라져서 왼쪽 카드와 안 맞았다. memo_login_new.png(1605x735)는
                카드 바깥에 그림자용 투명 여백(위 12, 아래 24, 좌우 12px)이 있다. 그래서 버튼 박스를
                보이는 카드 크기(588x260)로 고정하고, 이미지는 273px 높이로 그리되 relative로 여백만큼
                당겨서 보이는 카드가 박스에 딱 맞게 한다. 왼쪽 카드는 stretch로 이 260px에 맞춰진다.
                (음수 마진은 버튼 박스 높이에 반영이 안 돼서 높이가 계속 안 맞았다) */}
            {/* 모바일에선 이미지가 폭 343px로 줄어들면서 안의 글씨가 너무 작아 안 읽힌다는
                피드백 - 같은 내용을 글자로 다시 그린 카드로 대체하고, 이미지는 md 이상에서만. */}
            {!user && (
              <div className="md:hidden bg-white rounded-3xl p-5 shadow-sm border border-[#E5E8EB]/60">
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F3FF]">
                      <Check className="w-3.5 h-3.5 text-[#3182F6]" strokeWidth={3} />
                    </span>
                    <p className="pt-1 text-[14px] font-bold text-[#4E5968] leading-snug break-keep">로그인하면 메모를 남기고 <span className="text-[#3182F6]">자동으로 저장</span>돼요.</p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFEEEE]">
                      <X className="w-3.5 h-3.5 text-[#F04452]" strokeWidth={3} />
                    </span>
                    <p className="pt-1 text-[14px] font-bold text-[#4E5968] leading-snug break-keep">로그인하지 않으면 체크한 내용이 <span className="text-[#F04452]">저장되지 않아요.</span></p>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => loginWithGoogle().catch(() => {})}
                  className="mt-4 w-full h-12 rounded-2xl bg-[#3182F6] text-white text-[15px] font-black active:scale-[0.98] transition-transform"
                >
                  로그인하고 저장하기
                </button>
              </div>
            )}
            {!user && (
              <button type="button" onClick={() => loginWithGoogle().catch(() => {})} className="hidden md:block w-full lg:w-[588px] lg:h-[260px] active:scale-[0.99] transition-transform">
                <img src="/memo_login_new.png" alt="로그인하면 메모를 남기고 자동으로 저장돼요. 로그인하지 않은 상태에서 이용 시 저장되지 않습니다. 눌러서 로그인하기" className="w-full h-auto lg:relative lg:-top-1 lg:-left-1 lg:w-[596px] lg:max-w-none lg:h-[273px]" />
              </button>
            )}
            {/* 헤더(플래너) 메뉴를 통해 특정 장소 없이 들어온 경우에만 보여준다 - 이미 특정
                장소에 맞춰 들어온 경우(마이페이지/장소 상세페이지)엔 불필요한 안내라서 뺀다.
                로그인 상태면 진행 중인 예약을 직접 찾아서 장소 이름까지 보여준다 -
                "마이페이지 가면 있어요"라고만 하면 처음 보는 사람은 가볼 이유를 못 느낀다는
                피드백 반영. 못 찾았을 때만 기존의 일반 안내로 대체한다. */}
            {!venueId && (
              <div className={`bg-[#F9FAFB] rounded-2xl px-5 py-4 flex items-center justify-between gap-3 ${activeBooking ? "" : "md:hidden"}`}>
                {activeBooking ? (
                  <>
                    <p className="text-[13.5px] lg:text-[12.5px] font-bold text-[#4E5968] lg:text-[#6B7684] leading-relaxed break-keep">
                      진행 중인 예약이 있어요 — <span className="text-[#191F28] font-black">{activeBooking.venueName}</span> 전용 체크리스트로 이어서 쓸 수 있어요.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/checklist/new?venueId=${activeBooking.venueId}`)}
                      className="shrink-0 px-4 py-2.5 bg-[#191F28] text-white rounded-xl text-[12.5px] font-black active:scale-95 transition-transform whitespace-nowrap"
                    >
                      이어서 쓰기
                    </button>
                  </>
                ) : (
                  // 모바일 전용(바깥 박스가 md:hidden) - 데스크톱에서는 위쪽 이미지
                  // 배너가 같은 내용을 더 친절하게 보여주고 있어서 이 박스 자체가 안
                  // 뜬다. 빈 박스로 공간만 차지하는 걸 막기 위함.
                  <div className="flex items-center justify-between gap-3 w-full">
                    <p className="text-[13.5px] lg:text-[12.5px] font-bold text-[#4E5968] lg:text-[#6B7684] leading-relaxed break-keep">스테이온에서 예약한 장소라면, 마이페이지에서 그 장소에 맞춘 체크리스트를 이어서 쓸 수 있어요.</p>
                    <button type="button" onClick={() => navigate("/mypage")} className="shrink-0 px-4 py-2.5 bg-white text-[#4E5968] border border-[#E5E8EB] rounded-xl text-[12.5px] font-black active:scale-95 transition-transform whitespace-nowrap">마이페이지</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        {/* 답사 기록용이 아니라 "STAYON에 등록된 정보와 실제가 다른 경우" 제보용 사진이다.
            장소 제공자가 정보를 방치해도 방문자를 통해 걸러낼 수 있게 하려는 목적이라,
            매번 눈에 띄면 부담스러우니 기본은 접어두고, 등록된 장소를 답사할 때만 보여준다. */}
        {user && venueId && (
          <div className="bg-white rounded-3xl shadow-sm border border-[#E5E8EB]/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setPhotoSectionOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5 active:bg-[#FAFAFB] transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0 text-left">
                <span className="w-9 h-9 rounded-xl bg-[#FFF8E8] text-[#F2994A] flex items-center justify-center shrink-0">
                  <Gift className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-black text-[#191F28]">스테이온 사진과 실제가 다른가요?</span>
                  <span className="block text-[12.5px] font-bold text-[#8B95A1] break-keep mt-0.5">촬영해서 올려주시면 확인 후 100% 커피쿠폰을 드려요</span>
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-[#ADB5BD] shrink-0 transition-transform ${photoSectionOpen ? "rotate-180" : ""}`} />
            </button>
            {photoSectionOpen && (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t border-[#F2F4F6] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold text-[#8B95A1]">{photos.length}장 제보함</span>
                  {uploadingPhoto && <span className="text-[11px] font-bold text-[#ADB5BD]">업로드 중...</span>}
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  <label className="aspect-square bg-[#F9FAFB] border-2 border-dashed border-[#E5E8EB] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#ADB5BD] active:bg-[#F2F4F6] transition-all cursor-pointer">
                    <Camera className="w-5 h-5" />
                    <span className="text-[11.5px] font-bold">사진 추가</span>
                    <input type="file" onChange={handlePhotoUpload} multiple accept="image/*" className="hidden" />
                  </label>
                  {photos.map((url) => (
                    <div key={url} className="relative aspect-square group">
                      <img src={url} className="w-full h-full object-cover rounded-2xl" alt="" />
                      <button type="button" onClick={() => removePhoto(url)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#191F28] text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PC에서는 탭이 위에 가로로 있고 그 아래 내용이 따라오는 구조 대신, 탭을 왼쪽
            세로 사이드바로 두고 오른쪽에서 선택한 탭 내용만 바뀌는 구조가 낫다는 피드백.
            모바일은 세로 사이드바가 안 맞아서 기존 3열 그리드 탭을 그대로 쓴다. */}
        <div className="lg:flex lg:gap-4 lg:items-start">
          {/* 섹션을 아코디언이 아니라 탭으로 전환한다. 한 줄 가로 스크롤(답답함)도,
              4열 grid 위 알약 트랙(선택 안 된 탭이 배경 없이 텍스트만 떠 있어서 버튼처럼
              안 보이고, 9개라 마지막 줄에 1개만 남아 어색함)도 둘 다 별로였다. 9개가 정확히
              3x3으로 꽉 차는 3열 그리드로 바꾸고, 선택 안 된 탭도 흰 배경 + 테두리를 줘서
              각각 독립된 버튼처럼 보이게 했다. 칸 위치가 바뀌는 2차원 그리드라 토스식으로
              배경이 슬라이드하면 대각선으로 튀어 보여서, 대신 선택 시 색이 바로 바뀌는
              토글 버튼 그룹 방식으로 바꿨다. */}
          <div className="grid grid-cols-3 gap-2 mb-3 lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:mb-0">
            {visibleSections.map((section, idx) => (
              <button
                key={section.title}
                type="button"
                onClick={() => setActiveSectionIndex(idx)}
                className={`px-2 py-3 rounded-2xl text-[14px] lg:text-[12.5px] font-black whitespace-nowrap transition-all active:scale-[0.97] lg:w-full ${
                  activeSectionIndex === idx
                    ? "bg-[#3182F6] text-white shadow-[0_6px_16px_rgba(49,130,246,0.3)]"
                    : "bg-white text-[#4E5968] lg:text-[#8B95A1] border border-[#E5E8EB]"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          <div className="lg:flex-1 lg:min-w-0">
          {/* 진행률은 원래 제목 카드 안에 있었는데, 그것 때문에 제목 카드가 옆 로그인 이미지보다
              높아져서 높이가 안 맞았다 - 체크리스트 바로 위로 옮겼다. */}
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="text-[12.5px] font-black text-[#3182F6]">{checkedCount}/{totalChecklistItems} 체크 완료</span>
            <div className="w-28 h-1.5 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-[#3182F6] rounded-full transition-all" style={{ width: `${(checkedCount / totalChecklistItems) * 100}%` }} />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeSectionIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <div className="bg-white rounded-3xl border border-[#E5E8EB]/60 shadow-sm divide-y divide-[#F2F4F6] overflow-hidden">
                {visibleSections[activeSectionIndex].items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    checked={!!checked[item.id]}
                    note={notes[item.id] || ""}
                    editable={!!user}
                    onToggle={handleToggle}
                    onNoteChange={(iid, v) => setNotes((prev) => ({ ...prev, [iid]: v }))}
                    onNoteBlur={handleNoteBlur}
                  />
                ))}
              </div>

              {/* 체크인/체크아웃은 거의 항상 기본값(15시/11시)과 동일해서 매번 체크하게
                  하는 대신 기본값을 바로 보여주고, 실제로 다를 때만 시간을 입력하게 한다. */}
              {visibleSections[activeSectionIndex].title === "예약·연락" && (
                <div className="bg-white rounded-3xl border border-[#E5E8EB]/60 shadow-sm p-4 mt-3">
                  <p className="text-[13px] font-bold text-[#6B7684] mb-1">체크인 / 체크아웃</p>
                  <p className="text-[13.5px] font-bold text-[#191F28] mb-3">기본: 체크인 오후 3시 이후 · 체크아웃 오전 11시</p>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={handleCheckinToggle}
                      className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90 ${checkinOverride.enabled ? "bg-[#3182F6] border-[#3182F6]" : "border-[#D1D6DB]"}`}
                    >
                      {checkinOverride.enabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13.5px] font-bold transition-colors ${checkinOverride.enabled ? "text-[#191F28]" : "text-[#ADB5BD]"}`}>체크인·체크아웃 시간을 변경해야 하나요?</p>
                      {checkinOverride.enabled && (
                        <div className="grid grid-cols-2 gap-2 mt-2.5">
                          <div>
                            <label className="block text-[12px] font-bold text-[#6B7684] mb-1">체크인</label>
                            <div className="relative">
                              <select
                                value={checkinOverride.checkIn}
                                onChange={(e) => handleCheckinTimeChange("checkIn", e.target.value)}
                                className="w-full h-10 bg-[#F9FAFB] rounded-lg pl-3 pr-8 text-[13px] font-bold outline-none border border-transparent focus:border-[#3182F6] transition-all appearance-none"
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-[#ADB5BD] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[12px] font-bold text-[#6B7684] mb-1">체크아웃</label>
                            <div className="relative">
                              <select
                                value={checkinOverride.checkOut}
                                onChange={(e) => handleCheckinTimeChange("checkOut", e.target.value)}
                                className="w-full h-10 bg-[#F9FAFB] rounded-lg pl-3 pr-8 text-[13px] font-bold outline-none border border-transparent focus:border-[#3182F6] transition-all appearance-none"
                              >
                                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-[#ADB5BD] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {visibleSections[activeSectionIndex].title === "비용" && (
                <div className="bg-[#F9FAFB] rounded-2xl px-4 py-3.5 mt-3">
                  <p className="text-[12.5px] font-bold text-[#8B95A1] leading-relaxed">최종 계약금과 잔금 납부일은 스테이온에서 처리해주세요. 절차 문의는 1:1 문의하기 또는 고객센터로 문의해주세요.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {user && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-[#E5E8EB]/60 space-y-4">
            <div>
              <p className="text-[14px] font-black text-[#191F28]">종합 평가</p>
              <p className="text-[12.5px] font-bold text-[#8B95A1] break-keep mt-0.5">전부 선택 입력이에요. 비워두셔도 저장에는 문제없어요.</p>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">별점 (선택)</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => handleRatingChange(evaluation.rating === n ? null : n)} className="p-0.5 active:scale-90 transition-transform">
                    <Star className={`w-7 h-7 ${evaluation.rating && n <= evaluation.rating ? "fill-[#FFC53D] text-[#FFC53D]" : "text-[#E5E8EB]"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">장점 (선택)</label>
              <textarea
                value={evaluation.pros}
                onChange={(e) => setEvaluation((prev) => ({ ...prev, pros: e.target.value }))}
                onBlur={(e) => handleEvalTextBlur("pros", e.target.value)}
                className="w-full min-h-[70px] bg-[#F9FAFB] rounded-[14px] p-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">단점 (선택)</label>
              <textarea
                value={evaluation.cons}
                onChange={(e) => setEvaluation((prev) => ({ ...prev, cons: e.target.value }))}
                onBlur={(e) => handleEvalTextBlur("cons", e.target.value)}
                className="w-full min-h-[70px] bg-[#F9FAFB] rounded-[14px] p-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">메모 (선택)</label>
              <textarea
                value={evaluation.memo}
                onChange={(e) => setEvaluation((prev) => ({ ...prev, memo: e.target.value }))}
                onBlur={(e) => handleEvalTextBlur("memo", e.target.value)}
                className="w-full min-h-[70px] bg-[#F9FAFB] rounded-[14px] p-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all resize-none"
              />
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>

      {savedPulse && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#191F28] text-white px-5 py-2.5 rounded-full text-[12.5px] font-bold shadow-lg z-50">
          저장됨
        </div>
      )}

      {suggestSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#F2994A] text-white px-5 py-2.5 rounded-full text-[12.5px] font-bold shadow-lg z-50">
          추천이 접수되었습니다! 확인 후 등록을 검토할게요.
        </div>
      )}

      <AnimatePresence>
        {nameModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center"
            onClick={() => closeNameModal(null)}
          >
            <motion.form
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                if (nameDraft.trim()) closeNameModal(nameDraft.trim());
              }}
              className="bg-white w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 pb-8"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[17px] font-black text-[#191F28]">어느 장소 답사인가요?</h3>
                <button type="button" onClick={() => closeNameModal(null)} className="p-1.5 -mr-1.5 text-[#ADB5BD] active:scale-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[12.5px] font-bold text-[#8B95A1] mb-5 leading-relaxed break-keep">장소 이름을 적어주시면 체크한 내용이 바로 저장돼요. 나중에 어떤 장소였는지 찾기도 쉬워요.</p>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="예: 은혜수양관"
                autoFocus
                className="w-full h-12 bg-[#F9FAFB] rounded-[14px] px-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all"
              />
              <button
                type="submit"
                disabled={!nameDraft.trim()}
                className="mt-5 w-full h-14 bg-[#3182F6] text-white rounded-[16px] font-black text-[15px] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                저장하고 계속하기
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {suggestModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60] flex items-end sm:items-center justify-center"
            onClick={handleSuggestClose}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 pb-8"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[17px] font-black text-[#191F28]">장소 추천하기</h3>
                <button type="button" onClick={handleSuggestClose} className="p-1.5 -mr-1.5 text-[#ADB5BD] active:scale-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[12.5px] font-bold text-[#8B95A1] mb-5 leading-relaxed">답사하신 장소 정보를 알려주시면 스테이온이 확인 후 등록을 검토할게요. 로그인 없이도 보낼 수 있어요.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">장소 이름</label>
                  <input
                    type="text"
                    value={suggestVenueName}
                    onChange={(e) => setSuggestVenueName(e.target.value)}
                    placeholder="예: 은혜수양관"
                    autoFocus
                    className="w-full h-12 bg-[#F9FAFB] rounded-[14px] px-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#F2994A] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">연락처</label>
                  <input
                    type="tel"
                    value={suggestContact}
                    onChange={(e) => setSuggestContact(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full h-12 bg-[#F9FAFB] rounded-[14px] px-4 font-bold text-[14px] outline-none border-2 border-transparent focus:border-[#F2994A] transition-all"
                  />
                  <p className="mt-1 text-[12px] font-medium text-[#8B95A1] break-keep">등록이 성사되면 커피쿠폰을 보내드리려고 여쭤봐요.</p>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#6B7684] mb-1.5">위치 (주소) <span className="text-[#C2C8CE] font-medium">· 선택</span></label>
                  <div
                    onClick={handleSuggestAddressSearch}
                    className="w-full h-12 bg-[#F9FAFB] rounded-[14px] px-4 flex items-center gap-2 cursor-pointer active:bg-[#F2F4F6] transition-all"
                  >
                    <MapPin className="w-4 h-4 text-[#F2994A] shrink-0" />
                    <span className={`text-[14px] font-bold truncate ${suggestLocation ? "text-[#191F28]" : "text-[#C2C8CE]"}`}>{suggestLocation || "주소 검색하기"}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSuggestSubmit}
                disabled={suggestSubmitting || !suggestVenueName.trim() || !suggestContact.trim()}
                className="mt-5 w-full h-14 bg-[#F2994A] text-white rounded-[16px] font-black text-[15px] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {suggestSubmitting ? "제출 중..." : "추천하기"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
