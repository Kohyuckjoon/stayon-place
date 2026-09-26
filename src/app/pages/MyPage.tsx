import { Header } from "../components/Header";
import {
  Calendar, MapPin, CheckCircle2, Clock, ChevronRight, Heart, Wallet, ArrowRight,
  Users, LogOut, Settings, AlertTriangle, PlusCircle, UserCircle, MessageCircle, FileText, History as HistoryIcon, Building2, CreditCard, Check, Phone, MapPinned, Sparkles,
  Pencil, ClipboardList, Tent,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollRestoration, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { logOut, loginWithGoogle } from "../lib/auth";
import { db, functions } from "../lib/firebase"; 
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { MyShirtsManagerTab } from "../components/MyShirtsManagerTab";
import { MyGoodsManagerTab } from "../components/MyGoodsManagerTab";
import { MyVehicleFleetManagerTab } from "../components/MyVehicleFleetManagerTab";
import { MyVenueCoreManagerTab } from "../components/MyVenueCoreManagerTab";
import { httpsCallable } from "firebase/functions";

// "OO 관리자" 탭들(장소/티셔츠/굿즈/차량)이 공통으로 쓰는 구독 로직 - 본인이 직접
// 등록한(applicantUid) 리스팅뿐 아니라, 관리자가 /admin에서 managerEmails 배열에
// 추가해준 이메일로 로그인한 경우에도 같은 리스팅이 보이도록 두 쿼리를 각각 구독해서
// 합친다. managerEmails array-contains 쿼리에 status 필터까지 같이 걸면 새 복합
// 색인이 필요해지는데, 이 프로젝트는 firestore.indexes.json으로 색인을 관리하지 않고
// 있어서 status 필터는 받아온 뒤 이쪽에서 걸러낸다.
function subscribeMyListings(
  collectionName: string,
  uid: string,
  email: string | null | undefined,
  onChange: (docs: any[]) => void
) {
  let ownedDocs: any[] = [];
  let managedDocs: any[] = [];
  const emit = () => {
    const map = new Map<string, any>();
    [...ownedDocs, ...managedDocs].forEach((d) => map.set(d.id, d));
    onChange(Array.from(map.values()));
  };

  const ownedQuery = query(
    collection(db, collectionName),
    where("applicantUid", "==", uid),
    where("status", "==", "approved")
  );
  const unsubOwned = onSnapshot(ownedQuery, (snapshot) => {
    ownedDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
  }, (error) => {
    console.error(`${collectionName} 소유 리스팅 조회 에러:`, error);
  });

  let unsubManaged = () => {};
  if (email) {
    const managedQuery = query(collection(db, collectionName), where("managerEmails", "array-contains", email));
    unsubManaged = onSnapshot(managedQuery, (snapshot) => {
      managedDocs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.status === "approved");
      emit();
    }, (error) => {
      console.error(`${collectionName} 매니저 위임 리스팅 조회 에러:`, error);
    });
  }

  return () => {
    unsubOwned();
    unsubManaged();
  };
}

// 상태 배지 컴포넌트 (Toss Style)
const StatusBadge = ({ status }: any) => {
  const getStatusUI = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "답사 확인 중", color: "text-[#F9BA17] bg-[#FFF8E6]" };
      case "confirmed":
        return { text: "답사 가능", color: "text-[#3182F6] bg-[#E8F3FF]" };
      case "inspection_confirmed":
        return { text: "답사 확정", color: "text-[#3182F6] bg-[#E8F3FF]" };
      case "approved":
        return { text: "장소 결정 완료", color: "text-[#191F28] bg-[#E5E8EB]" };
      case "deposit_paid":
        return { text: "예약 확정", color: "text-[#00D082] bg-[#E6F9F2]" };
      case "rejected":
        return { text: "답사 불가", color: "text-[#F04452] bg-[#FEECEE]" };
      case "completed":
        return { text: "이용 완료", color: "text-[#8B95A1] bg-[#F2F4F6]" };
      default:
        return { text: "대기 중", color: "text-[#8B95A1] bg-[#F2F4F6]" };
    }
  };

  const ui = getStatusUI(status);
  return (
    <div className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-tight shrink-0 ${ui.color}`}>
      {ui.text}
    </div>
  );
};

// "YYYY-MM-DD" → "YYYY.MM.DD" (모바일 요약 카드에서 더 짧고 읽기 편하게)
const formatDotDate = (dateStr?: string) => (dateStr ? dateStr.replaceAll("-", ".") : "");
// 종료일은 월.일만 짧게 (예: "2025.08.15 ~ 08.17")
const formatDotDateShort = (dateStr?: string) => (dateStr ? dateStr.slice(5).replace("-", ".") : "");

export function MyPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"activity" | "myVenues" | "myShirts" | "myGoods" | "myVehicles">("activity");
  const bookingListRef = useRef<HTMLDivElement>(null);

  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);
  const [myShirts, setMyShirts] = useState<any[]>([]); // 승인된 내 단체티 업체들 (있으면 "티셔츠 관리자" 탭 노출, 여러 개 가능)
  const [myGoodsList, setMyGoodsList] = useState<any[]>([]); // 승인된 내 굿즈 업체들 (있으면 "굿즈 관리자" 탭 노출, 여러 개 가능)
  const [myVehicles, setMyVehicles] = useState<any[]>([]); // 승인된 내 차량 렌트 업체들 (있으면 "차량 관리자" 탭 노출, 여러 개 가능)
  const [selectedShirtId, setSelectedShirtId] = useState<string | null>(null);
  const [selectedGoodsId, setSelectedGoodsId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // [기능] 1단계: 답사 확정 (상세 정보 공개)
  // const handleConfirmInspection = async (bookingId: string) => {
  //   if (!window.confirm("이 장소로 답사를 확정하시겠습니까?\n확정 시 담당자 연락처와 상세 주소를 확인하실 수 있습니다.")) return;
  //   try {
  //     const bookingRef = doc(db, "bookings", bookingId);
  //     await updateDoc(bookingRef, { status: "inspection_confirmed" });
  //     alert("답사 신청이 확정되었습니다. 상세 정보를 확인해주세요.");
  //   } catch (error) {
  //     console.error("Error updating status:", error);
  //     alert("상태 변경 중 오류가 발생했습니다.");
  //   }
  // };

  // [기능] 1단계: 사용자가 답사 확정 버튼 클릭 시
  const handleConfirmInspection = async (booking: any) => {
    // 1. 예약 데이터 확인 (방어 코드)
    if (!booking || !booking.id) {
      alert("예약 정보가 올바르지 않습니다.");
      return;
    }

    const message = "이 장소로 답사를 확정하시겠습니까?\n확정 시 담당자 연락처와 상세 주소를 확인하실 수 있습니다.";
    if (!window.confirm(message)) return;

    try {
      const bookingRef = doc(db, "bookings", booking.id);

      // 2. 파이어베이스 상태 업데이트
      await updateDoc(bookingRef, { status: "inspection_confirmed" });

      // ================= [🔥 여기부터 교체되었습니다] =================
      // 3. Firebase Functions를 통해 백엔드 알림 함수 호출 (에러 해결)
      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

      await triggerAdminNotification({
        type: 'CONFIRM',
        payload: {
          venueName: booking.venueName || "알 수 없는 장소",
          userName: `${user?.displayName || '사용자'} (${user?.email || '이메일 없음'})`
        }
      });
      // ==========================================================

      alert("답사 신청이 확정되었습니다. 상세 정보를 확인해주세요.");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };
  // [신규 기능] 2단계: 답사 후 장소 최종 결정 (approved 상태로 변경)
  // const handleFinalPlaceConfirm = (bookingId: string) => {
  //   // 1. 상태 업데이트(updateDoc) 로직을 아예 삭제합니다.
  //   // 2. 사용자가 확인을 누르면 바로 결제 페이지로 랜딩시킵니다.

  //   const message = "답사를 다녀오셨나요?\n이 장소로 최종 결정하시겠습니까?\n\n확인을 누르시면 장소 예약금 결제 페이지로 이동합니다.";

  //   if (window.confirm(message)) {
  //     // DB 업데이트 없이 바로 결제 화면으로 이동
  //     navigate(`/payment-setup/${bookingId}`);
  //   }
  // };

  const handleFinalPlaceConfirm = async (booking: any) => {
    if (!booking || !booking.id) {
      alert("예약 정보가 올바르지 않습니다.");
      return;
    }

    const message = "답사를 다녀오셨나요?\n이 장소로 최종 결정하시겠습니까?\n\n확인을 누르시면 장소 예약금 결제 페이지로 이동합니다.";

    if (window.confirm(message)) {
      try {
        // 결제 페이지 이동 전 관리자에게 알림 발송
        // await sendSlackNotification('FINAL_DECISION', {
        //   venueName: booking.venueName || "알 수 없는 장소",
        //   userName: `${user?.displayName || '사용자'} (${user?.email || '이메일 없음'})`
        // });

        // 결제 화면으로 이동
        navigate(`/payment-setup/${booking.id}`);
      } catch (error) {
        console.error("Slack notification error:", error);
        // 알림 실패와 상관없이 결제 페이지로는 이동시킵니다.
        navigate(`/payment-setup/${booking.id}`);
      }
    }
  };

  // 승인된 내 장소만 "장소 관리자" 탭에서 자기 관리 대상으로 노출한다 (티셔츠/굿즈/차량과
  // 동일한 규칙). applicantUid로 등록한 것뿐 아니라, 관리자가 managerEmails에 추가해준
  // 계정으로 로그인한 경우도 같이 뜬다 (subscribeMyListings 참고). 로그인 필수화 이전에
  // 등록되어 applicantUid도 없고 managerEmails도 아직 안 채워진 장소는 여전히 여기 안
  // 뜨므로, 그런 기존 장소는 관리자가 /admin에서 매니저 계정을 지정해줘야 한다.
  useEffect(() => {
    if (!user) return;
    return subscribeMyListings("venues", user.uid, user.email, setMyVenues);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("email", "==", user.email || ""),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookingDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const combinedBookings = await Promise.all(
        bookingDocs.map(async (booking: any) => {
          if (booking.venueId) {
            try {
              const venueDoc = await getDoc(doc(db, "venues", booking.venueId));
              if (venueDoc.exists()) {
                const venueData = venueDoc.data();
                return {
                  ...booking,
                  location: venueData.location || venueData.addressDetail,
                  pastorContact: venueData.applicantContact || venueData.contact,
                };
              }
            } catch (err) {
              console.error("Venue fetch error:", err);
            }
          }
          return booking;
        })
      );

      setMyBookings(combinedBookings);
    }, (error) => {
      console.error("Bookings 리스너 에러:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyListings("groupShirts", user.uid, user.email, setMyShirts);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyListings("goodsStore", user.uid, user.email, setMyGoodsList);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeMyListings("vehicleRentals", user.uid, user.email, setMyVehicles);
  }, [user]);

  useEffect(() => {
    const loadFavorites = () => {
      const storageKey = user ? "stayon_planner_member" : "stayon_planner_guest";
      const saved = localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey);
      if (saved) setMyFavorites(JSON.parse(saved));
    };
    loadFavorites();
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#333D4B]">
        <main className="max-w-md mx-auto px-6 pt-24 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[40px] shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center mb-8 mx-auto">
              <UserCircle className="w-9 h-9 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-[#191F28] mb-4 leading-tight">로그인하고<br />편하게 관리해보세요</h2>
            <button onClick={loginWithGoogle} className="w-full h-14 bg-white text-[#3c4043] rounded-[18px] font-bold text-[16px] shadow-sm border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
              구글로 계속하기
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#333D4B]">
      <ScrollRestoration />
      <main className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-12">

        {/* ===== 모바일 전용: 앱 느낌의 요약 화면 (요청하신 목업 스타일) ===== */}
        <div className="md:hidden space-y-3 mb-6">
          <div className="flex items-center justify-between px-1 mb-1">
            <h1 className="text-[17px] font-black text-[#191F28]">내 정보</h1>
            <button onClick={() => navigate("/settings/profile")} className="p-2 -mr-2 text-[#8B95A1] active:scale-90 transition-transform">
              <Pencil className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm p-4 flex items-center gap-3.5">
            {user.photoURL ? (
              <img src={user.photoURL} alt="프로필" className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-gray-50" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#3182F6] flex items-center justify-center text-white font-black text-[20px] shrink-0">
                {user.displayName?.[0] || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-black text-[#191F28] truncate">{user.displayName}님</h2>
              <p className="text-[#8B95A1] font-bold text-[12px] truncate">{user.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black">일반 멤버</span>
            </div>
          </div>

          <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm flex divide-x divide-gray-100 overflow-hidden">
            {[
              { label: "총 예약", value: `${myBookings.length}건` },
              { label: "다녀온 장소", value: `${myBookings.filter(b => b.status === 'approved' || b.status === 'deposit_paid').length}곳` },
              { label: "저장한 장소", value: `${myFavorites.length}곳`, onClick: () => navigate('/planner') },
            ].map((stat, i) => (
              <div key={i} onClick={stat.onClick} className={`flex-1 py-3.5 text-center ${stat.onClick ? "cursor-pointer active:bg-gray-50" : ""}`}>
                <p className="text-[17px] font-black text-[#3182F6] leading-tight">{stat.value}</p>
                <p className="text-[11px] font-bold text-[#8B95A1] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {myBookings.length > 0 && (
            <div className="pt-2">
              <h3 className="text-[14px] font-black text-[#191F28] px-1 mb-2">최근 예약</h3>
              <div className="space-y-2.5">
                {myBookings.slice(0, 2).map((booking) => (
                  <div key={booking.id} className="bg-white rounded-[18px] border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-[15px] font-black text-[#191F28] truncate">{booking.venueName || "장소명 없음"}</h4>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center gap-3 text-[12px] font-bold text-[#8B95A1] mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 shrink-0" />
                        {formatDotDate(booking.startDate)}{booking.endDate ? ` ~ ${formatDotDateShort(booking.endDate)}` : ""}
                      </span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 shrink-0" />{booking.headcount || 0}명</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] font-bold text-[#ADB5BD]">결제금액</p>
                        <p className="text-[16px] font-black text-[#191F28]">{Number(booking.totalPrice || booking.depositPrice || 0).toLocaleString()}원</p>
                      </div>
                      <button
                        onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }}
                        className="px-3.5 py-2 bg-[#F2F8FF] text-[#3182F6] rounded-full text-[12px] font-black active:scale-95 transition-transform"
                      >
                        예약 상세
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[18px] border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            <button
              onClick={() => { setActiveTab("activity"); bookingListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 bg-[#F2F8FF] rounded-xl flex items-center justify-center shrink-0"><ClipboardList className="w-4 h-4 text-[#3182F6]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-[#191F28]">내 예약 내역</p>
                <p className="text-[12px] font-bold text-[#ADB5BD]">{myBookings.length}건의 예약</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#D1D6DB] shrink-0" />
            </button>
            <button
              onClick={() => { setActiveTab("activity"); bookingListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 bg-[#F2FDF5] rounded-xl flex items-center justify-center shrink-0"><Tent className="w-4 h-4 text-[#2DCA72]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-[#191F28]">사전답사 내역</p>
                <p className="text-[12px] font-bold text-[#ADB5BD]">
                  {myBookings.filter(b => b.type === 'inspection').length}건
                  {myBookings.filter(b => b.type === 'inspection' && (b.status === 'pending' || b.status === 'confirmed')).length > 0 ? " 검토 중" : ""}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#D1D6DB] shrink-0" />
            </button>
          </div>
        </div>

        {/* ===== 데스크톱 전용: 기존 레이아웃 그대로 ===== */}
        <section className="hidden md:flex bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 mb-10 md:flex-row items-center justify-between gap-6">
          <div className="flex flex-row items-center gap-6 text-left">
            <img src={user.photoURL || ""} alt="p" className="w-20 h-20 rounded-[30px] object-cover border-4 border-gray-50" />
            <div>
              <div className="flex items-center justify-start gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-black text-[#191F28]">{user.displayName}님</h1>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black">일반 멤버</span>
              </div>
              <p className="text-[#8B95A1] font-bold text-[15px] break-all">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3 w-auto">
            <button onClick={() => navigate("/settings/profile")} className="px-5 py-3.5 bg-[#F2F4F6] rounded-xl text-[14px] font-black text-[#4E5968] hover:bg-[#E5E8EB] transition-all flex items-center gap-2">
              <Settings className="w-4 h-4 shrink-0" /> 정보 수정
            </button>
            <button onClick={async () => { await logOut(); navigate("/"); }} className="px-5 py-3 bg-[#F04452] text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all flex items-center gap-2">
              <LogOut className="w-4 h-4 shrink-0" /> 로그아웃
            </button>
          </div>
        </section>

        <div className="hidden md:grid grid-cols-3 gap-6 mb-10">
          {[
            { label: "답사 완료 리스트", value: `${myBookings.filter(b => b.status === 'approved' || b.status === 'deposit_paid').length}건`, icon: FileText, color: "text-[#3182F6]" },
            { label: "찜한 장소", value: `${myFavorites.length}개`, icon: Heart, color: "text-[#F04452]", onClick: () => navigate('/planner') },
            { label: "전체 내역", value: `${myBookings.length}건`, icon: HistoryIcon, color: "text-[#8B95A1]" },
          ].map((stat, i) => (
            <div key={i} onClick={stat.onClick} className="bg-white p-7 rounded-[32px] shadow-sm border border-transparent hover:border-gray-100 transition-all cursor-pointer group flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#8B95A1] mb-0.5">{stat.label}</p>
                <p className="text-[20px] font-black text-[#191F28]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div ref={bookingListRef} className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-5 md:mb-10 scroll-mt-4">
          {/* 최대 5개(내 활동 + 장소/티셔츠/굿즈/차량 관리자)까지 뜰 수 있는데, 줄바꿈도
              가로 스크롤도 없이 flex로만 나열돼 있어서 모바일 좁은 화면에서 다 같이 뜨면
              글자가 찌그러지듯 좁아졌다. shrink-0 + whitespace-nowrap으로 찌그러짐 자체를
              막고, 대신 안 들어가는 만큼은 가로 스크롤되게(모바일은 스와이프로 자연스럽게) */}
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-50 px-4 md:px-8 bg-[#F9FAFB]">
            {[
              { id: "activity", label: "내 활동" },
              { id: "myVenues", label: "장소 관리자" },
              ...(myShirts.length > 0 ? [{ id: "myShirts", label: "티셔츠 관리자" }] : []),
              ...(myGoodsList.length > 0 ? [{ id: "myGoods", label: "굿즈 관리자" }] : []),
              ...(myVehicles.length > 0 ? [{ id: "myVehicles", label: "차량 관리자" }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative shrink-0 whitespace-nowrap py-3.5 px-2.5 md:py-6 md:px-4 text-[13px] md:text-[17px] font-bold transition-all ${activeTab === tab.id ? "text-[#191F28]" : "text-[#ADB5BD] hover:text-[#8B95A1]"}`}
              >
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3182F6] rounded-t-full" />}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-10">
            <AnimatePresence mode="wait">
              {activeTab === "activity" ? (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 md:space-y-12">
                  <div>
                    <h3 className="text-[16px] md:text-xl font-black text-[#191F28] mb-4 md:mb-8 px-1 md:px-2">예약 및 결제 현황</h3>
                    <div className="space-y-4 md:space-y-6">
                      {myBookings.length > 0 ? myBookings.map((booking) => (
                        <div key={booking.id} className="bg-[#F9FAFB] rounded-[22px] md:rounded-[32px] border border-gray-100 p-4 md:p-8 hover:bg-white hover:shadow-xl transition-all group overflow-hidden">
                          <div className="flex flex-col lg:flex-row justify-between gap-5 md:gap-8">

                            <div className="flex-1 cursor-pointer" onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }}>
                              {/* DATE 박스는 이 첫 줄(상태뱃지+제목)에만 붙는 거고, 아래 상세정보 박스는
                                  DATE 박스 폭만큼 밀릴 이유가 없어서 이 줄 밖으로 빼서 카드 전체 폭을 쓰게 했다. */}
                              <div className="flex gap-3 md:gap-6 items-start">
                                <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-[16px] md:rounded-[24px] border border-gray-100 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-[#3182F6] transition-colors">
                                  <span className="text-[9px] md:text-[11px] font-black text-[#3182F6] group-hover:text-white/80 uppercase">Date</span>
                                  <span className="text-[17px] md:text-2xl font-black text-[#191F28] group-hover:text-white leading-none mt-1">
                                    {booking.startDate ? booking.startDate.split('-')[2] : '??'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge status={booking.status} />
                                    <span className="text-[12px] md:text-sm font-bold text-[#8B95A1]">{booking.startDate}</span>
                                  </div>
                                  <h4 className="text-[17px] md:text-[22px] font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-tight break-keep">
                                    {booking.venueName || "장소명 없음"}
                                  </h4>
                                </div>
                              </div>

                              {(booking.status === 'inspection_confirmed' || booking.status === 'approved' || booking.status === 'deposit_paid') && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="w-full mt-3 md:mt-4 p-3.5 md:p-5 bg-white border border-blue-100 rounded-xl md:rounded-2xl space-y-2.5 md:space-y-3"
                                >
                                  <div className="w-full min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <MapPinned className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                                      <span className="text-[9px] md:text-[10px] font-black text-[#ADB5BD] uppercase tracking-tighter">상세 주소</span>
                                    </div>
                                    <p className="text-[13.5px] md:text-[14px] font-bold text-[#4E5968] break-keep leading-relaxed">{booking.location || "상세 주소 정보를 불러올 수 없습니다."}</p>
                                  </div>
                                  <div className="w-full min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Phone className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                                      <span className="text-[9px] md:text-[10px] font-black text-[#ADB5BD] uppercase tracking-tighter">담당자 연락처</span>
                                    </div>
                                    <p className="text-[13px] md:text-[14px] font-bold text-[#4E5968]">{booking.pastorContact || "확정 후 담당자가 연락드릴 예정입니다."}</p>
                                  </div>
                                </motion.div>
                              )}

                              <div className="flex items-center gap-3 md:gap-4 text-[#6B7684] text-[12px] md:text-sm font-semibold pt-2 md:pt-3 flex-wrap">
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 md:w-4 md:h-4" /> {booking.headcount || 0}명</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 md:w-4 md:h-4" /> {booking.type === 'inspection' ? '사전 답사' : '본 행사'}</span>
                              </div>
                            </div>

                            <div className="lg:w-80 w-full flex flex-col justify-center">
                              {/* 1단계: 관리자 승인 후 (confirmed) */}
                              {booking.status === 'confirmed' && (
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-3 md:gap-4 mt-3 lg:mt-0">
                                  <p className="text-[13px] text-[#4E5968] font-bold leading-relaxed break-keep">
                                    관리자가 답사를 승인했습니다. 답사를 확정하고 상세 주소를 확인하세요.
                                  </p>
                                  <button
                                    // 이 부분! booking.id 가 아니라 booking 객체 통째로 전달
                                    onClick={() => handleConfirmInspection(booking)}
                                    className="w-full py-3.5 md:py-4 bg-[#3182F6] text-white rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px] md:text-[15px] shadow-lg shadow-blue-100"
                                  >
                                    <Check className="w-5 h-5" /> 답사 확정하기
                                  </button>
                                </div>
                              )}

                              {/* 2단계: 사용자가 답사 확정 후 (inspection_confirmed) */}
                              {booking.status === 'inspection_confirmed' && (
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3 md:gap-4 mt-3 lg:mt-0">
                                  <div className="flex items-center gap-2 text-[#3182F6] mb-1">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-[13px] font-black">답사를 다녀오셨나요?</span>
                                  </div>
                                  <p className="text-[12px] text-[#8B95A1] font-medium leading-relaxed break-keep">
                                    장소가 마음에 드신다면 <strong>최종 확정</strong>을 눌러주세요. 결제 후 일정이 점유됩니다.
                                  </p>
                                  <button
                                    onClick={() => handleFinalPlaceConfirm(booking)} // bookingId 대신 booking 객체 전달
                                    className="w-full py-3.5 md:py-4 bg-[#191F28] text-white rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[14px] md:text-[15px] shadow-lg"
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-blue-400" /> 장소 최종 확정하기
                                  </button>
                                </div>
                              )}

                              {/* 3단계: 장소 최종 결정 후 결제 대기 (approved) */}
                              {booking.status === 'approved' && (
                                <div className="bg-white p-4 md:p-6 rounded-2xl border border-blue-200 shadow-lg flex flex-col gap-3 md:gap-4 mt-3 lg:mt-0">
                                  <div className="flex justify-between items-center flex-wrap gap-1">
                                    <span className="text-[13px] font-black text-[#3182F6]">결제 대기 중</span>
                                    <span className="text-[11px] font-bold text-[#8B95A1]">D-Day 장소 예약금</span>
                                  </div>
                                  <p className="text-[12px] text-[#4E5968] font-bold break-keep">
                                    장소 예약 확정을 위해 장소 예약금을 결제해주세요. 결제 즉시 타 사용자의 예약이 차단됩니다.
                                  </p>
                                  <button
                                    onClick={() => navigate(`/payment-setup/${booking.id}`)}
                                    className="w-full py-3.5 md:py-4 bg-[#3182F6] text-white rounded-xl font-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-[14px] md:text-[15px]"
                                  >
                                    <CreditCard className="w-5 h-5" /> 장소 예약금 결제하기
                                  </button>
                                </div>
                              )}

                              {/* 4단계: 최종 예약 확정 (deposit_paid) */}
                              {booking.status === 'deposit_paid' && (
                                <div className="bg-[#E6F9F2] p-4 md:p-6 rounded-2xl border border-[#00D082]/20 flex flex-col gap-2.5 md:gap-3 mt-3 lg:mt-0">
                                  <div className="flex items-center gap-2 text-[#00D082]">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="text-[15px] md:text-[16px] font-black italic">Booking Secured</span>
                                  </div>
                                  <p className="text-[12px] text-[#4E5968] font-medium leading-relaxed break-keep">
                                    예약이 확정되었습니다! 잔금은 행사 종료 후 현장에서 결제해주세요.
                                  </p>
                                </div>
                              )}

                              {/* 위 4단계(confirmed/inspection_confirmed/approved/deposit_paid) 중 어디에도
                                  안 걸리는 나머지 상태 — "Status: pending" 같은 개발용 문구를 그대로 사용자에게
                                  보여주고 있던 걸 없애고, 반려(cancelled)는 따로 구분해서 안내한다. */}
                              {!['confirmed', 'inspection_confirmed', 'approved', 'deposit_paid'].includes(booking.status) && (
                                booking.status === 'cancelled' ? (
                                  <div className="h-full flex flex-col justify-center items-start lg:items-end px-1 lg:px-4 mt-3 lg:mt-0">
                                    <p className="text-[13px] md:text-sm font-black text-[#F04452] mb-1">신청이 반려됐어요</p>
                                    <p className="text-[12px] text-[#ADB5BD] text-left lg:text-right font-medium break-keep">다른 장소로 다시 신청해주세요.</p>
                                  </div>
                                ) : (
                                  <div className="h-full flex flex-col justify-center items-start lg:items-end px-1 lg:px-4 mt-3 lg:mt-0">
                                    <p className="text-[13px] md:text-sm font-black text-[#ADB5BD] mb-1">확인 중이에요</p>
                                    <p className="text-[12px] text-[#B0B8C1] text-left lg:text-right font-medium break-keep">관리자가 확인 후 답사 가능 여부를 안내해드릴게요.</p>
                                  </div>
                                )
                              )}
                            </div>

                          </div>
                        </div>
                      )) : (
                        <div className="py-14 md:py-20 text-center bg-white rounded-[22px] md:rounded-[32px] border border-dashed border-gray-200">
                          <p className="text-[#ADB5BD] font-bold text-[13px] md:text-base">아직 신청 내역이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 md:mb-8 px-1 md:px-2 pt-6 md:pt-10 border-t border-gray-100">
                      <h3 className="text-[16px] md:text-xl font-black text-[#191F28]">내가 즐겨찾기한 장소</h3>
                      <button onClick={() => navigate('/planner')} className="text-[13px] md:text-[14px] font-black text-[#3182F6] flex items-center gap-1 shrink-0">
                        플래너 보기 <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                      {myFavorites.length > 0 ? myFavorites.map(fav => (
                        <div key={fav.id} onClick={() => navigate(`/venue/${fav.id}`)} className="bg-white rounded-[22px] md:rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-pointer hover:shadow-xl transition-all">
                          <div className="h-36 md:h-44 overflow-hidden relative">
                            <img src={fav.images?.[0] || "https://images.unsplash.com/photo-1544427928-c49cdfebf194?q=80&w=500&auto=format&fit=crop"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="p-4 md:p-6">
                            <h4 className="font-black text-[15px] md:text-lg text-[#191F28] mb-1 truncate">{fav.venueName || fav.name}</h4>
                            <p className="text-[#8B95A1] font-bold text-[12px] md:text-sm flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 shrink-0" />{fav.location || "지역 정보 없음"}</p>
                          </div>
                        </div>
                      )) : (
                        <div onClick={() => navigate('/venues')} className="col-span-1 md:col-span-3 py-12 md:py-16 text-center bg-gray-50 rounded-[22px] md:rounded-[32px] border border-dashed border-gray-200 cursor-pointer">
                          <p className="text-[#ADB5BD] font-bold text-[13px] md:text-base">찜한 장소가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "myVenues" ? (
                <motion.div key="myVenues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 md:space-y-8">
                  <div className="bg-[#3182F6] p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4 md:gap-8 shadow-xl shadow-blue-100">
                    <div>
                      <h3 className="text-[19px] md:text-[26px] font-black mb-2 md:mb-3 text-white break-keep">남는 공간으로 수익을 창출하세요</h3>
                      <p className="text-white/80 font-bold text-[13px] md:text-[16px] leading-relaxed italic">건강한 기독교 공간 공유 문화</p>
                    </div>
                    <button onClick={() => navigate("/register")} className="w-full md:w-auto justify-center bg-white text-[#3182F6] px-5 py-3.5 md:px-8 md:py-5 rounded-[18px] md:rounded-[22px] font-black hover:scale-105 transition-all text-[14px] md:text-[16px] flex items-center gap-2 shadow-lg shrink-0">
                      <PlusCircle className="w-5 h-5 md:w-6 md:h-6" /> 새 장소 등록
                    </button>
                  </div>

                  <div className="space-y-6 pt-2 md:pt-6">
                    {myVenues.length > 0 ? (
                      <>
                        {myVenues.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {myVenues.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setSelectedVenueId(v.id)}
                                className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${(selectedVenueId || myVenues[0].id) === v.id ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]"}`}
                              >
                                {v.venueName}
                              </button>
                            ))}
                          </div>
                        )}
                        {(() => {
                          const current = myVenues.find((v) => v.id === selectedVenueId) || myVenues[0];
                          return current && <MyVenueCoreManagerTab key={current.id} venue={current} />;
                        })()}
                      </>
                    ) : (
                      <div className="py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                        <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-[#ADB5BD] font-bold">승인된 장소가 없어요.</p>
                        <p className="text-[#B0B8C1] font-bold text-[13px] mt-1.5">장소를 등록하고 관리자 승인을 받으면 여기서 직접 관리할 수 있어요.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === "myShirts" ? (
                <motion.div key="myShirts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {myShirts.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {myShirts.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedShirtId(s.id)}
                          className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${(selectedShirtId || myShirts[0].id) === s.id ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]"}`}
                        >
                          {s.businessName}
                        </button>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const current = myShirts.find((s) => s.id === selectedShirtId) || myShirts[0];
                    return current && <MyShirtsManagerTab key={current.id} shirt={current} />;
                  })()}
                </motion.div>
              ) : activeTab === "myGoods" ? (
                <motion.div key="myGoods" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {myGoodsList.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {myGoodsList.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGoodsId(g.id)}
                          className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${(selectedGoodsId || myGoodsList[0].id) === g.id ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]"}`}
                        >
                          {g.businessName}
                        </button>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const current = myGoodsList.find((g) => g.id === selectedGoodsId) || myGoodsList[0];
                    return current && <MyGoodsManagerTab key={current.id} goods={current} />;
                  })()}
                </motion.div>
              ) : (
                <motion.div key="myVehicles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {myVehicles.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {myVehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVehicleId(v.id)}
                          className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all ${(selectedVehicleId || myVehicles[0].id) === v.id ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]"}`}
                        >
                          {v.businessName}
                        </button>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const current = myVehicles.find((v) => v.id === selectedVehicleId) || myVehicles[0];
                    return current && <MyVehicleFleetManagerTab key={current.id} vehicle={current} />;
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-5 md:mt-12 pb-12 md:pb-20">
          <section className="p-6 md:p-10 bg-[#3182F6]/5 rounded-[24px] md:rounded-[40px] border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-8 shadow-sm"><Wallet className="w-5 h-5 md:w-7 md:h-7 text-blue-600" /></div>
              <h4 className="text-[17px] md:text-[22px] font-black text-[#191F28] mb-2 md:mb-3">투명한 거래 시스템</h4>
              <p className="text-[#6B7684] font-semibold text-[13px] md:text-[16px] leading-relaxed break-keep">StayOn은 중간 마진 없이 교회 간 직거래를 지원하며, 소정의 운영 수수료 외에 추가 비용을 요구하지 않습니다.</p>
            </div>
            <button className="mt-5 md:mt-8 text-blue-600 font-black flex items-center gap-2 hover:translate-x-1 transition-transform text-[13px] md:text-base">정책 확인하기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5" /></button>
          </section>

          <section className="p-6 md:p-10 bg-[#191F28] rounded-[24px] md:rounded-[40px] text-white flex flex-col justify-between gap-6 md:gap-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <MessageCircle className="w-9 h-9 md:w-12 md:h-12 text-blue-500 mb-4 md:mb-8" />
              <h4 className="text-[18px] md:text-[24px] font-black mb-2 md:mb-3 leading-tight">장소 등록이<br />막막하신가요?</h4>
              <p className="text-gray-400 font-bold text-[13px] md:text-[16px]">전문 매니저가 무료로 등록 과정을 도와드립니다.</p>
            </div>
            <button
              onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform?usp=publish-editor", "_blank")}
              className="relative z-10 w-full py-4 md:py-5 bg-blue-600 text-white rounded-[18px] md:rounded-[24px] font-black shadow-lg hover:bg-blue-700 transition-all text-[14px] md:text-[16px]">1:1 매니저 연결하기</button>
            <div className="absolute right-[-30px] top-[-30px] opacity-10 bg-white/10 w-64 h-64 rounded-full" />
          </section>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && selectedBooking && (
          <BookingDetailModal
            key="booking-detail-modal"
            selectedBooking={selectedBooking}
            onClose={() => setIsModalOpen(false)}
            onStatusChange={(id: string, status: string) => console.log(id, status)}
          />
        )}
      </AnimatePresence>

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
