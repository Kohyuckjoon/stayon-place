import React, { useState, ChangeEvent, useMemo } from 'react';
import { CreditCard, Calendar, Lock, User, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CardFormData {
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardHolder: string;
}

// ⚠️ 기존 로직 유지 (건드리지 않음)
const getCardType = (number: string) => {
  const n = number.replace(/\D/g, '');
  if (/^94/.test(n)) return { name: '신한', color: '#0046ff', logo: 'Shinhan' };
  if (/^95/.test(n)) return { name: '국민', color: '#7b6e65', logo: 'KB' };
  if (/^62/.test(n)) return { name: '현대', color: '#000000', logo: 'Hyundai' };
  if (/^51/.test(n)) return { name: '삼성', color: '#0072bc', logo: 'Samsung' };
  if (/^4/.test(n)) return { name: '비자', color: '#1A1F71', logo: 'VISA' };
  if (/^5/.test(n)) return { name: '마스터', color: '#EB001B', logo: 'Master' };
  if (/^3[47]/.test(n)) return { name: '아멕스', color: '#0070d2', logo: 'AMEX' };
  return null;
};

// 카드사 리스트 (UI용 추가)
const KOREAN_CARDS = [
  { name: '신한', color: '#0046ff' }, { name: '국민', color: '#7b6e65' },
  { name: '현대', color: '#000000' }, { name: '삼성', color: '#0072bc' },
  { name: '우리', color: '#007bc4' }, { name: '하나', color: '#008485' },
  { name: '롯데', color: '#ed1c24' }, { name: '농협', color: '#00a05b' },
];

const PaymentMethodSetup: React.FC = () => {
  const [formData, setFormData] = useState<CardFormData>({
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardHolder: '',
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isCardListOpen, setIsCardListOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // ⚠️ 기존 로직 유지
  const cardType = useMemo(() => getCardType(formData.cardNumber), [formData.cardNumber]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const parts = v.match(/.{1,4}/g) || [];
    return parts.join(' ').substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) return v.substring(0, 2) + '/' + v.substring(2, 4);
    return v;
  };

  // ⚠️ 기존 로직 유지
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') formattedValue = formatCardNumber(value);
    if (name === 'expiryDate') formattedValue = formatExpiry(value).substring(0, 5);
    if (name === 'cvc') formattedValue = value.replace(/[^0-9]/gi, '').substring(0, 3);

    setFormData({ ...formData, [name]: formattedValue });
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#F2F4F6]">
      {/* Header */}
      <div className="mb-10 text-left">
        <h2 className="text-[26px] font-black text-[#191F28] tracking-tight leading-tight">
          어떤 카드로<br />결제할까요?
        </h2>
      </div>

      <div className="space-y-7">
        {/* 카드사 선택 버튼 섹션 */}
        <div className="relative">
          <label className="text-[13px] font-bold text-[#6B7684] ml-1">카드사 선택</label>
          <button 
            onClick={() => setIsCardListOpen(!isCardListOpen)}
            className={`mt-2 w-full flex items-center justify-between bg-[#F9FAFB] rounded-[18px] px-5 py-4 transition-all border-2 ${isCardListOpen ? 'border-[#3182F6] bg-white' : 'border-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCard ? 'bg-[#3182F6]' : 'bg-[#E5E8EB]'}`}>
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className={`text-[16px] font-bold ${selectedCard ? 'text-[#191F28]' : 'text-[#ADB5BD]'}`}>
                {selectedCard ? `${selectedCard}카드` : '카드사를 선택해주세요'}
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-[#ADB5BD] transition-transform ${isCardListOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 카드사 선택 드롭다운 (Toss Style) */}
          <AnimatePresence>
            {isCardListOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 bg-white rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#F2F4F6] p-2 grid grid-cols-2 gap-1"
              >
                {KOREAN_CARDS.map((card) => (
                  <button
                    key={card.name}
                    onClick={() => {
                      setSelectedCard(card.name);
                      setIsCardListOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-[#F2F7FF] rounded-[16px] transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="text-[14px] font-bold text-[#4E5968]">{card.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 카드 번호 입력 */}
        <div className="relative">
          <label className={`text-[13px] font-bold ml-1 transition-colors ${focusedField === 'cardNumber' ? 'text-[#3182F6]' : 'text-[#6B7684]'}`}>
            카드 번호
          </label>
          <div className={`mt-2 flex items-center bg-[#F9FAFB] rounded-[18px] px-5 py-4 transition-all border-2 ${focusedField === 'cardNumber' ? 'border-[#3182F6] bg-white shadow-[0_0_0_4px_rgba(49,130,246,0.1)]' : 'border-transparent'}`}>
            <input
              name="cardNumber"
              placeholder="0000 0000 0000 0000"
              value={formData.cardNumber}
              onChange={handleChange}
              onFocus={() => setFocusedField('cardNumber')}
              onBlur={() => setFocusedField(null)}
              className="w-full bg-transparent border-none outline-none text-[17px] font-bold text-[#191F28] placeholder-[#ADB5BD] tracking-wider"
            />
            {cardType && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#191F28] text-white text-[10px] px-2 py-1 rounded-md font-black italic ml-2">
                {cardType.logo}
              </motion.div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 만료일 */}
          <div className="relative">
            <label className={`text-[13px] font-bold ml-1 transition-colors ${focusedField === 'expiryDate' ? 'text-[#3182F6]' : 'text-[#6B7684]'}`}>
              만료일 (MM/YY)
            </label>
            <div className={`mt-2 flex items-center bg-[#F9FAFB] rounded-[18px] px-5 py-4 transition-all border-2 ${focusedField === 'expiryDate' ? 'border-[#3182F6] bg-white shadow-[0_0_0_4px_rgba(49,130,246,0.1)]' : 'border-transparent'}`}>
              <input
                name="expiryDate"
                placeholder="08/28"
                value={formData.expiryDate}
                onChange={handleChange}
                onFocus={() => setFocusedField('expiryDate')}
                onBlur={() => setFocusedField(null)}
                className="w-full bg-transparent border-none outline-none text-[17px] font-bold text-[#191F28] placeholder-[#ADB5BD]"
              />
            </div>
          </div>

          {/* CVC */}
          <div className="relative">
            <label className={`text-[13px] font-bold ml-1 transition-colors ${focusedField === 'cvc' ? 'text-[#3182F6]' : 'text-[#6B7684]'}`}>
              CVC
            </label>
            <div className={`mt-2 flex items-center bg-[#F9FAFB] rounded-[18px] px-5 py-4 transition-all border-2 ${focusedField === 'cvc' ? 'border-[#3182F6] bg-white shadow-[0_0_0_4px_rgba(49,130,246,0.1)]' : 'border-transparent'}`}>
              <input
                name="cvc"
                type="password"
                placeholder="뒤 3자리"
                value={formData.cvc}
                onChange={handleChange}
                onFocus={() => setFocusedField('cvc')}
                onBlur={() => setFocusedField(null)}
                className="w-full bg-transparent border-none outline-none text-[17px] font-bold text-[#191F28] placeholder-[#ADB5BD]"
              />
            </div>
          </div>
        </div>

        {/* 카드주 이름 */}
        <div className="relative">
          <label className={`text-[13px] font-bold ml-1 transition-colors ${focusedField === 'cardHolder' ? 'text-[#3182F6]' : 'text-[#6B7684]'}`}>
            소유자 실명
          </label>
          <div className={`mt-2 flex items-center bg-[#F9FAFB] rounded-[18px] px-5 py-4 transition-all border-2 ${focusedField === 'cardHolder' ? 'border-[#3182F6] bg-white shadow-[0_0_0_4px_rgba(49,130,246,0.1)]' : 'border-transparent'}`}>
            <input
              name="cardHolder"
              placeholder="홍길동"
              value={formData.cardHolder}
              onChange={handleChange}
              onFocus={() => setFocusedField('cardHolder')}
              onBlur={() => setFocusedField(null)}
              className="w-full bg-transparent border-none outline-none text-[17px] font-bold text-[#191F28] placeholder-[#ADB5BD]"
            />
          </div>
        </div>
      </div>

      {/* 등록 버튼 (Toss Blue) */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black text-[17px] mt-12 shadow-[0_8px_20px_rgba(49,130,246,0.2)] hover:bg-[#1b64da] transition-all"
      >
        카드 등록 완료
      </motion.button>
      
      <p className="text-center text-[13px] text-[#ADB5BD] mt-6 font-medium">
        법인카드는 비밀번호 앞 2자리 대신 사업자번호가 필요합니다.
      </p>
    </div>
  );
};

export default PaymentMethodSetup;