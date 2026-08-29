import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard = ({ title, value, icon: Icon, colorClass }: StatCardProps) => (
  <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]">
    <div>
      <p className="text-[15px] font-bold text-gray-400 mb-2">{title}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
    <div className={`p-4 rounded-2xl ${colorClass}`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
  </div>
);