import { lazy, type ComponentType } from "react";

// 새로 배포하면 화면별 파일 이름이 바뀌고 예전 파일은 사라진다. 배포 직전에 사이트를 열어둔
// 사람이 다른 화면으로 이동하면 사라진 예전 파일을 찾다가 실패하므로, 그때는 한 번만 새로고침해서
// 최신 파일을 받게 한다(무한 새로고침을 막으려고 sessionStorage에 표시를 남긴다).
const RELOAD_KEY = "stayon_chunk_reload";

export function lazyPage(factory: () => Promise<any>, exportName: string) {
  return lazy(async () => {
    try {
      const module = await factory();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* 무시 */ }
      return { default: module[exportName] as ComponentType<any> };
    } catch (error) {
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1"; } catch { /* 무시 */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(RELOAD_KEY, "1"); } catch { /* 무시 */ }
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}

// 화면 파일을 받는 동안 잠깐 보이는 로딩 표시.
export function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
    </div>
  );
}
