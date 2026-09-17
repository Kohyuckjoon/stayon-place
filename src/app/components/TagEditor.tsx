import { useState } from "react";
import { X } from "lucide-react";

export const MAX_VENUE_TAGS = 10;
export const LIST_VISIBLE_TAG_COUNT = 3;

const SUGGESTED_TAGS = [
  "바다뷰", "산속", "대형강당", "주차넉넉", "조용한", "체육관",
  "잔디구장", "역세권", "취사가능", "냉난방완비",
];

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  readOnly?: boolean;
  // 장소 태그 외 다른 용도(제휴업체 취급 품목 등)로 재사용할 때, 추천 태그 목록만
  // 바꿔 끼울 수 있게 했다. 안 넘기면 기존 장소용 SUGGESTED_TAGS 그대로 쓴다.
  suggestedTags?: string[];
}

const normalizeTag = (raw: string) => raw.trim().replace(/^#+/, "").replace(/\s+/g, "");

export function TagEditor({ tags, onChange, maxTags = MAX_VENUE_TAGS, readOnly = false, suggestedTags = SUGGESTED_TAGS }: TagEditorProps) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const value = normalizeTag(raw);
    if (!value || tags.includes(value) || tags.length >= maxTags) return;
    onChange([...tags, value]);
    setInput("");
  };

  const removeTag = (value: string) => onChange(tags.filter((t) => t !== value));

  if (readOnly) {
    return (
      <div className="space-y-3">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold ${i < LIST_VISIBLE_TAG_COUNT ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#6B7684]"
                  }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] font-bold text-[#B0B8C1]">등록된 태그가 없어요.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suggestedTags.map((t) => {
          const active = tags.includes(t);
          const disabled = !active && tags.length >= maxTags;
          return (
            <button
              type="button"
              key={t}
              disabled={disabled}
              onClick={() => (active ? removeTag(t) : addTag(t))}
              className={`px-3.5 py-2 rounded-full text-[13px] font-bold border transition-all ${active
                  ? "bg-[#3182F6] border-[#3182F6] text-white"
                  : disabled
                    ? "bg-[#F2F4F6] border-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed"
                    : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/50"
                }`}
            >
              #{t}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder="직접 입력 (예: 잔디구장, 단체식사)"
          disabled={tags.length >= maxTags}
          className="flex-1 h-12 px-4 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border-2 border-transparent focus:border-[#3182F6] transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          disabled={!input.trim() || tags.length >= maxTags}
          className="px-5 h-12 bg-[#3182F6] text-white rounded-xl font-bold text-[14px] shrink-0 hover:bg-[#1B64DA] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          추가
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-full text-[13px] font-bold ${i < LIST_VISIBLE_TAG_COUNT ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968]"
                }`}
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className={`p-0.5 rounded-full transition-colors ${i < LIST_VISIBLE_TAG_COUNT ? "hover:bg-white/20" : "hover:bg-[#E5E8EB]"}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-[12px] font-bold text-[#8B95A1] leading-relaxed">
        {tags.length > 0 ? (
          <>
            가장 먼저 등록한{" "}
            <span className="text-[#3182F6]">#{tags.slice(0, LIST_VISIBLE_TAG_COUNT).join(" #")}</span>
            {tags.length > LIST_VISIBLE_TAG_COUNT ? ` (${LIST_VISIBLE_TAG_COUNT}개)` : ""} 태그가 장소 목록 카드에 노출돼요.
          </>
        ) : (
          `태그는 최대 ${maxTags}개까지 등록할 수 있고, 먼저 입력한 ${LIST_VISIBLE_TAG_COUNT}개가 장소 목록 카드에 노출돼요.`
        )}{" "}
        <span className="text-[#B0B8C1]">({tags.length}/{maxTags})</span>
      </p>
    </div>
  );
}
