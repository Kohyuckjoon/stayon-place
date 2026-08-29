import { Home, Receipt, Sparkles, FileText, MessageCircle } from 'lucide-react';

// 부모(Layout)로부터 상태를 전달받기 위한 타입 정의
interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto z-[999]">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">홈</span>
        </button>

        <button
          onClick={() => setActiveTab('partnership')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'partnership' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <Receipt className="w-6 h-6" />
          <span className="text-xs mt-1">파트너십</span>
        </button>

        <button
          onClick={() => setActiveTab('benefits')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'benefits' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-xs mt-1">혜택</span>
        </button>

        <button
          onClick={() => setActiveTab('start')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'start' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs mt-1">시작하기</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'contact' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs mt-1">문의</span>
        </button>
      </div>
    </nav>
  );
}