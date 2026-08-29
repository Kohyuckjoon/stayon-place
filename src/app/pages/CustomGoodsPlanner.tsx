import React, { useState } from 'react';

/**
 * STAYON 커스텀 굿즈 플래너 UI
 * 토스 스타일의 깔끔한 여백과 명확한 단계별 가이드를 적용했습니다.
 */

const styles = {
  container: { padding: '24px 20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh' },
  header: { fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#191f28' },
  subHeader: { fontSize: '15px', color: '#8b95a1', marginBottom: '24px' },
  
  // [수정 포인트: 빨간 테두리 표시 및 컨테이너 스타일]
  section: { backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '2px solid #ff4d4f' },
  
  label: { fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '12px', display: 'block' },
  input: { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5e5', fontSize: '16px', boxSizing: 'border-box' as const, marginBottom: '12px' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' },
  card: { padding: '12px', borderRadius: '12px', border: '1px solid #e5e5e5', textAlign: 'center' as const, fontSize: '14px' },
  
  statusContainer: { display: 'flex', justifyContent: 'space-between', marginBottom: '32px', marginTop: '16px' },
  statusNode: { flex: 1, textAlign: 'center' as const, fontSize: '11px', color: '#8b95a1' },
  
  button: { width: '100%', padding: '18px', backgroundColor: '#3182f6', color: 'white', borderRadius: '16px', fontWeight: 'bold', border: 'none', fontSize: '16px', cursor: 'pointer' }
};

export const CustomGoodsPlanner = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>커스텀 굿즈 플래너</h1>
      <p style={styles.subHeader}>수련회 인원과 일정을 연동해 합리적인 견적을 확인하세요.</p>

      {/* 단계별 상태 표시 바 */}
      <div style={styles.statusContainer}>
        {['정보연동', '디자인', '시안확정', '제작', '출고'].map((step, idx) => (
          <div key={idx} style={styles.statusNode}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3182f6', margin: '0 auto 8px' }} />
            {step}
          </div>
        ))}
      </div>

      {/* [수정 포인트: 단계별 상세 섹션 - 빨간 테두리 적용] */}
      <div style={styles.section}>
        <span style={styles.label}>STEP 1. 수련회 정보 및 수량</span>
        <input style={styles.input} defaultValue="150명 (예약 데이터 자동 연동)" disabled />
        <div style={styles.grid}>
          {['S', 'M', 'L', 'XL', '2XL', '3XL'].map((size) => (
            <div key={size} style={styles.card}>{size}</div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>STEP 2. 디자인 파일 업로드 (PDF/AI)</span>
        <button style={{ ...styles.input, backgroundColor: '#f2f4f6', color: '#4e5968', textAlign: 'left' }}>
          파일 선택 또는 드래그 앤 드롭
        </button>
        <p style={{ fontSize: '12px', color: '#ff4d4f' }}>※ 모든 서체는 아웃라인 처리가 필수입니다.</p>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>배송 방식 선택</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...styles.card, flex: 1, backgroundColor: '#eef4ff', borderColor: '#3182f6' }}>일반 배송</button>
          <button style={{ ...styles.card, flex: 1 }}>현장 직송 (추천)</button>
        </div>
      </div>

      <button style={styles.button}>견적 확인하고 주문하기</button>
      
      <div style={{ marginTop: '24px', fontSize: '12px', color: '#8b95a1', textAlign: 'center' }}>
        주문 마감: 수련회 출발 10일 전까지 확정 필요
      </div>
    </div>
  );
};
