import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { uploadTeamImage } from "../lib/storage";
import { Camera, ImagePlus, Info, Loader2, Save, X } from "lucide-react";
import { showConfirm } from "../lib/dialog";

const MAX_TEAM_IMAGES = 3;

// 마이페이지 "외부사역 관리자" 탭 - 승인된 사역팀 대표자가 활동 이력·연락처·SNS
// 링크·포스터 이미지 같은, 시간이 지나며 바뀔 수 있는 정보만 직접 수정할 수 있게
// 해준다. 팀명/분야/팀 규모/구성/장비/지역/소속 교회 정보처럼 승인 근거와 직결되는
// 구조적 필드는 MyVenueCoreManagerTab.tsx의 "시설/정책"과 같은 이유로 관리자만
// 다룬다. Firestore에 직접 쓰지 않고 Cloud Function(manageMyTeamCore)을 통해서만
// 쓴다. 팀은 굿즈/단체티/차량과 달리 "상품 목록" 개념이 없는 단일 프로필이라, 사진도
// 카테고리 없이 하나의 목록(posterImages, 최대 3장)으로 관리한다.
export function MyTeamManagerTab({ team }: { team: any }) {
  const [experience, setExperience] = useState(team.experience || "");
  const [applicantContact, setApplicantContact] = useState(team.applicantContact || "");
  const [applicantEmail, setApplicantEmail] = useState(team.applicantEmail || "");
  const [youtubeUrl, setYoutubeUrl] = useState(team.youtubeUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(team.instagramUrl || "");
  const [threadsUrl, setThreadsUrl] = useState(team.threadsUrl || "");
  const [naverBlogUrl, setNaverBlogUrl] = useState(team.naverBlogUrl || "");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoSaved, setInfoSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");

  const posterImages: string[] = Array.isArray(team.posterImages) && team.posterImages.length > 0
    ? team.posterImages
    : (team.posterImage ? [team.posterImage] : []);

  const callManage = async (payload: any) => {
    const manageMyTeamCore = httpsCallable(functions, "manageMyTeamCore");
    const res = await manageMyTeamCore({ teamId: team.id, ...payload });
    return res.data as { success: boolean; error?: string };
  };

  const handleSaveInfo = async () => {
    setInfoError("");
    setInfoSaved(false);
    setSavingInfo(true);
    try {
      const result = await callManage({
        action: "updateInfo",
        experience,
        applicantContact,
        applicantEmail,
        youtubeUrl,
        instagramUrl,
        threadsUrl,
        naverBlogUrl,
      });
      if (!result.success) {
        setInfoError(result.error || "저장 중 오류가 발생했습니다.");
        return;
      }
      setInfoSaved(true);
    } catch (err) {
      console.error("사역팀 정보 저장 실패:", err);
      setInfoError("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePhotoAdd = async (files: File[]) => {
    if (files.length === 0) return;
    setPhotoError("");
    setUploadingPhoto(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadTeamImage(file, team.teamName, team.applicantName)));
      const result = await callManage({ action: "addPhoto", photoUrls: urls });
      if (!result.success) setPhotoError(result.error || "사진 추가 중 오류가 발생했습니다.");
    } catch (err) {
      console.error("사진 추가 실패:", err);
      setPhotoError("사진 추가 중 오류가 발생했습니다.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async (url: string) => {
    if (!(await showConfirm("이 사진을 삭제하시겠어요?"))) return;
    setPhotoError("");
    setRemovingPhoto(url);
    try {
      const result = await callManage({ action: "removePhoto", photoUrl: url });
      if (!result.success) setPhotoError(result.error || "사진 삭제 중 오류가 발생했습니다.");
    } catch (err) {
      console.error("사진 삭제 실패:", err);
      setPhotoError("사진 삭제 중 오류가 발생했습니다.");
    } finally {
      setRemovingPhoto(null);
    }
  };

  const canAddMore = posterImages.length < MAX_TEAM_IMAGES;

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="bg-[#8B5CF6] p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4 md:gap-8 shadow-xl shadow-purple-100">
        <div>
          <h3 className="text-[19px] md:text-[26px] font-black mb-2 md:mb-3 text-white break-keep">{team.teamName}</h3>
          <p className="text-white/80 font-bold text-[13px] md:text-[16px] leading-relaxed">
            활동 이력·연락처·SNS 링크·사진을 수정하면 바로 상세 페이지에 반영돼요
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-4 bg-[#F5F3FF] border border-[#E9E3FF] rounded-2xl">
        <Info className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#6D28D9] font-bold leading-relaxed break-keep">
          여기서는 활동 이력·연락처·SNS 링크·사진만 직접 수정할 수 있어요. 팀명·분야·팀 규모·소속 교회 정보처럼 승인 근거와 관련된 항목을 바꾸고 싶으시면 관리자에게 문의해주세요.
        </p>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <h4 className="text-[15px] font-black text-[#191F28]">핵심 정보</h4>
        {infoError && (
          <div className="p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{infoError}</div>
        )}
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">활동 이력 / 경력 소개</label>
          <textarea
            value={experience}
            onChange={(e) => { setExperience(e.target.value); setInfoSaved(false); }}
            placeholder="주요 활동 이력, 수련회/집회 인도 경험 등을 입력해주세요"
            className="w-full min-h-[120px] px-4 py-3 bg-[#F9FAFB] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">대표자 연락처</label>
          <input
            value={applicantContact}
            onChange={(e) => { setApplicantContact(e.target.value); setInfoSaved(false); }}
            placeholder="010-0000-0000"
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">대표자 이메일</label>
          <input
            value={applicantEmail}
            onChange={(e) => { setApplicantEmail(e.target.value); setInfoSaved(false); }}
            placeholder="example@email.com"
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">유튜브 채널 링크</label>
          <input
            value={youtubeUrl}
            onChange={(e) => { setYoutubeUrl(e.target.value); setInfoSaved(false); }}
            placeholder="https://youtube.com/@..."
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">인스타그램 계정 링크</label>
          <input
            value={instagramUrl}
            onChange={(e) => { setInstagramUrl(e.target.value); setInfoSaved(false); }}
            placeholder="https://instagram.com/..."
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">쓰레드 계정 링크</label>
          <input
            value={threadsUrl}
            onChange={(e) => { setThreadsUrl(e.target.value); setInfoSaved(false); }}
            placeholder="https://threads.net/@..."
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">네이버 블로그 링크</label>
          <input
            value={naverBlogUrl}
            onChange={(e) => { setNaverBlogUrl(e.target.value); setInfoSaved(false); }}
            placeholder="https://blog.naver.com/..."
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#8B5CF6] focus:bg-white transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveInfo}
          disabled={savingInfo}
          className="w-full py-3.5 bg-[#8B5CF6] text-white rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#7C4DED] transition-all"
        >
          {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingInfo ? "저장 중..." : infoSaved ? "저장됨" : "저장하기"}
        </button>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-black text-[#191F28]">팀 포스터/소개 이미지 <span className="text-[#ADB5BD] font-bold">({posterImages.length}/{MAX_TEAM_IMAGES})</span></h4>
          {canAddMore && (
            <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F5F3FF] text-[#8B5CF6] rounded-lg text-[11px] font-black cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" /> {uploadingPhoto ? "업로드 중..." : "사진 추가"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, MAX_TEAM_IMAGES - posterImages.length);
                  e.target.value = "";
                  handlePhotoAdd(files);
                }}
              />
            </label>
          )}
        </div>
        {photoError && (
          <div className="p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{photoError}</div>
        )}
        {posterImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5">
            {posterImages.map((url, idx) => (
              <div key={url} className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2F4F6]">
                <img src={url} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#8B5CF6] text-white text-[9px] font-black rounded-full pointer-events-none">
                    대표
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handlePhotoRemove(url)}
                  disabled={removingPhoto === url}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-all disabled:opacity-60"
                >
                  {removingPhoto === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F9FAFB] border border-dashed border-[#E5E8EB] text-[#ADB5BD]">
            <Camera className="w-4 h-4" />
            <span className="text-[12px] font-bold">등록된 사진이 없어요</span>
          </div>
        )}
      </div>
    </div>
  );
}
