import { LucideIcon } from "lucide-react";

interface InfoRowProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

export const InfoRow = ({ label, value, icon: Icon }: InfoRowProps) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 p-2 bg-gray-50 rounded-lg shrink-0">
      <Icon className="w-4 h-4 text-gray-400" />
    </div>
    <div>
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-bold text-gray-800 leading-snug">{value || "-"}</p>
    </div>
  </div>
);