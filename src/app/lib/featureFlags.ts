// 관리자가 /admin/churches 등에서 켜고 끌 수 있는 전역 기능 스위치.
// settings/featureFlags 문서(또는 특정 필드)가 아직 없으면 항상 "사용"으로 취급해서,
// 기존 배포에 영향 없이 기본값이 켜짐이 되게 한다.
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "featureFlags"), (snap) => {
      const data = snap.data();
      setEnabled(data?.[flag] !== false);
    });
    return () => unsubscribe();
  }, [flag]);

  return enabled;
}
