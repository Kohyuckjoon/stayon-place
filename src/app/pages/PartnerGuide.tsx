import React from 'react';
import {
    Building2,
    Heart,
    CheckCircle2,
    Trophy,
    Info,
    UserCheck,
    Lock,
    Zap,
    ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function PartnerGuide() {

    // 파이어베이스 로그 기록 함수 (절대 변경 금지)
    const handleLogAction = async (actionName: string) => {
        try {
            await addDoc(collection(db, "system_logs"), {
                action: actionName,
                category: "partner_guide",
                timestamp: serverTimestamp(),
            });
            alert(`${actionName} 관련 정보를 확인합니다.`);
        } catch (e) {
            console.error(e);
        }
    };

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
            {/* 헤더 섹션: 파트너를 위한 환영 문구로 변경 */}
            <section className="pt-32 pb-24 px-6 bg-white rounded-b-[56px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px] -mr-40 -mt-40 opacity-60 pointer-events-none" />
                <div className="max-w-3xl mx-auto relative z-10 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={tossTransition}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2FDF5] text-[#2DCA72] rounded-full mb-10 text-sm font-black mx-auto md:mx-0"
                    >
                        <Building2 className="w-4 h-4" /> 등록자 센터 (2026.04)
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, ...tossTransition }}
                        className="text-[36px] md:text-[52px] font-black text-[#191F28] mb-10 leading-[1.2] break-keep"
                    >
                        사역의 가치를 더하는,<br />
                        <span className="text-[#3182F6]">등록자 정산 가이드</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, ...tossTransition }}
                        className="text-[18px] md:text-[22px] text-[#4E5968] font-bold leading-relaxed break-keep opacity-80"
                    >
                        스테이온은 귀한 장소를 제공해주시는<br />
                        등록자분들과 함께 건강한 사역을 만들어갑니다.
                    </motion.p>
                </div>
            </section>

            <section className="px-6 py-12">
                <div className="max-w-4xl mx-auto">
                    <motion.div {...fadeInUp} className="bg-[#191F28] rounded-[40px] p-8 md:p-14 text-white shadow-xl">
                        <h3 className="text-2xl md:text-3xl font-black mb-10 text-center">
                            복잡한 운영, 스테이온이 전부 대신합니다
                        </h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { title: "일정 관리", desc: "예약 충돌 방지 및 실시간 일정 자동 동기화" },
                                { title: "정산 관리", desc: "투명하고 정확한 수익 정산 및 자동 계산" },
                                { title: "예약 관리", desc: "문의 응대부터 예약 확정까지 일괄 처리" }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-[#262D38] p-6 rounded-[24px] border border-[#3A424E]">
                                    <div className="w-10 h-10 bg-[#3182F6] rounded-xl flex items-center justify-center mb-4">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="text-lg font-black mb-2">{item.title}</h4>
                                    <p className="text-[13px] text-[#B0B8C1] leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-10 text-center text-[#B0B8C1] font-bold text-[14px]">
                            등록자님은 오직 <span className="text-[#3182F6]">사역과 공간의 가치</span>에만 신경 쓰세요. 나머지는 스테이온이 완벽히 해결합니다.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* 정산 정책 섹션 */}
            <section className="px-6 py-12 mt-4">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="bg-white rounded-[40px] p-8 md:p-14 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-blue-50 rounded-[20px] flex items-center justify-center">
                                <Building2 className="w-7 h-7 text-[#3182F6]" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-[#191F28]">정산 및 혜택 안내</h2>
                            </div>
                        </div>

                        <div className="bg-[#F9FAFB] p-8 rounded-[32px] mb-12 border border-[#F2F4F6]">
                            <div className="flex items-center gap-3 mb-4">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                                <span className="font-black text-[#191F28] text-lg text-blue-600">STAYON의 약속</span>
                            </div>
                            <p className="text-[#4E5968] font-bold leading-relaxed break-keep">
                                스테이온은 단순한 수익 창출이 목적이 아닙니다. <span className="text-[#191F28] font-black underline decoration-[#3182F6] underline-offset-4 text-lg">각 교회와 공동체의 사역이 중단 없이 이어지길 바라는 마음</span>으로 정직하고 투명하게 정산을 지원합니다.
                            </p>
                        </div>

                        {/* 테이블 디자인: 메테리얼 & 토스 스타일 최적화 */}
                        <div className="w-full max-w-4xl mx-auto mb-12">
                            <div className="overflow-hidden bg-white rounded-2xl border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                                <table className="w-full min-w-[600px] border-collapse text-left">
                                    <thead>
                                        <tr className="bg-[#FAFAFB] border-b border-[#F2F4F6]">
                                            <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3">누적 매칭 건수</th>
                                            <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3">수수료율</th>
                                            <th className="py-4 px-6 text-[13px] font-semibold text-[#8B95A1] w-1/3 text-right">사역처 등급</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F2F4F6] text-[15px] text-[#333D4B]">
                                        <tr className="bg-[#E8F3FF]/30">
                                            <td className="py-5 px-6 font-semibold text-[#191F28] flex items-center gap-2">최초 1회차<CheckCircle2 className="w-4 h-4 text-[#3182F6]" /></td>
                                            <td className="py-5 px-6 font-bold text-[#3182F6]">0% (면제)</td>
                                            <td className="py-5 px-6 text-right font-medium text-[#4E5968]">입점 환영 혜택</td>
                                        </tr>
                                        <tr className="hover:bg-[#FAFAFB]">
                                            <td className="py-5 px-6 font-medium">2회 ~ 10회</td>
                                            <td className="py-5 px-6 font-semibold text-[#4E5968]">10%</td>
                                            <td className="py-5 px-6 text-right font-medium text-[#8B95A1]">기본 사역처</td>
                                        </tr>
                                        <tr className="hover:bg-[#FAFAFB]">
                                            <td className="py-5 px-6 font-medium">11회 ~ 20회</td>
                                            <td className="py-5 px-6 font-semibold text-[#4E5968]">9%</td>
                                            <td className="py-5 px-6 text-right font-semibold text-[#3182F6]">우수 사역처</td>
                                        </tr>
                                        <tr className="hover:bg-[#FAFAFB]">
                                            <td className="py-5 px-6 font-medium">21회 ~ 25회</td>
                                            <td className="py-5 px-6 font-semibold text-[#4E5968]">8%</td>
                                            <td className="py-5 px-6 text-right font-semibold text-[#3182F6]">든든한 사역처</td>
                                        </tr>
                                        <tr className="bg-[#FFF9E6]/40">
                                            <td className="py-5 px-6 font-bold text-[#191F28]">26회 이상</td>
                                            <td className="py-5 px-6 font-bold text-[#D97706]">7%</td>
                                            <td className="py-5 px-6 text-right">
                                                <span className="inline-flex items-center gap-1.5 bg-[#FFF3D1] px-3 py-1 rounded-full text-[13px] text-[#B45309]">명예 사역처 <Trophy className="w-3.5 h-3.5" /></span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-4 p-6 bg-[#F9FAFB] rounded-[24px]">
                                <Info className="w-5 h-5 text-[#8B95A1] mt-0.5" />
                                <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed">수수료는 최종 예약금액을 기준으로 산정되며, 매 정산 주기마다 투명하게 공유됩니다.</p>
                            </div>
                            <div className="flex gap-4 p-6 bg-[#F9FAFB] rounded-[24px]">
                                <UserCheck className="w-5 h-5 text-[#3182F6] mt-0.5" />
                                <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed">스테이온 인증 파트너로 선정되시면 예약 우선 노출 및 홍보 마케팅 지원 혜택이 주어집니다.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="px-6 py-20">
                <motion.div
                    {...fadeInUp}
                    className="max-w-4xl mx-auto bg-[#191F28] rounded-[56px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)]"
                >
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-40 pointer-events-none">
                        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-[#3182F6] rounded-full blur-[140px]" />
                        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-emerald-600 rounded-full blur-[140px]" />
                    </div>

                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Building2 className="w-16 h-16 text-[#3182F6] mx-auto mb-12" />
                    </motion.div>

                    <h2 className="text-[28px] md:text-[42px] font-black mb-10 tracking-tight leading-tight">
                        귀한 공간이 더 가치 있게 쓰이도록,<br />스테이온이 함께합니다.
                    </h2>
                    
                    <p className="text-[16px] md:text-[22px] font-bold text-[#D1D6DB] leading-relaxed break-keep max-w-2xl mx-auto opacity-90">
                        공간을 내어주시는 등록자분들의 헌신이 헛되지 않도록,<br />
                        예약부터 정산까지 스테이온이 모두 도맡겠습니다. <br /><br />
                        등록하시는분은 오직 <span className="text-white border-b-4 border-[#3182F6] pb-1">이 공간에서 피어날 사역의 열매</span>에만 집중하세요.
                    </p>
                </motion.div>
            </section>
        </motion.div>
    );
}
