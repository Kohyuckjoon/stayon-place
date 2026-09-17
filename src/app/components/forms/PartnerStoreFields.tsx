import { CustomInput } from "./TeamFormControls";
import { TagEditor } from "../TagEditor";

// 굿즈 매장 등록 폼(GoodsStoreRegistrationForm.tsx)과 단체티·기념품 등록 폼
// (GroupShirtsRegistrationForm.tsx)이 필드 구성이 동일해서 공용으로 뽑아낸 컴포넌트.
// 두 폼은 이 컴포넌트를 함께 쓰되, 제출 대상 컬렉션·문구·경로만 각자 다르게 가져가서
// "완전히 분리 관리"라는 요구사항은 그대로 지킨다.
//
// 매장 형태(오프라인/온라인)·주소 필드는 없앴다 - 모든 업체가 "온라인 주문 제작 URL"
// 하나로 주문을 받는 걸 전제로 하고, 노출 방식도 스테이온이 직접 문의를 중개하는 대신
// 이 URL로 바로 링크아웃하는 방식으로 바뀌었기 때문.
export interface PartnerStoreFieldsValue {
  itemTags: string[];
  onlineStoreUrl: string;
  minPrice: string;
}

interface PartnerStoreFieldsProps {
  value: PartnerStoreFieldsValue;
  onChange: (value: PartnerStoreFieldsValue) => void;
  suggestedItemTags: string[]; // 취급 품목 추천 태그 (자유 입력은 그대로 가능)
  minPriceHint: string; // 예: "10장 기준 개당 ○○원부터"
}

export function PartnerStoreFields({ value, onChange, suggestedItemTags, minPriceHint }: PartnerStoreFieldsProps) {
  return (
    <div className="space-y-8">
      <div>
        <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
          취급 품목 <span className="text-[#3182f6]">*</span>
        </label>
        <TagEditor
          tags={value.itemTags}
          onChange={(tags) => onChange({ ...value, itemTags: tags })}
          suggestedTags={suggestedItemTags}
        />
      </div>

      <CustomInput
        label="온라인 주문 제작 URL"
        required
        value={value.onlineStoreUrl}
        onChange={(v: string) => onChange({ ...value, onlineStoreUrl: v })}
        placeholder="https://"
        hint="승인되면 목록 카드에서 이 주소로 바로 연결돼요"
      />

      <CustomInput
        label="개당 최소가"
        required
        value={value.minPrice}
        onChange={(v: string) => onChange({ ...value, minPrice: v.replace(/[^0-9]/g, "") })}
        placeholder="10000"
        hint={minPriceHint}
      />
    </div>
  );
}
