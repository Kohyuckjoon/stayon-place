import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";

interface BannerItem {
  id: number;
  title: string;
  desc: string;
  tag: string;
  bgColor: string;
  textColor: string;
}

interface MainBannerProps {
  bannerData: BannerItem[];
  currentNoticeIndex: number;
  setCurrentNoticeIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function MainBanner({ bannerData, currentNoticeIndex, setCurrentNoticeIndex }: MainBannerProps) {
  const currentBanner = bannerData[currentNoticeIndex % bannerData.length];

  return (
    <section className="pt-6 pb-10 md:py-14">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="relative h-[180px] md:h-[260px] overflow-hidden rounded-[2rem] shadow-sm group">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNoticeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className={`absolute inset-0 ${currentBanner.bgColor} p-8 md:p-14 flex items-center`}
            >
              <div className="flex-1 space-y-3 md:space-y-5">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block px-3 py-1 bg-black/10 backdrop-blur-md rounded-full text-[11px] font-bold text-white/90 uppercase tracking-wider"
                >
                  {currentBanner.tag}
                </motion.span>
                
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-[36px] font-black text-white leading-tight break-keep">
                    {currentBanner.title}
                  </h2>
                  <p className="text-white/80 text-sm md:text-lg font-medium tracking-tight">
                    {currentBanner.desc}
                  </p>
                </div>
              </div>

              {/* Toss Style Visual Element */}
              <div className="hidden md:flex w-1/3 h-full items-center justify-center relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
                  <Sparkles className="w-32 h-32 text-white/30 relative z-10" />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controller: Toss Style Minimal design */}
          <div className="absolute bottom-6 right-8 flex items-center gap-3">
            <div className="bg-black/10 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3 text-white text-[12px] font-bold border border-white/10">
              <span className="opacity-100">{(currentNoticeIndex % bannerData.length) + 1}</span>
              <div className="w-[1px] h-3 bg-white/20" />
              <span className="opacity-50">{bannerData.length}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentNoticeIndex(prev => prev + 1);
                }}
                className="ml-1 hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}