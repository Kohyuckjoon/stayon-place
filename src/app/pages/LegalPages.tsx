import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Scale, Lock } from "lucide-react";

// 스타일 공통 레이아웃 컴포넌트
const LegalLayout = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 상단 바: 그림자 대신 미세한 보더와 백드롭 블러로 토스 느낌 강조 */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md z-50 border-b border-[#F2F4F6]">
        <div className="max-w-[700px] mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-[#4E5968]" />
            </button>
            <span className="ml-2 font-black text-[18px] text-[#191F28]">{title}</span>
          </div>
        </div>
      </nav>

      {/* 본문 컨텐츠 */}
      <main className="max-w-[700px] mx-auto px-6 pt-16">
        <div className="mb-12">
          <div className="mb-4 inline-flex p-3 bg-[#F2F4F6] rounded-2xl text-[#3182F6]">
            {icon}
          </div>
          <h1 className="text-[34px] font-black text-[#191F28] tracking-tight leading-tight">
            {title}
          </h1>
        </div>
        
        {/* 가독성 향상: 섹션 간 간격을 16으로 늘리고 구분선 도입 */}
        <div className="space-y-16 text-[#4E5968] leading-[1.85] text-[16px]">
          {children}
        </div>
        
        {/* 푸터 영역 공백 */}
        <div className="mt-24 pt-10 border-t border-[#F2F4F6] text-[#B0B8C1] text-[13px]">
          <p>© 2026 STAYON. 모든 약관의 내용은 관계 법령에 따라 변경될 수 있습니다.</p>
        </div>
      </main>
    </div>
  );
};

// 이용약관: 중개 플랫폼으로서의 면책 조항 및 환불 정책 보강
export function Terms() {
  return (
    <LegalLayout title="이용약관" icon={<Scale className="w-8 h-8" />}>
      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">제 1조 (목적)</h2>
        <p>본 약관은 스테이온(STAYON)(이하 "회사")이 운영하는 온라인 플랫폼 서비스를 통해 제공하는 수련회 장소 정보 제공 및 예약 지원 서비스의 이용 조건과 절차를 규정합니다.</p>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">제 2조 (서비스의 한계 및 면책)</h2>
        <div className="p-6 bg-[#F9FAFB] rounded-[24px] border border-[#F2F4F6] space-y-4">
          <p className="font-bold text-[#191F28]">1. 중개 서비스의 특성</p>
          <p>회사는 장소 소유주(이하 "호스트")와 이용자 간의 거래를 돕는 플랫폼을 운영할 뿐, 장소의 실제 운영 주체가 아닙니다.</p>
          <p className="font-bold text-[#191F28]">2. 정보의 신뢰도</p>
          <p>플랫폼 내 장소 사진 및 상세 정보는 호스트가 제공한 자료를 바탕으로 작성됩니다. 회사는 정보의 검증을 위해 노력하나, 실제 현장 상태와 미세한 차이가 발생할 수 있음을 인지해야 합니다.</p>
        </div>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">제 3조 (예약 및 결제)</h2>
        <p>1. 이용자는 플랫폼을 통해 장소 예약을 요청할 수 있으며, 스테이온의 승인 및 입금 확인 후에 예약이 최종 확정됩니다.<br/><br/>
           2. 모든 결제 대금은 회사가 정한 안전 결제 가이드라인에 따라 처리되어야 하며, 이를 벗어난 직거래 시 발생하는 피해에 대해 회사는 책임지지 않습니다.<br/><br/>
           3. 안전한 거래 질서를 위해 플랫폼 내에서 이용자 또는 장소제공자 어느측이라도 직거래를 유도하거나 외부 결제를 유도하는 행위가 확인될 경우, 
           회사는 해당 장소 정보를 사전 통보 없이 검색 목록에서 제외하거나 서비스 이용을 영구적으로 제한할 수 있습니다. 이로 인해 발생하는 예약 상의 불이익에 대해 회사는 책임을 지지 않습니다.</p>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">제 4조 (취소 및 환불 정책)</h2>
        <p>환불은 호스트별 개별 규정을 우선으로 합니다. 단, 별도의 규정이 없는 경우 아래의 공통 규정을 따릅니다.</p>
        <ul className="mt-4 space-y-2 bg-[#F2F4F6] p-5 rounded-2xl font-bold text-[#191F28]">
          <li>• 결지 후 3일 이내 : 100% 환불</li>
          <li>• 결제 후 3일 초과 ~ 행사 30일 이전 : 50% 환불(카드/PG수수료 별도 공제)</li>
          <li>• 행사 30일 전 ~ 당일 : 환불 불가</li>
          <li>• 천재지변 등 특수 상황 : 장소 예약금 최소 50%환불(고객센터로 문의)</li>
        </ul>
      </section>
    </LegalLayout>
  );
}

// 개인정보처리방침: 수집 항목 구체화 및 보안 관리 강조
export function Privacy() {
  return (
    <LegalLayout title="개인정보처리방침" icon={<Lock className="w-8 h-8" />}>
      <div className="p-7 bg-[#E8F3FF] rounded-[28px] border border-[#3182F6]/10 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="w-6 h-6 text-[#3182F6]" />
          <span className="text-[17px] text-[#3182F6] font-black">정보보호 안내</span>
        </div>
        <p className="text-[15px] text-[#4E5968] font-bold leading-relaxed">
          STAYON은 기독교 사역자 및 단체의 개인정보를 안전하게 관리하며, 목적 외 용도로 제3자에게 절대 제공하지 않습니다.
        </p>
      </div>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">1. 수집하는 개인정보 항목</h2>
        <p className="mb-4">회사는 원활한 서비스 제공을 위해 최소한의 정보만을 수집합니다.</p>
        <div className="grid grid-cols-1 gap-4">
          <div className="border border-[#F2F4F6] p-5 rounded-2xl">
            <p className="font-black text-[#191F28] mb-1">일반 사용자</p>
            <p className="text-[14px]">성명, 연락처, 이메일, 소속 단체(교회)명</p>
          </div>
          <div className="border border-[#F2F4F6] p-5 rounded-2xl">
            <p className="font-black text-[#191F28] mb-1">장소 호스트</p>
            <p className="text-[14px]">대표자명, 사업자 등록 정보, 장소 주소, 정산 계좌 정보</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">2. 개인정보의 제3자 제공</h2>
        <p>회사는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만, 예약 확정 시 원활한 장소 이용을 위해 호스트에게 이용자의 연락처가 제공**될 수 있습니다.</p>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">3. 개인정보의 보유 및 파기</h2>
        <p>이용자의 개인정보는 서비스 탈퇴 시 즉시 파기되는 것을 원칙으로 합니다. 단, 전자상거래법 등 관련 법령에 따라 거래 내역은 최대 5년간 보관될 수 있습니다.</p>
      </section>

      <section>
        <h2 className="text-[22px] font-black text-[#191F28] mb-5">4. 관리적 보안 조치</h2>
        <p>회사는 Firebase Auth를 통한 암호화 인증을 사용하여 데이터 보안을 유지하며, 대표 관리자 외에는 개인정보 접근 권한을 엄격히 제한하고 있습니다.</p>
      </section>
    </LegalLayout>
  );
}
