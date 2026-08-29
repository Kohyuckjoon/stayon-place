// src/lib/storage.ts
import imageCompression from 'browser-image-compression';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app } from './firebase';

const storage = getStorage(app);

// export const uploadVenueImage = async (file: File): Promise<string> => {
//   const options = {
//     maxSizeMB: 1,
//     maxWidthOrHeight: 1920,
//     useWebWorker: true
//   };

//   try {
//     const compressedFile = await imageCompression(file, options);
//     const storageRef = ref(storage, `venues/${Date.now()}_${file.name}`);
//     const uploadTask = uploadBytesResumable(storageRef, compressedFile);

//     return new Promise((resolve, reject) => {
//       uploadTask.on('state_changed', 
//         (snapshot) => {
//           const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//           console.log(`업로드 진행률: ${progress.toFixed(2)}%`);
//         }, 
//         (error) => reject(error), 
//         async () => {
//           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//           resolve(downloadURL);
//         }
//       );
//     });
//   } catch (error) {
//     console.error("압축 또는 업로드 중 에러 발생:", error);
//     throw error;
//   }
// };


/**
 * 이미지 업로드 함수
 * @param file 업로드할 이미지 파일
 * @param venueName 장소명 (폴더 구조화용)
 * @param applicantName 신청자명 (폴더 구조화용)
 */
export const uploadVenueImage = async (
  file: File, 
  venueName: string = "unknown", 
  applicantName: string = "anonymous"
): Promise<string> => {
  
  // 1. 이미지 압축 설정
  const options = {
    maxSizeMB: 1,            // 최대 1MB
    maxWidthOrHeight: 1920, // 해상도 제한
    useWebWorker: true
  };

  try {
    // 이미지 압축 진행
    const compressedFile = await imageCompression(file, options);
    
    // 2. 폴더 구조 최적화 (venues/장소명_신청자명/파일명)
    // 안전한 폴더명을 위해 공백 제거
    const safeVenueName = venueName.trim().replace(/\s+/g, '_');
    const safeApplicantName = applicantName.trim().replace(/\s+/g, '_');
    const folderPath = `venues/${safeVenueName}_${safeApplicantName}`;
    
    // 파일명 중복 방지를 위해 타임스탬프 + 원본파일명 조합
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, compressedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`[${venueName}] 업로드 진행률: ${progress.toFixed(2)}%`);
        }, 
        (error) => {
          console.error("업로드 실패:", error);
          reject(error);
        }, 
        async () => {
          // 업로드 완료 후 URL 반환
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error("압축 또는 업로드 중 에러 발생:", error);
    throw error;
  }
};

/**
 * 외부 사역팀 포스터/소개 이미지 업로드 함수 (uploadVenueImage와 동일한 방식)
 * @param file 업로드할 이미지 파일
 * @param teamName 팀명 (폴더 구조화용)
 * @param applicantName 신청자명 (폴더 구조화용)
 */
export const uploadTeamImage = async (
  file: File,
  teamName: string = "unknown",
  applicantName: string = "anonymous"
): Promise<string> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedFile = await imageCompression(file, options);

    const safeTeamName = teamName.trim().replace(/\s+/g, '_');
    const safeApplicantName = applicantName.trim().replace(/\s+/g, '_');
    const folderPath = `teams/${safeTeamName}_${safeApplicantName}`;

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, compressedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => { },
        (error) => {
          console.error("업로드 실패:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error("압축 또는 업로드 중 에러 발생:", error);
    throw error;
  }
};

/**
 * 합주실·연습실 공간 사진 업로드 함수 (uploadTeamImage와 동일한 방식)
 * @param file 업로드할 이미지 파일
 * @param roomName 공간명 (폴더 구조화용)
 * @param applicantName 신청자명 (폴더 구조화용)
 */
export const uploadBandRoomImage = async (
  file: File,
  roomName: string = "unknown",
  applicantName: string = "anonymous"
): Promise<string> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedFile = await imageCompression(file, options);

    const safeRoomName = roomName.trim().replace(/\s+/g, '_');
    const safeApplicantName = applicantName.trim().replace(/\s+/g, '_');
    const folderPath = `bandRooms/${safeRoomName}_${safeApplicantName}`;

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, compressedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => { },
        (error) => {
          console.error("업로드 실패:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error("압축 또는 업로드 중 에러 발생:", error);
    throw error;
  }
};

/**
 * 교회 사진/주보 업로드 함수 (uploadTeamImage와 동일한 방식)
 * @param file 업로드할 이미지 파일
 * @param churchName 교회명 (폴더 구조화용)
 * @param applicantName 신청자명 (폴더 구조화용)
 */
export const uploadChurchImage = async (
  file: File,
  churchName: string = "unknown",
  applicantName: string = "anonymous"
): Promise<string> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  try {
    const compressedFile = await imageCompression(file, options);

    const safeChurchName = churchName.trim().replace(/\s+/g, '_');
    const safeApplicantName = applicantName.trim().replace(/\s+/g, '_');
    const folderPath = `churches/${safeChurchName}_${safeApplicantName}`;

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, compressedFile);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        () => { },
        (error) => {
          console.error("업로드 실패:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error("압축 또는 업로드 중 에러 발생:", error);
    throw error;
  }
};