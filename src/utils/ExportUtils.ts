import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

// --- 타입 정의 (Firestore 구조 반영) ---
export interface Venue {
  id: string | number;
  venueName?: string;
  name: string;
  address?: string;
  location?: string;
  capacity?: number;
  price?: number;
  priceText?: string;
  highlight?: string;
  verified?: boolean;
  // 기존 features는 하위 호환성을 위해 남겨두되 Optional 처리
  features?: {
    audio?: string;
    accommodation?: string;
    cooking?: string;
  };
  // Firestore 신규 필드
  mealOption?: string[];
  mealPrice?: number;
  mealNote?: string;
  instruments?: string; // 음향/악기 정보
}

/**
 * 도우미 함수: 식사 정보 포맷팅
 */
const formatMealInfo = (v: Venue) => {
  if (!v.mealOption) return "정보 없음";
  const type = v.mealOption.includes('provided') ? '식사 제공' : '자체 취사';
  const price = v.mealPrice ? `(인당 ${v.mealPrice.toLocaleString()}원)` : '';
  return `${type} ${price}`.trim();
};

/**
 * 1. PNG 다운로드 (보고서형 디자인)
 */
/**
 * 1. PNG 다운로드 (폰트 및 이름 렌더링 최적화 버전)
 */

export const exportToPNG = async (venues: Venue[], eventDate: string, analysis: any) => {
  if (venues.length === 0) return;

  const chunkArray = (arr: Venue[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const venueChunks = chunkArray(venues, 5);
  const fixedWidth = 1920;
  const printCanvas = document.createElement('div');

  printCanvas.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: ${fixedWidth}px; padding: 100px; background-color: #F2F4F6;
    font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    color: #191F28; box-sizing: border-box; display: flex; flex-direction: column;
  `;

  const getBadgeHtml = (venue: Venue) => {
    if (!venue) return `<div style="height: 32px; margin-bottom: 20px;"></div>`;
    if (analysis?.recommendedId?.toString() === venue.id?.toString()) {
      return `
        <div style="
          display: inline-block;
          text-align: center;
          line-height: 32px;
          height: 32px;
          background-color: #3182F6; 
          color: #ffffff;            
          border-radius: 10px;
          font-size: 14px;
          font-weight: 800;
          padding: 0 14px;           
          box-shadow: 0 4px 12px rgba(49, 130, 246, 0.2);
          box-sizing: border-box;
          white-space: nowrap;
          margin-bottom: 20px;
        ">
          ✨ 최고 추천
        </div>
      `;
    }
    return `<div style="height: 32px; margin-bottom: 20px;"></div>`;
  };

  let tablesContent = `
    <div style="margin-bottom: 60px;">
      <div style="font-size: 56px; font-weight: 900; color: #191F28; letter-spacing: -1.5px;">장소 선정 비교 리포트</div>
    </div>
  `;

  venueChunks.forEach((chunk, index) => {
    const paddedChunk = [...chunk];
    while (paddedChunk.length < 5) {
      paddedChunk.push(null as any);
    }

    const sectionTitle = venueChunks.length > 1 
      ? `<div style="font-size: 26px; font-weight: 800; color: #4E5968; margin-bottom: 20px; margin-left: 8px;">세트 후보군 (${index + 1}/${venueChunks.length})</div>` 
      : '';

    tablesContent += `
      ${sectionTitle}
      <div style="background-color: #ffffff; border-radius: 48px; overflow: hidden; border: 1px solid #E5E8EB; box-shadow: 0 20px 40px rgba(0,0,0,0.04); margin-bottom: 60px;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; word-break: break-all;">
          <thead>
            <tr>
              <th style="width: 220px; padding: 50px 40px; text-align: left; border-bottom: 2px solid #F9FAFB; color: #B0B8C1; font-size: 14px; font-weight: 800; letter-spacing: 1px;">CATEGORY</th>
              ${paddedChunk.map(v => {
                if (!v) return `<th style="width: 300px; border-bottom: 2px solid #F9FAFB; border-left: 1px solid #F9FAFB;"></th>`;
                const displayName = v.name || v.venueName || "이름 없는 장소";
                return `
                  <th style="width: 300px; padding: 50px 40px; text-align: left; border-bottom: 2px solid #F9FAFB; border-left: 1px solid #F9FAFB; vertical-align: top;">
                    ${getBadgeHtml(v)}
                    <div style="font-size: 28px; font-weight: 900; color: #191F28; line-height: 1.4; letter-spacing: -0.5px; word-break: keep-all;">
                      ${displayName}
                    </div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody style="font-size: 18px; font-weight: 600; color: #4E5968;">
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1; width: 220px;">위치</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5; width: 300px; vertical-align: top;">${v.location || v.address || "정보 없음"}</td>` : `<td style="border-left: 1px solid #F9FAFB; width: 300px;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">수용 인원</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; width: 300px;">${v.capacity || 0}명</td>` : `<td style="border-left: 1px solid #F9FAFB; width: 300px;"></td>`).join('')}
            </tr>
            <tr style="background-color: #F2F8FF;">
              <td style="padding: 40px; color: #1B64DA; font-weight: 800; background-color: #E8F3FF; width: 220px;">예상 비용</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #D0E6FC; width: 300px;"><span style="font-size: 28px; font-weight: 900; color: #3182F6;">${v.priceText || (v.price ? v.price.toLocaleString() + '원' : '별도 문의')}</span></td>` : `<td style="border-left: 1px solid #D0E6FC; width: 300px;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">음향/악기</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5; width: 300px; vertical-align: top;">${v.instruments || v.features?.audio || "별도 문의"}</td>` : `<td style="border-left: 1px solid #F9FAFB; width: 300px;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">식사/취사</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; width: 300px; vertical-align: top;">${formatMealInfo(v)}</td>` : `<td style="border-left: 1px solid #F9FAFB; width: 300px;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">숙소 구성</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5; width: 300px; vertical-align: top;">${v.features?.accommodation || "정보 없음"}</td>` : `<td style="border-left: 1px solid #F9FAFB; width: 300px;"></td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  printCanvas.innerHTML = tablesContent;
  document.body.appendChild(printCanvas);

  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(printCanvas, {
      backgroundColor: '#F2F4F6',
      scale: 2,
      useCORS: true,
      logging: false, 
      allowTaint: true,
      width: fixedWidth,        // 이전 수정본의 안전 뷰포트 고정 옵션은 유지합니다.
      windowWidth: fixedWidth
    });
    saveAs(canvas.toDataURL('image/png'), `StayOn_Report_${eventDate}.png`);
  } finally {
    document.body.removeChild(printCanvas);
  }
};

/**
 * 2. Excel 다운로드
 */
/**
 * 2. Excel 다운로드 (열 너비 자동 조절 버전)
 */
export const exportToExcel = (venues: Venue[], eventDate: string) => {
  const wsData = venues.map(v => ({
    "장소명": v.venueName || v.name || "",
    "위치": v.location || v.address || "",
    "수용인원": `${v.capacity || 0}명`,
    "비용": v.priceText || (v.price ? v.price.toLocaleString() + '원' : ""),
    "식사방식": formatMealInfo(v) || "",
    "음향/악기": v.instruments || v.features?.audio || "",
    "숙소구성": v.features?.accommodation || "",
    "한줄평": v.highlight || ""
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);

  // --- 열 너비(Col Widths) 자동 조절 로직 추가 ---
  // 헤더와 데이터 중 가장 긴 길이를 찾아 적용합니다.
  const objectMaxLength: { wch: number }[] = [];

  // 1. 헤더 길이 측정
  const headers = Object.keys(wsData[0]);
  headers.forEach((key, index) => {
    objectMaxLength[index] = { wch: key.length + 10 }; // 기본 너비 확보
  });

  // 2. 데이터 행 순회하며 최대 길이 갱신
  wsData.forEach((row: any) => {
    headers.forEach((key, index) => {
      const value = row[key] ? row[key].toString() : "";
      // 한글은 보통 2바이트를 차지하므로 단순 length보다 조금 더 여유를 줍니다.
      const columnWidth = value.split('').reduce((acc: number, char: string) => {
        return acc + (char.charCodeAt(0) > 127 ? 2.2 : 1.1);
      }, 0);

      if (objectMaxLength[index].wch < columnWidth) {
        objectMaxLength[index].wch = columnWidth + 2; // 여백 추가
      }
    });
  });

  ws['!cols'] = objectMaxLength; // 계산된 너비 적용

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "장소비교");

  // 파일 저장
  XLSX.writeFile(wb, `수련회_비교분석_${eventDate}.xlsx`);
};

/**
 * 3. PDF 다운로드
 */
// export const exportToPDF = async (element: HTMLElement | null, eventDate: string) => {
//   if (!element) return;
//   const dataUrl = await htmlToImage.toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
//   const pdf = new jsPDF('p', 'mm', 'a4');
//   const pdfWidth = pdf.internal.pageSize.getWidth();
//   pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, 0);
//   pdf.save(`수련회_비교안_${eventDate}.pdf`);
// };

export const exportToPDF = async (venues: Venue[], eventDate: string, analysis: any) => {
  if (venues.length === 0) return;

  const chunkArray = (arr: Venue[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const venueChunks = chunkArray(venues, 3);
  
  const html2canvas = (await import('html2canvas')).default;
  const pdf = new jsPDF('l', 'mm', 'a4'); // 가로형 A4 (297mm x 210mm)
  const pdfWidth = pdf.internal.pageSize.getWidth();   
  const pdfHeight = pdf.internal.pageSize.getHeight(); 

  for (let i = 0; i < venueChunks.length; i++) {
    const chunk = venueChunks[i];
    
    if (i > 0) {
      pdf.addPage('a4', 'l');
    }

    // 💡 해결책 1: 가로 너비를 1600px로 100% 고정하여 A4 종이에 여백 없이 딱 맞춥니다.
    const fixedWidth = 1600;
    
    // 💡 해결책 2: 부족한 칸은 빈 객체(null)로 채워 무조건 3열 격자 형태를 유지합니다.
    const paddedChunk = [...chunk];
    while (paddedChunk.length < 3) {
      paddedChunk.push(null as any);
    }

    const printCanvas = document.createElement('div');
    printCanvas.style.cssText = `
      position: fixed; top: -9999px; left: -9999px;
      width: ${fixedWidth}px;
      min-height: 1131px; /* A4 가로 비율(1.414)에 딱 맞춘 최소 높이로 상하좌우 풀블리드 구현 */
      padding: 80px 100px; background-color: #F2F4F6;
      font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      color: #191F28; box-sizing: border-box; display: flex; flex-direction: column;
    `;

    const getBadgeHtml = (venue: Venue) => {
      if (!venue) return `<div style="height: 32px; margin-bottom: 24px;"></div>`;
      if (analysis?.recommendedId?.toString() === venue.id?.toString()) {
        return `
          <div style="
            display: inline-block; height: 32px; line-height: 30px; text-align: center;
            background-color: #3182F6; color: #ffffff; border-radius: 10px;
            font-size: 14px; font-weight: 800; padding: 0 14px;
            box-shadow: 0 4px 12px rgba(49, 130, 246, 0.2); box-sizing: border-box;
            white-space: nowrap; margin-bottom: 24px;
          ">
            ✨ 최고 추천
          </div>
        `;
      }
      return `<div style="height: 32px; margin-bottom: 24px;"></div>`;
    };

    const pageIndicator = venueChunks.length > 1 
      ? `<span style="font-size: 26px; color: #8B95A1; font-weight: 700; margin-left: 20px;">(${i + 1}/${venueChunks.length})</span>` 
      : '';

    const tableContent = `
      <div style="margin-bottom: 50px;">
        <div style="font-size: 56px; font-weight: 900; color: #191F28; letter-spacing: -1.5px;">
          장소 선정 비교 리포트 ${pageIndicator}
        </div>
      </div>
      <div style="background-color: #ffffff; border-radius: 48px; overflow: hidden; border: 1px solid #E5E8EB; box-shadow: 0 20px 40px rgba(0,0,0,0.05); flex: 1;">
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; word-break: break-all;">
          <thead>
            <tr>
              <th style="width: 240px; padding: 60px 40px; text-align: left; border-bottom: 2px solid #F9FAFB; color: #B0B8C1; font-size: 14px; font-weight: 800; letter-spacing: 1px;">CATEGORY</th>
              ${paddedChunk.map(v => {
                if (!v) return `<th style="border-bottom: 2px solid #F9FAFB; border-left: 1px solid #F9FAFB;"></th>`;
                const displayName = v.name || v.venueName || "이름 없는 장소";
                return `
                  <th style="padding: 60px 40px; text-align: left; border-bottom: 2px solid #F9FAFB; border-left: 1px solid #F9FAFB;">
                    ${getBadgeHtml(v)}
                    <div style="font-size: 34px; font-weight: 900; color: #191F28; line-height: 1.3; letter-spacing: -0.5px;">
                      ${displayName}
                    </div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody style="font-size: 18px; font-weight: 600; color: #4E5968;">
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">위치</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5;">${v.location || v.address || "정보 없음"}</td>` : `<td style="border-left: 1px solid #F9FAFB;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">수용 인원</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB;">${v.capacity || 0}명</td>` : `<td style="border-left: 1px solid #F9FAFB;"></td>`).join('')}
            </tr>
            <tr style="background-color: #F2F8FF;">
              <td style="padding: 40px; color: #1B64DA; font-weight: 800; background-color: #E8F3FF;">예상 비용</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #D0E6FC;"><span style="font-size: 28px; font-weight: 900; color: #3182F6;">${v.priceText || (v.price ? v.price.toLocaleString() + '원' : '별도 문의')}</span></td>` : `<td style="border-left: 1px solid #D0E6FC;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">음향/악기</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5;">${v.instruments || v.features?.audio || "별도 문의"}</td>` : `<td style="border-left: 1px solid #F9FAFB;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">식사/취사</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB;">${formatMealInfo(v)}</td>` : `<td style="border-left: 1px solid #F9FAFB;"></td>`).join('')}
            </tr>
            <tr>
              <td style="padding: 40px; font-weight: 800; background-color: #F9FAFB; color: #8B95A1;">숙소 구성</td>
              ${paddedChunk.map(v => v ? `<td style="padding: 40px; border-left: 1px solid #F9FAFB; line-height: 1.5;">${v.features?.accommodation || "정보 없음"}</td>` : `<td style="border-left: 1px solid #F9FAFB;"></td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    printCanvas.innerHTML = tableContent;
    document.body.appendChild(printCanvas);

    try {
      const canvas = await html2canvas(printCanvas, {
        backgroundColor: '#F2F4F6',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // 💡 너비를 pdfWidth(297mm)로 꽉 차게 그립니다. 좌우 여백이 완벽히 사라집니다.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } finally {
      document.body.removeChild(printCanvas);
    }
  }

  pdf.save(`수련회_비교안_${eventDate}.pdf`);
};

/**
 * 4. HWP(Word) 다운로드
 */

export const exportToHWP = (venues: Venue[], eventDate: string) => {
  // 가장 하단 날짜 포맷 요구사항 반영 (2026년 00월 00일 형태)
  const displayFooterDate = "2026년 00월 00일";

  const chunkArray = (arr: Venue[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const venueChunks = chunkArray(venues, 3);
  let tablesContent = '';

  venueChunks.forEach((chunk, index) => {
    const paddedChunk = [...chunk];
    
    // 전체 장소 개수가 총 3개 이하일 때는 빈 값을 밀어넣지 않고 갯수만큼만 표시되도록 조절
    if (venues.length > 3) {
      while (paddedChunk.length < 3) {
        paddedChunk.push(null as any);
      }
    }

    // 현재 표시되는 칸 개수에 맞게 열 너비(%)를 유연하게 분할 계산 (카테고리 22% 제외 남은 78% 배분)
    const activeColumnsCount = paddedChunk.length;
    const colWidthPercent = `${78 / activeColumnsCount}%`;

    const brTag = index > 0 ? '<br>' : '';
    const pageBreakStyle = index > 0 ? 'page-break-before: always; margin-top: 5px;' : 'margin-top: 5px;';
    
    const sectionTitle = `
      <div style="font-size: 13pt; font-weight: bold; color: #4E5968; margin-bottom: 10px; font-family: 'Malgun Gothic', sans-serif; ${pageBreakStyle}">
        후보 장소 (${index + 1}/${venueChunks.length})
      </div>
    `;

    tablesContent += `
      ${brTag}
      ${sectionTitle}
      <table class="main-table" align="center" border="1" cellspacing="0" cellpadding="0" 
             style="border-collapse: collapse; width: 100%; border: 1px solid #E5E8EB; margin-bottom: 35px; table-layout: fixed;">
        <thead>
          <tr>
            <th class="category" style="padding: 15px 12px; background-color: #F9FAFB; color: #8B95A1; font-weight: bold; text-align: center; border: 1px solid #E5E8EB; width: 22%; font-size: 10.5pt;">항 목</th>
            ${paddedChunk.map(v => {
              if (!v) return `<th style="border: 1px solid #E5E8EB; background-color: #ffffff; width: ${colWidthPercent};"></th>`;
              
              const displayName = v.name || v.venueName || "이름 없는 장소";
              return `
                <th style="border: 1px solid #E5E8EB; padding: 16px 12px; background-color: #F2F4F6; color: #191F28; font-weight: bold; text-align: center; width: ${colWidthPercent}; font-size: 11pt; font-family: 'Malgun Gothic', sans-serif;">
                  ${displayName}
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody style="font-family: 'Malgun Gothic', sans-serif; font-size: 10.5pt;">
          <tr>
            <td class="category" style="padding: 15px 12px; background-color: #F9FAFB; color: #4E5968; text-align: center; border: 1px solid #E5E8EB; font-weight: bold; width: 22%;">소재지</td>
            ${paddedChunk.map(v => {
              if (!v) return `<td style="border: 1px solid #E5E8EB; background-color: #ffffff; width: ${colWidthPercent};"></td>`;
              return `<td style="border: 1px solid #E5E8EB; padding: 15px 12px; text-align: center; color: #333D4B; width: ${colWidthPercent}; font-size: 10pt;">${v.location || v.address || "정보 없음"}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td class="category" style="padding: 15px 12px; background-color: #F9FAFB; color: #4E5968; text-align: center; border: 1px solid #E5E8EB; font-weight: bold; width: 22%;">예상 비용</td>
            ${paddedChunk.map(v => {
              if (!v) return `<td style="border: 1px solid #E5E8EB; background-color: #ffffff; width: ${colWidthPercent};"></td>`;
              const priceStr = v.priceText || (v.price ? `${v.price.toLocaleString()}원` : "별도 문의");
              return `<td style="border: 1px solid #E5E8EB; padding: 15px 12px; text-align: center; color: #3182F6; font-weight: bold; font-size: 11pt; width: ${colWidthPercent};">${priceStr}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td class="category" style="padding: 15px 12px; background-color: #F9FAFB; color: #4E5968; text-align: center; border: 1px solid #E5E8EB; font-weight: bold; width: 22%;">음향 시설</td>
            ${paddedChunk.map(v => {
              if (!v) return `<td style="border: 1px solid #E5E8EB; background-color: #ffffff; width: ${colWidthPercent};"></td>`;
              return `<td style="border: 1px solid #E5E8EB; padding: 15px 12px; text-align: center; color: #333D4B; width: ${colWidthPercent}; font-size: 10pt;">${v.instruments || v.features?.audio || "정보 없음"}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td class="category" style="padding: 15px 12px; background-color: #F9FAFB; color: #4E5968; text-align: center; border: 1px solid #E5E8EB; font-weight: bold; width: 22%;">취사/식사</td>
            ${paddedChunk.map(v => {
              if (!v) return `<td style="border: 1px solid #E5E8EB; background-color: #ffffff; width: ${colWidthPercent};"></td>`;
              return `<td style="border: 1px solid #E5E8EB; padding: 15px 12px; text-align: center; color: #333D4B; width: ${colWidthPercent}; font-size: 10pt;">${formatMealInfo(v) || "정보 없음"}</td>`;
            }).join('')}
          </tr>
        </tbody>
      </table>
    `;
  });

  const documentHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 2cm 1cm; }
        body { font-family: 'Malgun Gothic', 'Dotum', sans-serif; line-height: 1.6; color: #191F28; }
        .title { text-align: center; font-size: 26pt; font-weight: bold; margin-top: 20px; margin-bottom: 20px; color: #191F28; }
        .info-section { font-size: 11.5pt; font-weight: bold; clear: both; color: #4E5968; line-height: 1.8; margin-bottom: 5px; }
        .footer { text-align: center; font-size: 14pt; font-weight: bold; color: #191F28; }
      </style>
    </head>
    <body>
      <div class="title">수련회 장소 선정 비교 보고서</div>

      <div class="info-section">
        1. 일 시 : <br>
        2. 내 용 : 수련회 장소 후보군별 제반 여건 비교 및 검토 보고의 건
      </div>
      
      ${tablesContent}

      <p>&nbsp;</p>

      <div class="footer">
        위와 같이 보고합니다.
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <span style="color: #8B95A1; font-size: 12pt; font-weight: normal;">${displayFooterDate}</span>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', documentHtml], { type: 'application/msword;charset=utf-8' });
  saveAs(blob, `수련회_장소비교_보고서_${eventDate}.hwp`);
};
