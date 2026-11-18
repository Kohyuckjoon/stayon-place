import React from 'react';
import {
    ShieldCheck,
    CreditCard,
    FileText,
    ArrowRight,
    CheckCircle2,
    Info,
    Clock,
    AlertCircle,
    Download,
    Coins,
    Heart,
    UserCheck,
    Zap,
    Lock,
    Building2,
    BarChart3,
    Trophy,
    CalendarCheck,
    HelpCircle,
    AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { showAlert } from "../lib/dialog";

export default function SafetyGuide() {

    // 증빙 서류 다운로드 시 파이어베이스에 로그 기록 (기능 유지 - 절대 변경 금지)
    const handleLogAction = async (actionName: string) => {
        try {
            await addDoc(collection(db, "system_logs"), {
                action: actionName,
                category: "safety_guide",
                timestamp: serverTimestamp(),
            });
            await showAlert(`${actionName} 파일 생성을 시작합니다.`);
        } catch (e) {
            console.error(e);
        }
    };

    // 스타일의 공통 애니메이션 설정
    const tossTransition = { type: "spring", damping: 25, stiffness: 200 } as const;
    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-100px" },
        transition: tossTransition
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-[#F2F4F6] pb-20 font-sans tracking-tight"
        >
            {/* Hero Section */}
            <section className="pt-8 pb-8 px-5 sm:pt-16 sm:pb-12 sm:px-6 bg-white rounded-b-[40px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px] -mr-40 -mt-40 opacity-60 pointer-events-none" />
                <div className="max-w-3xl mx-auto relative z-10 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={tossTransition}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E8F3FF] text-[#3182F6] rounded-full mb-5 text-sm font-black mx-auto md:mx-0"
                    >
                        <Lock className="w-4 h-4" /> 플랫폼 수수료 및 환불 정책 가이드 (2026.04)
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, ...tossTransition }}
                        className="text-[30px] md:text-[46px] font-black text-[#191F28] mb-5 leading-[1.25] break-keep"
                    >
                        사역에만 전념할 수 있도록,<br />
                        <span className="text-[#3182F6]">투명한 정산</span>을 만듭니다.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, ...tossTransition }}
                        className="text-[15px] md:text-[18px] text-[#4E5968] font-bold leading-relaxed break-keep opacity-80"
                    >
                        스테이온은 장소 제공자에게는 최대의 예우를,<br />
                        사용자에게는 신뢰할 수 있는 예약 환경을 제공합니다.
                    </motion.p>
                </div>
            </section>

            {/* 1. 장소 제공자 정산 정책 (시나리오 A) */}
            {/* <section className="px-6 py-12 mt-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="bg-white rounded-[40px] p-8 md:p-14 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-white"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-blue-50 rounded-[20px] flex items-center justify-center">
                                <Building2 className="w-7 h-7 text-[#3182F6]" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-[#191F28]">장소 제공자</h2>
                            </div>
                        </div>

                        <div className="bg-[#F9FAFB] p-8 rounded-[32px] mb-12 border border-[#F2F4F6]">
                            <div className="flex items-center gap-3 mb-4">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                <span className="font-black text-[#191F28] text-lg text-blue-600">STAYON의 약속</span>
                            </div>
                            <p className="text-[#4E5968] font-bold leading-relaxed break-keep">
                                스테이온은 단순한 수익 창출이 목적이 아닙니다. 장소를 제공하시는 분도, 서비스를 운영하는 기획자도 <span className="text-[#191F28] font-black underline decoration-[#3182F6] underline-offset-4 text-lg">각 교회와 공동체의 사역이 중단 없이 이어지길 바라는 마음</span>으로 함께합니다.
                            </p>
                        </div>

                        <div className="w-full max-w-4xl mx-auto mb-12">
                            
                            <div className="overflow-hidden bg-white rounded-2xl border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px] border-collapse text-left">
                                        
                                        <thead>
                                            <tr className="bg-[#FAFAFB] border-b border-[#F2F4F6]">
                                                <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3">누적 매칭 건수</th>
                                                <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3">수수료 혜택</th>
                                                <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3 text-right">사역처 등급</th>
                                            </tr>
                                        </thead>

                                        
                                        <tbody className="divide-y divide-[#F2F4F6] text-[15px] text-[#333D4B]">

                                            //* 1회차: 웰컴 혜택 (토스 블루 포인트)
                                            <tr className="bg-[#E8F3FF]/30 transition-colors">
                                                <td className="py-5 px-6 font-semibold text-[#191F28] flex items-center gap-2">
                                                    최초 등록 후 1회차
                                                    <CheckCircle2 className="w-4 h-4 text-[#3182F6] fill-[#E8F3FF]" />
                                                </td>
                                                <td className="py-5 px-6 font-bold text-[#3182F6]">0원 <span className="text-[13px] font-medium text-[#4E5968] ml-1">(수수료 면제)</span></td>
                                                <td className="py-5 px-6 text-right font-medium text-[#4E5968]">입점 환영 혜택</td>
                                            </tr>

                                            //* 2~10회: 표준 구간
                                            <tr className="hover:bg-[#FAFAFB] transition-colors">
                                                <td className="py-5 px-6 font-medium">2회 ~ 10회 미만</td>
                                                <td className="py-5 px-6 font-semibold text-[#4E5968]">총 합계 금액의 10%</td>
                                                <td className="py-5 px-6 text-right font-medium text-[#8B95A1]">기본 사역처</td>
                                            </tr>

                                            //* 11~20회: 우수 구간
                                            <tr className="hover:bg-[#FAFAFB] transition-colors">
                                                <td className="py-5 px-6 font-medium">11회 ~ 20회 미만</td>
                                                <td className="py-5 px-6 font-semibold text-[#4E5968]">총 합계 금액의 9%</td>
                                                <td className="py-5 px-6 text-right font-semibold text-[#3182F6]">우수 사역처</td>
                                            </tr>

                                            {/* 21~25회: 성장 구간
                                            <tr className="hover:bg-[#FAFAFB] transition-colors">
                                                <td className="py-5 px-6 font-medium">21회 ~ 25회 미만</td>
                                                <td className="py-5 px-6 font-semibold text-[#4E5968]">총 합계 금액의 8%</td>
                                                <td className="py-5 px-6 text-right font-semibold text-[#3182F6]">든든한 사역처</td>
                                            </tr>

                                            {/* 26회 이후: VIP 명예 구간 (골드 포인트 및 뱃지 일체화)
                                            <tr className="bg-[#FFF9E6]/40 hover:bg-[#FFF9E6]/60 transition-colors">
                                                <td className="py-5 px-6 font-bold text-[#191F28]">26회 이후</td>
                                                <td className="py-5 px-6 font-bold text-[#D97706]">총 합계 금액의 7%</td>
                                                <td className="py-5 px-6 text-right font-bold text-[#D97706]">
                                                    <span className="inline-flex items-center gap-1.5 bg-[#FFF3D1] px-3 py-1 rounded-full text-[13px] text-[#B45309]">
                                                        명예 사역처 <Trophy className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
                                                    </span>
                                                </td>
                                            </tr>

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <p className="mt-3 text-right text-[12px] text-[#8B95A1] font-medium px-2">* 최종 결제 금액 기준 적용</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4 p-6 bg-[#F9FAFB] rounded-[24px]">
                                <Info className="w-5 h-5 text-[#8B95A1] shrink-0 mt-0.5" />
                                <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed break-keep">
                                    최초 계약 성사 시 플랫폼 수수료는 면제되며 2회차 이후부터는 장소 예약금 전체 금액의 10%가 적용됩니다.
                                </p>
                            </div>
                            <div className="flex gap-4 p-6 bg-[#F9FAFB] rounded-[24px]">
                                <UserCheck className="w-5 h-5 text-[#3182F6] shrink-0 mt-0.5" />
                                <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed break-keep">
                                    스테이온이 직접 답사하여 시설 유지보수가 탁월한 경우에는 특별한 혜택과 함께 해당 장소에 스테이온 인증 마크가 부여됩니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section> */}

            {/* 2. 사용자용 환불 정책 (강력한 규정) */}
            <section className="px-4 py-6 sm:px-5 sm:py-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="bg-white rounded-[28px] p-4 sm:p-6 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-white"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#191F28] flex items-center gap-2.5 sm:gap-3 break-keep">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                                    <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-orange-500" />
                                </div>
                                스테이온 환불 규정(사용자)
                            </h2>
                            <span className="text-red-500 text-sm font-black px-3 py-1 bg-red-50 rounded-lg shrink-0 w-fit">신중 예약 필수</span>
                        </div>

                        {/* 환불 바 차트: 표의 기준에 맞춰 업데이트. 라벨 3개를 한 줄에 욱여넣으면
                            모바일에서 줄바꿈이 지저분해져서, 좁은 화면에선 점(범례)과 함께 세로로 쌓는다. */}
                        <div className="mb-8 px-2">
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between mb-3 font-black text-[13px] sm:text-[14px]">
                                <span className="flex items-center gap-1.5 text-[#3182F6]"><span className="w-2 h-2 rounded-full bg-[#3182F6] shrink-0" />결제 후 3일 내 (100%)</span>
                                <span className="flex items-center gap-1.5 text-[#F2994A]"><span className="w-2 h-2 rounded-full bg-[#F2994A] shrink-0" />3일 초과 ~ 30일 전 (50%)</span>
                                <span className="flex items-center gap-1.5 text-[#F04452]"><span className="w-2 h-2 rounded-full bg-[#F04452] shrink-0" />행사 30일 전 ~ 당일</span>
                            </div>
                            <div className="h-5 w-full bg-[#F2F4F6] rounded-full flex overflow-hidden p-1 shadow-inner">
                                {/* 안심 구간 (100%) */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: "40%" }}
                                    transition={{ delay: 0.3, duration: 1 }}
                                    className="h-full bg-[#3182F6] rounded-full"
                                />
                                {/* 주의 구간 (50%) */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: "30%" }}
                                    transition={{ delay: 0.5, duration: 1 }}
                                    className="h-full bg-[#F2994A] rounded-full mx-1"
                                />
                                {/* 불가 구간 */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: "30%" }}
                                    transition={{ delay: 0.7, duration: 1 }}
                                    className="h-full bg-[#F04452] rounded-full"
                                />
                            </div>
                            <p className="text-right text-[#8B95A1] text-[11px] mt-3 font-bold">* 특수 상황(천재지변)은 별도 협의</p>
                        </div>

                        <div className="mb-6 sm:mb-8 p-4 sm:p-5 bg-red-50/30 rounded-2xl border border-red-100/50">
                            <div className="flex items-center gap-2 text-red-600 mb-3 font-black">
                                <AlertTriangle className="w-5 h-5" />
                                <span>필독 사항</span>
                            </div>
                            <p className="text-[#333D4B] font-bold leading-relaxed break-keep text-[14px]">
                                장소 예약금는 예약 완료 이후 카드사 및 플랫폼 정책에 따라 <span className="text-red-600 font-black">원칙적으로 전액 환불이 불가능</span>합니다. 예약을 가볍게 여기지 않고, 충분히 신중하게 고민하신 후 진행해 주시길 부탁드립니다."
                            </p>
                        </div>

                        {/* <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-[#F2F4F6]">
                                        <th className="py-5 px-2 text-[14px] font-black text-[#8B95A1]">구분</th>
                                        <th className="py-5 px-2 text-[14px] font-black text-[#8B95A1]">환불 비율</th>
                                        <th className="py-5 px-2 text-[14px] font-black text-[#8B95A1] text-right">상세 근거</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F2F4F6] font-bold text-[15px]">
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="py-6 px-2 text-[#191F28]">결제 후 3일 이내</td>
                                        <td className="py-6 px-2 text-[#3182F6] font-black">100% 환불</td>
                                        <td className="py-6 px-2 text-right text-[#ADB5BD]">단순 변심 및 예약 실수 보호</td>
                                    </tr>
                                    <tr className="bg-red-50/20">
                                        <td className="py-6 px-2 text-[#191F28]">결제 후 3일 초과 ~ 행사 30일 이전</td>
                                        <td className="py-6 px-2 text-[#F2994A] font-black">50% 환불(카드사 수수료 별도 공제)</td>
                                        <td className="py-6 px-2 text-right text-[#ADB5BD]">카드사 정책 및 예약 확정 보호</td>
                                    </tr>
                                    <tr className="bg-red-50/20">
                                        <td className="py-6 px-2 text-[#191F28]">행사 30일 전 ~ 당일</td>
                                        <td className="py-6 px-2 text-[#F04452] font-black">환불 불가</td>
                                        <td className="py-6 px-2 text-right text-[#ADB5BD]">카드사 정책 및 예약 확정 보호</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="py-6 px-2 text-[#191F28]">천재지변 등 특수 상황</td>
                                        <td className="py-6 px-2 text-[#4E5968]">장소 예약금 최소 50% 환불(고객센터 문의)</td>
                                        <td className="py-6 px-2 text-right text-[#ADB5BD]">장소 제공자 협의 시 진행</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div> */}

                        <div className="w-full max-w-4xl mx-auto mb-8">
                            {/* 토스·머티리얼풍 라운드 카드 컨테이너 */}
                            <div className="overflow-hidden bg-white rounded-2xl border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                                {/* 모바일: 표를 억지로 가로 스크롤시키면 글자가 화면 밖으로 잘려서
                                    잘 안 보였다 - 세로로 쌓이는 카드 리스트로 대신 보여준다. */}
                                <div className="md:hidden divide-y divide-[#F2F4F6] text-[14px]">
                                    <div className="p-4 bg-[#E8F3FF]/30">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-[#191F28]">
                                                결제 후 3일 이내 <Clock className="w-4 h-4 text-[#3182F6] shrink-0" />
                                            </span>
                                            <span className="font-bold text-[#3182F6] shrink-0">100% 환불</span>
                                        </div>
                                        <p className="mt-1.5 text-[12.5px] font-medium text-[#8B95A1]">단순 변심 및 예약 실수 보호</p>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-[#191F28]">결제 후 4일차 ~ 행사 30일 이전</span>
                                            <span className="font-semibold text-[#4E5968] shrink-0">50% 환불</span>
                                        </div>
                                        <p className="mt-1.5 text-[12.5px] font-medium text-[#8B95A1]">카드사 수수료 별도 공제 · 카드사 정책 보호</p>
                                    </div>

                                    <div className="p-4 bg-[#FFF0F1]/40">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-bold text-[#191F28]">
                                                행사 30일 전 ~ 당일 <AlertTriangle className="w-4 h-4 text-[#F04452] shrink-0" />
                                            </span>
                                            <span className="font-bold text-[#F04452] shrink-0">환불 불가</span>
                                        </div>
                                        <p className="mt-1.5 text-[12.5px] font-bold text-[#D0303D]">예약 확정 보호</p>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-[#4E5968]">
                                                천재지변 등 특수 상황 <HelpCircle className="w-4 h-4 text-[#8B95A1] shrink-0" />
                                            </span>
                                            <span className="font-medium text-[#4E5968] shrink-0 text-right">최소 50% 환불</span>
                                        </div>
                                        <p className="mt-1.5 text-[12.5px] font-medium text-[#8B95A1]">고객센터 문의 필요 · 장소 제공자 협의 시 진행</p>
                                    </div>
                                </div>

                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full min-w-[700px] border-collapse text-left table-fixed">
                                        {/* 헤더 비율 조정: 텍스트가 긴 첫 번째, 두 번째 열 확보 */}
                                        <thead>
                                            <tr className="bg-[#FAFAFB] border-b border-[#F2F4F6]">
                                                <th className="py-3 px-5 text-[13px] font-semibold text-[#8B95A1] w-[42%]">구분</th>
                                                <th className="py-3 px-5 text-[13px] font-semibold text-[#8B95A1] w-[33%]">환불 비율</th>
                                                <th className="py-3 px-5 text-[13px] font-semibold text-[#8B95A1] w-[25%] text-right">상세 근거</th>
                                            </tr>
                                        </thead>

                                        {/* 바디: 깨짐 현상을 원천 차단한 인라인 룰 적용 */}
                                        <tbody className="divide-y divide-[#F2F4F6] text-[15px] text-[#333D4B]">

                                            {/* 1단계: 결제 후 3일 이내 (안전지대) */}
                                            <tr className="bg-[#E8F3FF]/30 transition-colors">
                                                <td className="py-4 px-5 font-semibold text-[#191F28]">
                                                    <span className="inline-flex items-center gap-2">
                                                        결제 후 3일 이내
                                                        <Clock className="w-4 h-4 text-[#3182F6] shrink-0" />
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5 font-bold text-[#3182F6]">100% 환불</td>
                                                <td className="py-4 px-5 text-right font-medium text-[#4E5968] whitespace-nowrap">
                                                    단순 변심 및 예약 실수 보호
                                                </td>
                                            </tr>

                                            {/* 2단계: 3일 초과 ~ 행사 30일 이전 (경고 전 단계) */}
                                            <tr className="hover:bg-[#FAFAFB] transition-colors">
                                                <td className="py-4 px-5 font-medium text-[#191F28] break-all">
                                                    결제 후 4일차 ~ 행사 30일 이전
                                                </td>
                                                <td className="py-4 px-5 font-semibold text-[#4E5968]">
                                                    <div>50% 환불</div>
                                                    <div className="text-[12px] font-normal text-[#8B95A1] mt-0.5">
                                                        (카드사 수수료 별도 공제)
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 text-right font-medium text-[#8B95A1] whitespace-nowrap">
                                                    카드사 정책 보호
                                                </td>
                                            </tr>

                                            {/* 3단계: 행사 30일 전 ~ 당일 (강력 경고) */}
                                            <tr className="bg-[#FFF0F1]/40 hover:bg-[#FFF0F1]/60 transition-colors">
                                                <td className="py-4 px-5 font-bold text-[#191F28]">
                                                    <span className="inline-flex items-center gap-2">
                                                        행사 30일 전 ~ 당일
                                                        <AlertTriangle className="w-4 h-4 text-[#F04452] shrink-0" />
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5 font-bold text-[#F04452]">환불 불가</td>
                                                <td className="py-4 px-5 text-right">
                                                    <span className="inline-flex items-center justify-center bg-[#FFECEE] px-3 py-1 rounded-full text-[12px] font-bold text-[#D0303D] whitespace-nowrap">
                                                        예약 확정 보호
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* 4단계: 특수 상황 (안내/협의 구간) */}
                                            <tr className="hover:bg-[#FAFAFB] transition-colors">
                                                <td className="py-4 px-5 font-medium text-[#4E5968]">
                                                    <span className="inline-flex items-center gap-2">
                                                        천재지변 등 특수 상황
                                                        <HelpCircle className="w-4 h-4 text-[#8B95A1] shrink-0" />
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5 font-medium text-[#4E5968]">
                                                    <div>장소 예약금 최소 50% 환불</div>
                                                    <div className="text-[12px] font-normal text-[#8B95A1] mt-0.5">
                                                        (고객센터 문의 필요)
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 text-right font-medium text-[#8B95A1] break-all">
                                                    장소 제공자 협의 시 진행
                                                </td>
                                            </tr>

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-[#F9FAFB] rounded-2xl flex items-center gap-3 border border-[#F2F4F6]">
                            <Zap className="w-5 h-5 text-[#3182F6] shrink-0" />
                            <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed break-keep">
                                노쇼(No-Show) 시 장소 예약금은 절대 환불되지 않으며, 모든 환불은 진행 시 카드사 수수료는 별도 공제됩니다.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 3. 행정 최적화 및 결제 시스템 */}
            <section className="px-5 py-8">
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
                    <motion.div
                        {...fadeInUp}
                        className="bg-white rounded-[28px] p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-white"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                            <Zap className="w-6 h-6 text-[#3182F6]" />
                        </div>
                        <h3 className="text-[19px] font-black text-[#191F28] mb-3">스마트 원클릭 결제</h3>
                        <p className="text-[#4E5968] font-bold text-sm leading-relaxed mb-5 break-keep">
                            갤럭시아머니트리 등 검증된 결제 대행사(PG)를 통해 안전하게 장소 예약금을 결제합니다. 모든 예약 과정은 카카오톡과 문자를 통해 실시간으로 안내되어 노쇼 리스크를 사전에 차단합니다.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-[14px] font-black text-[#191F28]">
                                <CheckCircle2 className="w-5 h-5 text-[#3182F6]" /> 결제 즉시 카톡/문자 알림
                            </li>
                            <li className="flex items-center gap-3 text-[14px] font-black text-[#191F28]">
                                <CheckCircle2 className="w-5 h-5 text-[#3182F6]" /> 강력한 법적 환불 규정 동의 필수
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div
                        {...fadeInUp}
                        className="bg-white rounded-[28px] p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-white relative overflow-hidden group"
                    >
                        {/* 서비스 준비중 배지 */}
                        <div className="absolute top-6 right-6">
                            <span className="px-3 py-1 bg-[#F2F4F6] text-[#8B95A1] text-[10px] font-black rounded-lg uppercase tracking-wider">
                                Coming Soon
                            </span>
                        </div>

                        <div className="w-12 h-12 bg-[#F2F4F6] rounded-2xl flex items-center justify-center mb-5">
                            <FileText className="w-6 h-6 text-[#ADB5BD]" />
                        </div>

                        <h3 className="text-[19px] font-black text-[#191F28] mb-3">서류 업무 자동화</h3>
                        <p className="text-[#8B95A1] font-bold text-sm leading-relaxed mb-5 break-keep">
                            사전 보고를 위한 견적서와 예약 확인서를 결제 전이라도 언제든 즉시 다운로드할 수 있도록 준비 중입니다.
                        </p>

                        {/* 비활성화 및 자물쇠 레이어 */}
                        <div className="relative">
                            <div className="grid grid-cols-2 gap-3 opacity-30 grayscale pointer-events-none blur-[2px]">
                                <div className="flex flex-col items-center gap-2 p-4 bg-[#F9FAFB] rounded-2xl">
                                    <Download className="w-6 h-6 text-[#ADB5BD]" />
                                    <span className="text-[13px] font-black text-[#ADB5BD]">견적서</span>
                                </div>
                                <div className="flex flex-col items-center gap-2 p-4 bg-[#F9FAFB] rounded-2xl">
                                    <CalendarCheck className="w-6 h-6 text-[#ADB5BD]" />
                                    <span className="text-[13px] font-black text-[#ADB5BD]">예약 확인서</span>
                                </div>
                            </div>

                            {/* 중앙 자물쇠 아이콘 */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-gray-100 mb-2">
                                    <Lock className="w-5 h-5 text-[#ADB5BD]" />
                                </div>
                                <p className="text-[11px] font-black text-[#ADB5BD]">서비스 점검 중</p>
                            </div>
                        </div>

                        {/* 호버 시 안내 문구 (선택 사항) */}
                        <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                            <div className="bg-[#191F28] text-white text-[12px] font-black px-5 py-2.5 rounded-xl shadow-xl">
                                곧 더 편리한 서류 서비스를 만나보세요!
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 4. 현직 사역자의 약속 */}
            <section className="px-5 py-12">
                <motion.div
                    {...fadeInUp}
                    className="max-w-4xl mx-auto bg-[#191F28] rounded-[36px] p-8 md:p-14 text-center text-white relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)]"
                >
                    {/* 배경 효과 */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-40 pointer-events-none">
                        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#3182F6] rounded-full blur-[140px]" />
                        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-emerald-600 rounded-full blur-[140px]" />
                    </div>

                    {/* 아이콘 애니메이션 */}
                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Heart className="w-12 h-12 text-[#3182F6] fill-[#3182F6] mx-auto mb-6" />
                    </motion.div>

                    {/* 메인 타이틀 */}
                    <h2 className="text-[24px] md:text-[36px] font-black mb-5 tracking-tight leading-tight">
                        사역을 사역답게, 진심을 담습니다.
                    </h2>

                    {/* 본문 멘트 */}
                    <div className="space-y-4">
                        <p className="text-[14px] md:text-[18px] font-bold text-[#D1D6DB] leading-relaxed break-keep max-w-2xl mx-auto opacity-90">
                            영혼을 향한 귀한 발걸음, 그 준비의 수고를 스테이온이 잘 압니다.<br />
                            모든 행정적 조율은 저희에게 맡기십시오.
                        </p>

                        <p className="text-[14px] md:text-[18px] font-bold text-[#D1D6DB] leading-relaxed break-keep max-w-2xl mx-auto opacity-90">
                            사역자님과 헌신자분들은 오직 <span className="text-white border-b-4 border-[#3182F6] pb-1">부어주실 은혜와 사역의 본질</span>에만 온전히 집중하실 수 있도록 돕겠습니다.
                        </p>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="mt-6 py-8 text-center">
                <p className="text-[#ADB5BD] text-sm font-medium tracking-wide">© 2026 StayOn. All rights reserved.</p>
            </footer>
        </motion.div>
    );
}
