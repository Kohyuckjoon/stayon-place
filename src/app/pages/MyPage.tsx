import { Header } from "../components/Header";
import {
  Calendar, MapPin, CheckCircle2, Clock, ChevronRight, Heart, Wallet, ArrowRight,
  Users, LogOut, Settings, AlertTriangle, PlusCircle, UserCircle, MessageCircle, FileText, History as HistoryIcon, Building2, CreditCard, Check, Phone, MapPinned, Sparkles,
  Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollRestoration, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { logOut, loginWithGoogle } from "../lib/auth";
import { db, functions } from "../lib/firebase"; 
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { httpsCallable } from "firebase/functions";

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
    <div className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-tight ${ui.color}`}>
      {ui.text}
    </div>
  );
};

export function MyPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"activity" | "myVenues">("activity");

  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myFavorites, setMyFavorites] = useState<any[]>([]);

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

  // useEffect(() => {
  //   // 사용자별 장소 리스트 불러오기 (applicantName 기준)
  //   if (!user || !user.displayName) return;
  //   const q = query(
  //     collection(db, "venues"),
  //     where("applicantName", "==", user.displayName),
  //     orderBy("createdAt", "desc")
  //   );
  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const venueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //     setMyVenues(venueData);
  //   });
  //   return () => unsubscribe();
  // }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "venues"),
      where("applicantName", "==", user.displayName || ""),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const venueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyVenues(venueData);
    });
    return () => unsubscribe();
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
      <main className="max-w-6xl mx-auto px-6 py-12">

        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img src={user.photoURL || ""} alt="p" className="w-20 h-20 rounded-[30px] object-cover border-4 border-gray-50" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-[#191F28]">{user.displayName}님</h1>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black">일반 멤버</span>
              </div>
              <p className="text-[#8B95A1] font-bold text-[15px]">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/settings/profile")} className="px-5 py-3.5 bg-[#F2F4F6] rounded-xl text-[14px] font-black text-[#4E5968] hover:bg-[#E5E8EB] transition-all flex items-center gap-2">
              <Settings className="w-4 h-4" /> 정보 수정
            </button>
            <button onClick={async () => { await logOut(); navigate("/"); }} className="px-5 py-3 bg-[#F04452] text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all flex items-center gap-2">
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "답사 완료 리스트", value: `${myBookings.filter(b => b.status === 'approved' || b.status === 'deposit_paid').length}건`, icon: FileText, color: "text-[#3182F6]" },
            { label: "찜한 장소", value: `${myFavorites.length}개`, icon: Heart, color: "text-[#F04452]", onClick: () => navigate('/planner') },
            { label: "전체 내역", value: `${myBookings.length}건`, icon: HistoryIcon, color: "text-[#8B95A1]" },
          ].map((stat, i) => (
            <div key={i} onClick={stat.onClick} className="bg-white p-7 rounded-[32px] shadow-sm border border-transparent hover:border-gray-100 transition-all cursor-pointer group flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#8B95A1] mb-0.5">{stat.label}</p>
                <p className="text-[20px] font-black text-[#191F28]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-10">
          <div className="flex border-b border-gray-50 px-8 bg-[#F9FAFB]">
            {[{ id: "activity", label: "내 활동" }, { id: "myVenues", label: "내 장소" }].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative py-6 px-4 text-[17px] font-bold transition-all ${activeTab === tab.id ? "text-[#191F28]" : "text-[#ADB5BD] hover:text-[#8B95A1]"}`}
              >
                {tab.label}
                {activeTab === tab.id && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3182F6] rounded-t-full" />}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-10">
            <AnimatePresence mode="wait">
              {activeTab === "activity" ? (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                  <div>
                    <h3 className="text-xl font-black text-[#191F28] mb-8 px-2">예약 및 결제 현황</h3>
                    <div className="space-y-6">
                      {myBookings.length > 0 ? myBookings.map((booking) => (
                        <div key={booking.id} className="bg-[#F9FAFB] rounded-[32px] border border-gray-100 p-8 hover:bg-white hover:shadow-xl transition-all group overflow-hidden">
                          <div className="flex flex-col lg:flex-row justify-between gap-8">

                            <div className="flex gap-6 items-start flex-1 cursor-pointer" onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }}>
                              <div className="w-20 h-20 bg-white rounded-[24px] border border-gray-100 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-[#3182F6] transition-colors">
                                <span className="text-[11px] font-black text-[#3182F6] group-hover:text-white/80 uppercase">Date</span>
                                <span className="text-2xl font-black text-[#191F28] group-hover:text-white leading-none mt-1">
                                  {booking.startDate ? booking.startDate.split('-')[2] : '??'}
                                </span>
                              </div>
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={booking.status} />
                                  <span className="text-sm font-bold text-[#8B95A1]">{booking.startDate}</span>
                                </div>
                                <h4 className="text-[22px] font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-tight">
                                  {booking.venueName || "장소명 없음"}
                                </h4>

                                {(booking.status === 'inspection_confirmed' || booking.status === 'approved' || booking.status === 'deposit_paid') && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 p-5 bg-white border border-blue-100 rounded-2xl space-y-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0"><MapPinned className="w-4 h-4 text-[#3182F6]" /></div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-tighter">상세 주소</span>
                                        <span className="text-[14px] font-bold text-[#4E5968] break-all leading-snug">{booking.location || "상세 주소 정보를 불러올 수 없습니다."}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0"><Phone className="w-4 h-4 text-[#3182F6]" /></div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-tighter">담당자 연락처</span>
                                        <span className="text-[14px] font-bold text-[#4E5968]">{booking.pastorContact || "확정 후 담당자가 연락드릴 예정입니다."}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}

                                <div className="flex items-center gap-4 text-[#6B7684] text-sm font-semibold pt-2">
                                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {booking.headcount || 0}명</span>
                                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {booking.type === 'inspection' ? '사전 답사' : '본 행사'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="lg:w-80 w-full flex flex-col justify-center">
                              {/* 1단계: 관리자 승인 후 (confirmed) */}
                              {booking.status === 'confirmed' && (
                                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-4">
                                  <p className="text-[13px] text-[#4E5968] font-bold leading-relaxed">
                                    관리자가 답사를 승인했습니다. <br />답사를 확정하고 상세 주소를 확인하세요.
                                  </p>
                                  <button
                                    // 이 부분! booking.id 가 아니라 booking 객체 통째로 전달
                                    onClick={() => handleConfirmInspection(booking)}
                                    className="w-full py-4 bg-[#3182F6] text-white rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px] shadow-lg shadow-blue-100"
                                  >
                                    <Check className="w-5 h-5" /> 답사 확정하기
                                  </button>
                                </div>
                              )}

                              {/* 2단계: 사용자가 답사 확정 후 (inspection_confirmed) */}
                              {booking.status === 'inspection_confirmed' && (
                                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-4">
                                  <div className="flex items-center gap-2 text-[#3182F6] mb-1">
                                    <Sparkles className="w-4 h-4" />
                                    <span className="text-[13px] font-black">답사를 다녀오셨나요?</span>
                                  </div>
                                  <p className="text-[12px] text-[#8B95A1] font-medium leading-relaxed">
                                    장소가 마음에 드신다면 <strong>최종 확정</strong>을 눌러주세요. 결제 후 일정이 점유됩니다.
                                  </p>
                                  <button
                                    onClick={() => handleFinalPlaceConfirm(booking)} // bookingId 대신 booking 객체 전달
                                    className="w-full py-4 bg-[#191F28] text-white rounded-xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px] shadow-lg"
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-blue-400" /> 장소 최종 확정하기
                                  </button>
                                </div>
                              )}

                              {/* 3단계: 장소 최종 결정 후 결제 대기 (approved) */}
                              {booking.status === 'approved' && (
                                <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-lg flex flex-col gap-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[13px] font-black text-[#3182F6]">결제 대기 중</span>
                                    <span className="text-[11px] font-bold text-[#8B95A1]">D-Day 장소 예약금</span>
                                  </div>
                                  <p className="text-[12px] text-[#4E5968] font-bold">
                                    장소 예약 확정을 위해 장소 예약금을 결제해주세요. 결제 즉시 타 사용자의 예약이 차단됩니다.
                                  </p>
                                  <button
                                    onClick={() => navigate(`/payment-setup/${booking.id}`)}
                                    className="w-full py-4 bg-[#3182F6] text-white rounded-xl font-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-[15px]"
                                  >
                                    <CreditCard className="w-5 h-5" /> 장소 예약금 결제하기
                                  </button>
                                </div>
                              )}

                              {/* 4단계: 최종 예약 확정 (deposit_paid) */}
                              {booking.status === 'deposit_paid' && (
                                <div className="bg-[#E6F9F2] p-6 rounded-2xl border border-[#00D082]/20 flex flex-col gap-3">
                                  <div className="flex items-center gap-2 text-[#00D082]">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="text-[16px] font-black italic">Booking Secured</span>
                                  </div>
                                  <p className="text-[12px] text-[#4E5968] font-medium leading-relaxed">
                                    예약이 확정되었습니다! <br />잔금은 행사 종료 후 현장에서 결제해주세요.
                                  </p>
                                </div>
                              )}

                              {/* 대기 중인 다른 상태들 */}
                              {['pending', 'rejected', 'completed'].includes(booking.status) && (
                                <div className="h-full flex flex-col justify-center items-end px-4">
                                  <p className="text-sm font-bold text-[#ADB5BD] mb-1 italic tracking-tight">Status: {booking.status}</p>
                                  <p className="text-[12px] text-[#D1D6DB] text-right font-medium">관리자 확인 후 <br />상태가 업데이트됩니다.</p>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      )) : (
                        <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
                          <p className="text-[#ADB5BD] font-bold">아직 신청 내역이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-8 px-2 pt-10 border-t border-gray-100">
                      <h3 className="text-xl font-black text-[#191F28]">내가 즐겨찾기한 장소</h3>
                      <button onClick={() => navigate('/planner')} className="text-[14px] font-black text-[#3182F6] flex items-center gap-1">
                        플래너 보기 <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {myFavorites.length > 0 ? myFavorites.map(fav => (
                        <div key={fav.id} onClick={() => navigate(`/venue/${fav.id}`)} className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm group cursor-pointer hover:shadow-xl transition-all">
                          <div className="h-44 overflow-hidden relative">
                            <img src={fav.images?.[0] || "https://images.unsplash.com/photo-1544427928-c49cdfebf194?q=80&w=500&auto=format&fit=crop"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="p-6">
                            <h4 className="font-black text-lg text-[#191F28] mb-1">{fav.venueName || fav.name}</h4>
                            <p className="text-[#8B95A1] font-bold text-sm flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5" />{fav.location || "지역 정보 없음"}</p>
                          </div>
                        </div>
                      )) : (
                        <div onClick={() => navigate('/venues')} className="col-span-3 py-16 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200 cursor-pointer">
                          <p className="text-[#ADB5BD] font-bold">찜한 장소가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="myVenues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="bg-[#3182F6] p-10 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-blue-100">
                    <div>
                      <h3 className="text-[26px] font-black mb-3 text-white">남는 공간으로 수익을 창출하세요</h3>
                      <p className="text-white/80 font-bold text-[16px] leading-relaxed italic">건강한 기독교 공간 공유 문화</p>
                    </div>
                    <button onClick={() => navigate("/register")} className="bg-white text-[#3182F6] px-8 py-5 rounded-[22px] font-black hover:scale-105 transition-all text-[16px] flex items-center gap-2 shadow-lg">
                      <PlusCircle className="w-6 h-6" /> 새 장소 등록
                    </button>
                  </div>

                  <div className="space-y-6 pt-6">
                    {/* {myVenues.length > 0 ? myVenues.map((venue) => (
                      <div key={venue.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm transition-all hover:border-[#3182F6]">
                        <div className="justify-between items-start mb-6 gap-4 flex">
                          <StatusBadge status={venue.status} />
                          <button className="p-3 bg-gray-50 rounded-xl text-gray-300 hover:text-[#3182F6] transition-colors"><Settings className="w-5 h-5" /></button>
                        </div>
                        <h4 className="text-[26px] font-black text-[#191F28] leading-tight mb-2">{venue.venueName}</h4>
                        <p className="text-[#8B95A1] font-bold flex items-center gap-1.5"><MapPin className="w-4 h-4" />{venue.location}</p>
                      </div>
                    )) : (
                      <div className="py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                        <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-[#ADB5BD] font-bold">등록된 장소가 없습니다.</p>
                      </div>
                    )} */}
                    <motion.div key="myVenues" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                      {/* [🔥 디자인 수정: 비활성화 느낌의 자물쇠 영역] */}
                      <div className="bg-[#F2F4F6] p-10 rounded-[40px] border-2 border-dashed border-[#D1D6DB] text-[#8B95A1] flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-sm">
                            <Lock className="w-8 h-8 text-[#ADB5BD]" />
                          </div>
                          <div>
                            <h3 className="text-[22px] font-black mb-2 text-[#4E5968]">내 장소 관리 준비 중</h3>
                            <p className="text-[#8B95A1] font-bold text-[14px]">직접 등록한 공간을 대시보드에서 편리하게 관리할 수 있는<br />기능이 곧 업데이트될 예정입니다.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pt-6 opacity-60 pointer-events-none">
                        {/* [🔥 디자인 수정: 그레이 톤의 비활성화 리스트] */}
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="px-3 py-1 bg-gray-100 rounded-md text-[11px] font-black text-gray-400">서비스 준비 중</span>
                            </div>
                            <h4 className="text-[22px] font-black text-[#ADB5BD] mb-1">등록된 장소가 없습니다</h4>
                            <p className="text-gray-300 font-bold text-[14px]">나중에 더 편리한 장소 관리 도구를 만나보세요.</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pb-20">
          <section className="p-10 bg-[#3182F6]/5 rounded-[40px] border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm"><Wallet className="w-7 h-7 text-blue-600" /></div>
              <h4 className="text-[22px] font-black text-[#191F28] mb-3">투명한 거래 시스템</h4>
              <p className="text-[#6B7684] font-semibold text-[16px] leading-relaxed">StayOn은 중간 마진 없이 교회 간 직거래를 지원하며, 소정의 운영 수수료 외에 추가 비용을 요구하지 않습니다.</p>
            </div>
            <button className="mt-8 text-blue-600 font-black flex items-center gap-2 hover:translate-x-1 transition-transform">정책 확인하기 <ArrowRight className="w-5 h-5" /></button>
          </section>

          <section className="p-10 bg-[#191F28] rounded-[40px] text-white flex flex-col justify-between gap-10 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <MessageCircle className="w-12 h-12 text-blue-500 mb-8" />
              <h4 className="text-[24px] font-black mb-3 leading-tight">장소 등록이<br />막막하신가요?</h4>
              <p className="text-gray-400 font-bold text-[16px]">전문 매니저가 무료로 등록 과정을 도와드립니다.</p>
            </div>
            <button
              onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform?usp=publish-editor", "_blank")}
              className="relative z-10 w-full py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-lg hover:bg-blue-700 transition-all text-[16px]">1:1 매니저 연결하기</button>
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
