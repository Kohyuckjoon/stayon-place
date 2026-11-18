import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
// Firestore 실시간 연동 및 데이터 저장을 위한 파이어베이스 SDK 함수 임포트
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useRef } from "react";
import * as htmlToImage from 'html-to-image';
import { showAlert, showConfirm } from "../lib/dialog";

// 단일 일정 아이템 데이터 스키마
interface ScheduleItem {
    id: string;
    day: number;
    date: string; // "2026-08-14" 형태
    startTime: string;
    endTime: string;
    title: string;
    location: string;
    manager: string;
    memo?: string;
    createdAt: number;
}

// 여러 개의 수련회 일정을 관리하기 위한 상위 플래너 그룹 인터페이스 정의
interface PlannerGroup {
    id: string;
    name: string; // 예: "2026년 여름 수련회"
    startDate: string;
    endDate: string;
    schedules: ScheduleItem[];
    createdAt: number;
}

export function SmartSchedulePlanner() {
    // 캡처를 위한 Ref 생성
    const tableRef = useRef<HTMLDivElement>(null);

    // 토스스러운 스타일로 다운로드 버튼 연동
    const handleDownloadImage = async () => {
        if (tableRef.current) {
            const dataUrl = await htmlToImage.toPng(tableRef.current, { backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `schedule-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        }
    };

    // 컴포넌트 최상단 스코프에 헬퍼 함수를 배치하여, 모달(onSubmit)과 테이블(renderTableView) 양쪽 모두에서 ReferenceError가 발생하지 않도록 완벽 보장합니다.
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // 파이어베이스 세션 상태 연동을 위한 가상 로그인 여부 (테스트 시 토글 가능)
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    // 로그인된 유저별 독립된 데이터 식별 및 저장을 위한 UID 상태 추가
    const [userId, setUserId] = useState<string | null>(null);

    // 화면 전환 제어를 위한 라우팅 스테이트 ('list' | 'detail')
    const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');

    // 플래너 그룹 데이터 및 선택 상태 관리
    const [plannerGroups, setPlannerGroups] = useState<PlannerGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<PlannerGroup | null>(null);

    // 상세 플래너 내부 상태 (선택된 그룹 내에서 동작)
    const [activeDay, setActiveDay] = useState<number>(1);
    const [currentTime, setCurrentTime] = useState<string>("");
    const [viewType, setViewType] = useState<'card' | 'table'>('card');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

    // 플래너 자체 생성 모달 제어 전용
    const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [groupStartDate, setGroupStartDate] = useState<string>("2026-08-14");
    const [groupEndDate, setGroupEndDate] = useState<string>("2026-08-16");

    // 단일 일정 등록 폼 state
    const [formData, setFormData] = useState({
        title: "", startTime: "", endTime: "", location: "", manager: "", memo: "", date: "2026-08-14"
    });

    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 7; hour <= 23; hour++) {
            const hStr = String(hour).padStart(2, '0');
            options.push(`${hStr}:00`, `${hStr}:30`);
        }
        options.push("24:00");
        return options;
    };
    const timeOptions = generateTimeOptions();

    // Firestore에서 로그인된 사용자의 독립적인 새 최상위 'planners' 컬렉션 데이터를 불러오는 함수
    const loadPlannerData = async (uid: string) => {
        try {
            const db = getFirestore();
            const docRef = doc(db, "planners", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.groups) {
                    setPlannerGroups(data.groups);
                }
            }
        } catch (error) {
            console.error("플래너 데이터를 불러오는 중 오류 발생:", error);
        }
    };

    // 데이터 변경 발생 시 Firestore 최상위 'planners' 컬렉션에 동기화 백업하는 헬퍼 함수
    const saveToFirestore = async (uid: string, updatedGroups: PlannerGroup[]) => {
        try {
            const db = getFirestore();
            const docRef = doc(db, "planners", uid);
            await setDoc(docRef, { groups: updatedGroups }, { merge: true });
        } catch (error) {
            console.error("파이어베이스 데이터 저장 실패:", error);
        }
    };

    useEffect(() => {
        const auth = getAuth();
        // 파이어베이스 인증 상태 변경 감지 리스너 등록
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoggedIn(true);
                // 유저 고유 UID 바인딩 및 데이터 복원 실행Trigger
                setUserId(user.uid);
                loadPlannerData(user.uid);
            } else {
                setIsLoggedIn(false);
                setUserId(null);
                setPlannerGroups([]);
                setSelectedGroup(null);
            }
        });

        // 컴포넌트 언마운트 시 리스너 해제
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        };
        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    const isCurrentSchedule = (item: ScheduleItem) => {
        return currentTime >= item.startTime && currentTime <= item.endTime;
    };

    // 특정 플래너 그룹을 선택해 상세 타임라인으로 진입하는 핸들러
    const handleSelectGroup = (group: PlannerGroup) => {
        setSelectedGroup(group);
        if (group.startDate) {
            setFormData(prev => ({ ...prev, date: group.startDate }));
        }
        setActiveDay(1);
        setCurrentView('detail');
    };

    // 신규 플래너 문서 생성 로직 (파이어베이스 등록 연동 레이어)
    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        const newGroup: PlannerGroup = {
            id: `group_${Date.now()}`,
            name: newGroupName,
            startDate: groupStartDate,
            endDate: groupEndDate,
            schedules: [],
            createdAt: Date.now()
        };

        const updatedGroups = [newGroup, ...plannerGroups];
        setPlannerGroups(updatedGroups);

        // 최상위 컬렉션 파이어베이스 영구 저장 트리거 연동
        if (userId) {
            saveToFirestore(userId, updatedGroups);
        }

        setNewGroupName("");
        setIsGroupModalOpen(false);
        // 생성 후 즉시 해당 상세 화면으로 이동
        handleSelectGroup(newGroup);
    };

    // 플래너 그룹 자체 삭제
    const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 행 클릭 이벤트 전파 차단
        if ((await showConfirm("이 수련회 일정 플래너 전체를 삭제하시겠습니까? 내부 일정표가 모두 사라집니다."))) {
            const updatedGroups = plannerGroups.filter(g => g.id !== groupId);
            setPlannerGroups(updatedGroups);

            // 그룹 삭제 상태 파이어베이스 백엔드 즉시 클라우드 동기화
            if (userId) {
                saveToFirestore(userId, updatedGroups);
            }
        }
    };

    const openModal = (item: ScheduleItem | null = null) => {
        if (!selectedGroup) return;
        if (item) {
            setEditingItem(item);
            setFormData({ title: item.title, startTime: item.startTime, endTime: item.endTime, location: item.location, manager: item.manager, memo: item.memo || "", date: item.date });
        } else {
            setEditingItem(null);
            // 현재 활성화된 Day의 날짜를 계산하여 기본값 바인딩
            const currentDayDate = getDayDateString(selectedGroup.startDate, activeDay);
            setFormData({ title: "", startTime: "", endTime: "", location: "", manager: "", memo: "", date: currentDayDate });
        }
        setIsModalOpen(true);
    };

    // 특정 startDate 기준 Day N의 YYYY-MM-DD 구하기
    const getDayDateString = (startStr: string, dayNum: number): string => {
        try {
            const d = new Date(startStr);
            d.setDate(d.getDate() + (dayNum - 1));
            return d.toISOString().split('T')[0];
        } catch {
            return startStr;
        }
    };

    // 날짜 스트링을 "8/15" 스펙 형태로 포맷팅하는 헬퍼 함수
    const formatMonthDay = (dateStr: string) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
        }
        return dateStr;
    };

    // 총 일수 계산 (Day 1, Day 2 구분용)
    const getTotalDays = () => {
        if (!selectedGroup) return [1];
        const start = new Date(selectedGroup.startDate);
        const end = new Date(selectedGroup.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Array.from({ length: isNaN(diffDays) ? 1 : diffDays }, (_, i) => i + 1);
    };

    const handleSaveSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;

        // 선택한 인풋 Date에 맞춰 동적으로 day 순서 정렬 계산
        const start = new Date(selectedGroup.startDate);
        const current = new Date(formData.date);
        const computedDay = Math.max(1, Math.ceil((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        let updatedSchedules = [...selectedGroup.schedules];

        if (editingItem) {
            updatedSchedules = updatedSchedules.map(s => s.id === editingItem.id ? { ...s, ...formData, day: computedDay } : s);
        } else {
            updatedSchedules.push({ id: String(Date.now()), day: computedDay, ...formData, createdAt: Date.now() });
        }

        const updatedGroup = { ...selectedGroup, schedules: updatedSchedules };
        const updatedGroups = plannerGroups.map(g => g.id === selectedGroup.id ? updatedGroup : g);

        // 전체 그룹 스토어 업데이트 (수정/조회/삭제 동기화)
        setPlannerGroups(updatedGroups);
        setSelectedGroup(updatedGroup);

        // 단일 세부 일정 추가/수정 사항 파이어베이스 클라우드 실시간 동동기화
        if (userId) {
            saveToFirestore(userId, updatedGroups);
        }

        setIsModalOpen(false);
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!selectedGroup) return;
        if ((await showConfirm("이 일정을 삭제하시겠습니까?"))) {
            const updated = selectedGroup.schedules.filter(s => s.id !== id);
            const updatedGroup = { ...selectedGroup, schedules: updated };
            const updatedGroups = plannerGroups.map(g => g.id === selectedGroup.id ? updatedGroup : g);

            setPlannerGroups(updatedGroups);
            setSelectedGroup(updatedGroup);

            // 단일 일정 삭제 내용 파이어베이스 원격 데이터베이스 실시간 반영
            if (userId) {
                saveToFirestore(userId, updatedGroups);
            }

            setIsModalOpen(false);
        }
    };

    const currentSchedules = selectedGroup ? selectedGroup.schedules : [];
    const filteredSchedules = currentSchedules
        .filter((s) => s.day === activeDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // 표 형태(타임 테이블) 뷰 렌더러
    // 아래 코드로 교체하세요
    const renderTableView = () => {
        const timeSlots: string[] = [];
        for (let hour = 7; hour <= 23; hour++) {
            timeSlots.push(`${String(hour).padStart(2, "0")}:00`);
        }
        timeSlots.push("24:00");

        const daysArray = getTotalDays();
        const currentSchedules = selectedGroup ? selectedGroup.schedules : [];

        return (
            <div ref={tableRef} className="bg-white rounded-[24px] border border-[#E5E8EB] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                        <thead className="bg-[#FAFBFC] border-b border-[#E5E8EB]">
                            <tr>
                                <th className="p-5 text-[11px] font-bold text-[#8B95A1] text-center w-[100px]">시간</th>
                                {daysArray.map(d => (
                                    <th key={d} className="p-5 text-[14px] font-black text-center border-l border-[#E5E8EB]">
                                        Day {d} <span className="text-[12px] text-[#8B95A1]">({selectedGroup ? formatMonthDay(getDayDateString(selectedGroup.startDate, d)) : ''})</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E8EB]">
                            {timeSlots.map((time, timeIdx) => {
                                if (time === "24:00") return null;
                                const currentSlotMin = timeToMinutes(time);
                                const nextSlotMin = currentSlotMin + 60; // 1시간 단위

                                return (
                                    <tr key={time} className="h-[90px]">
                                        <td className="text-[12px] font-bold text-[#6B7684] bg-[#FAFBFC] text-center border-r border-[#E5E8EB]">
                                            {time}
                                        </td>
                                        {daysArray.map(d => (
                                            <td key={`${d}-${time}`} className="relative border-r border-[#E5E8EB] p-0 align-top">
                                                {/* 해당 슬롯(1시간) 안에 시작하는 일정만 필터링하여 배치 */}
                                                {currentSchedules
                                                    .filter(s => s.day === d && timeToMinutes(s.startTime) >= currentSlotMin && timeToMinutes(s.startTime) < nextSlotMin)
                                                    .map(item => {
                                                        const startMin = timeToMinutes(item.startTime);
                                                        const endMin = timeToMinutes(item.endTime);
                                                        const duration = endMin - startMin;

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => openModal(item)}
                                                                // 좌우 여백(left-1, right-1)을 통해 셀 합치기 느낌 구현
                                                                className="absolute left-[2px] right-[2px] bg-[#E8F3FF] border border-[#3182F6]/30 p-2 cursor-pointer hover:bg-[#D4E8FF] transition-all rounded-[8px] flex flex-col justify-center items-center overflow-hidden z-10"
                                                                style={{
                                                                    // 시작 지점: 슬롯 시작 시간 대비 상대 위치
                                                                    top: `${((startMin - currentSlotMin) / 60) * 100}%`,
                                                                    // 전체 높이: (지속시간 / 60분) * 100%
                                                                    height: `${(duration / 60) * 100}%`,
                                                                }}
                                                            >
                                                                <div className="font-black text-[#1b64da] text-[12px] truncate w-full text-center">
                                                                    {item.title}
                                                                </div>
                                                                <div className="text-[9px] font-bold text-[#4E5968] truncate mt-0.5">
                                                                    {item.location}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // const renderTableView = () => {
    //     const timeSlots: string[] = [];
    //     for (let hour = 7; hour <= 23; hour++) {
    //         timeSlots.push(`${String(hour).padStart(2, "0")}:00`);
    //     }
    //     timeSlots.push("24:00");

    //     const daysArray = getTotalDays();
    //     const currentSchedules = selectedGroup ? selectedGroup.schedules : [];

    //     return (
    //         /* 전체 레이아웃: 여백과 그림자 조정으로 카드 형태 강조 */
    //         <div ref={tableRef} className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_12px_40px_rgba(0,0,0,0.05)] overflow-hidden p-6">
    //             <div className="flex">
    //                 {/* 시간 열: 상단 헤더와 높이를 맞춘 고정 너비 레이아웃 */}
    //                 <div className="w-[80px] shrink-0 pt-16">
    //                     {timeSlots.slice(0, -1).map((time) => (
    //                         <div key={time} className="h-[80px] text-[12px] font-medium text-[#8B95A1] text-center">
    //                             {time}
    //                         </div>
    //                     ))}
    //                 </div>

    //                 {/* 일정 영역: Flex로 일자별 나열 */}
    //                 <div className="flex flex-1 overflow-x-auto">
    //                     {daysArray.map(d => (
    //                         <div key={d} className="flex-1 min-w-[200px] border-l border-[#F2F4F6] relative">
    //                             <div className="h-16 flex items-center justify-center font-black text-[15px] text-[#191F28]">
    //                                 Day {d} <span className="text-[12px] font-medium text-[#B0B8C1] ml-1.5">{selectedGroup ? formatMonthDay(getDayDateString(selectedGroup.startDate, d)) : ''}</span>
    //                             </div>

    //                             {/* 배경 그리드: 시간당 80px 높이의 가이드 라인 추가 */}
    //                             <div className="absolute inset-0 pt-16 z-0">
    //                                 {timeSlots.slice(0, -1).map((t) => (
    //                                     <div key={t} className="h-[80px] border-b border-[#F9FAFB] w-full" />
    //                                 ))}
    //                             </div>

    //                             {/* 일정 배치 컨테이너 */}
    //                             <div className="relative z-10 pt-16 h-full">
    //                                 {currentSchedules
    //                                     .filter(s => s.day === d)
    //                                     .map(item => {
    //                                         const startMin = timeToMinutes(item.startTime);
    //                                         const endMin = timeToMinutes(item.endTime);
    //                                         const startHourOffset = (startMin - 7 * 60); // 07:00 시작 기준
    //                                         const duration = endMin - startMin;

    //                                         return (
    //                                             <div
    //                                                 key={item.id}
    //                                                 onClick={() => openModal(item)}
    //                                                 /* 토스 스타일 아이템: 좌측 컬러바 추가 및 명조체/고딕 조화 */
    //                                                 className="absolute left-3 right-3 bg-white border border-[#E5E8EB] p-3 rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer hover:border-[#3182F6] transition-all overflow-hidden"
    //                                                 style={{
    //                                                     top: `${(startHourOffset / 60) * 80}px`,
    //                                                     height: `${(duration / 60) * 80 - 4}px`,
    //                                                 }}
    //                                             >
    //                                                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3182F6] rounded-l-[12px]" />
    //                                                 <div className="font-bold text-[#191F28] text-[13px] truncate">{item.title}</div>
    //                                                 <div className="text-[11px] text-[#6B7684] mt-0.5">{item.location}</div>
    //                                             </div>
    //                                         );
    //                                     })}
    //                             </div>
    //                         </div>
    //                     ))}
    //                 </div>
    //             </div>
    //         </div>
    //     );
    // };

    return (
        <div className="min-h-screen bg-[#FAFBFC] py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#191F28] tracking-tight">
            <div className="max-w-4xl mx-auto">
                {!isLoggedIn && (
                    // 비로그인 경고 배너를 무미건조한 노란색/회색조에서 토스 특유의 고대비 알림 카드 형태로 변경
                    <div
                        onClick={() => window.dispatchEvent(new Event("open-login-modal"))}
                        className="mb-8 bg-[#3182F6] hover:bg-[#1b64da] rounded-[24px] p-6 flex items-center justify-between gap-5 cursor-pointer shadow-[0_12px_32px_rgba(49,130,246,0.15)] transition-all duration-300 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105">
                                🔐
                            </div>
                            <div>
                                <h4 className="text-[16px] font-black text-white">
                                    로그인이 필요합니다
                                </h4>
                                <p className="text-[13px] text-white/80 font-medium mt-0.5">
                                    지금 로그인해야 소중한 수련회 일정 플래너 데이터가 실시간으로 클라우드에 영구 보관됩니다.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 text-[13px] font-black text-[#3182F6] bg-white px-4 py-2.5 rounded-xl transition-all shadow-xs">
                            <span>로그인</span>
                            <span className="text-sm">&rarr;</span>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 1️⃣ LIST VIEW: 수련회 플래너 대시보드 리스트 화면 파트 */}
                {/* ========================================================================= */}
                {currentView === 'list' && (
                    <div>
                        {/* 대시보드 메인 상단 헤더 섹션을 여백이 정돈된 미니멀 소프트 구조로 개편 */}
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-white p-8 rounded-[24px] border border-[#E5E8EB] shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                            <div>
                                <h1 className="text-[26px] font-black text-[#191F28]">수련회 일정 플래너</h1>
                                <p className="text-[14px] text-[#4E5968] font-semibold mt-1">간편하게 타임라인 리스트와 대형 시간표 스케줄러를 빌드하고 공유해보세요.</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (!isLoggedIn) {
                                        showAlert("데이터 관리를 위해 먼저 아이디로 로그인해 주세요.");
                                        return;
                                    }
                                    setIsGroupModalOpen(true);
                                }}
                                // 토스 기본 스타일의 볼드한 솔리드 블루 버튼 커스텀 디자인 변경
                                className="px-6 py-4 bg-[#3182F6] hover:bg-[#1b64da] text-white font-black text-[14px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
                            >
                                ➕ 새 플래너 생성
                            </button>
                        </div>

                        {!isLoggedIn ? (
                            <div className="py-24 px-6 text-center bg-white rounded-[24px] border border-[#E5E8EB] shadow-xs flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-2xl bg-[#FAFBFC] flex items-center justify-center text-3xl mb-4 border border-[#F2F4F6]">
                                    🗓️
                                </div>
                                <h3 className="text-[19px] font-black text-[#191F28]">안전한 보관을 위해 로그인해 주세요</h3>
                                <p className="text-[13px] text-[#6B7684] font-semibold mt-1.5 max-w-sm leading-relaxed">
                                    일정은 실시간 저장됩니다.
                                </p>
                                <button
                                    onClick={() => window.dispatchEvent(new Event("open-login-modal"))}
                                    className="mt-6 px-6 py-3.5 bg-[#3182F6] hover:bg-[#1b64da] text-white font-black text-[14px] rounded-xl transition-all shadow-md"
                                >
                                    지금 로그인하기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {plannerGroups.length > 0 ? plannerGroups.map((group) => (
                                    // 리스트 카드를 토스 리스트 스타일(우측 패딩 간격 확장, 보더 라인 슬림화)로 전면 수정
                                    <div
                                        key={group.id}
                                        onClick={() => handleSelectGroup(group)}
                                        className="bg-white rounded-[24px] p-6 border border-[#E5E8EB] hover:border-[#3182F6] shadow-xs hover:shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all cursor-pointer group flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[18px] font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors truncate">
                                                    {group.name}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-[#E8F3FF] text-[#3182F6] shrink-0">
                                                    {group.schedules.length}개 일정
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-[#6B7684] font-bold tracking-tight flex items-center gap-1">
                                                <span>📅 기간:</span>
                                                <span className="text-[#4E5968] font-black font-mono">{group.startDate}</span>
                                                <span className="text-[#B0B8C1] font-normal">~</span>
                                                <span className="text-[#4E5968] font-black font-mono">{group.endDate}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleDeleteGroup(group.id, e)}
                                                className="w-10 h-10 flex items-center justify-center text-sm text-[#8B95A1] hover:text-[#F04452] bg-[#FAFBFC] hover:bg-[#FFF0F0] rounded-xl transition-all border border-[#E5E8EB]/60 hover:border-[#F04452]/20"
                                                title="플래너 삭제"
                                            >
                                                🗑️
                                            </button>
                                            <span className="text-[#B0B8C1] font-black text-lg group-hover:translate-x-1 transition-transform duration-200 pr-1">➡️</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-24 text-center bg-white rounded-[24px] border border-[#E5E8EB] shadow-xs flex flex-col items-center justify-center">
                                        <span className="text-4xl mb-4">✨</span>
                                        <span className="font-black text-[#191F28] text-[16px]">작성된 수련회 플래너가 없습니다.</span>
                                        <span className="text-[13px] text-[#6B7684] font-semibold mt-1">처음 오셨나요? 새로운 일정 계획표를 바로 생성해 보세요.</span>
                                        <button
                                            onClick={() => setIsGroupModalOpen(true)}
                                            className="mt-5 px-5 py-3 text-[13px] bg-[#E8F3FF] text-[#3182F6] hover:bg-[#3182F6] hover:text-white rounded-xl font-black transition-all"
                                        >
                                            지금 플래너 만들기 ➕
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 2️⃣ DETAIL VIEW: 선택한 플래너 타임라인 상세 화면 파트 */}
                {/* ========================================================================= */}
                {currentView === 'detail' && selectedGroup && (
                    <div>
                        {/* 상단 네비게이션 가이드 바 */}
                        <button
                            onClick={() => setCurrentView('list')}
                            className="mb-5 inline-flex items-center gap-2 text-[13px] font-black text-[#6B7684] hover:text-[#191F28] bg-white border border-[#E5E8EB] px-4 py-2 rounded-xl shadow-2xs transition-all"
                        >
                            ⬅️ 대시보드로 돌아가기
                        </button>

                        {/* 상세 타이틀 박스 */}
                        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-8 rounded-[24px] border border-[#E5E8EB] shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                                    <h2 className="text-[24px] font-black tracking-tight text-[#191F28] truncate">
                                        {selectedGroup.name}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-[#E8F3FF] text-[#3182F6] uppercase tracking-wider">
                                        Live 원격 저장중
                                    </span>
                                </div>
                                <p className="text-[13px] text-[#6B7684] font-bold">
                                    📍 설정 기간: <span className="font-mono">{selectedGroup.startDate}</span> ~ <span className="font-mono">{selectedGroup.endDate}</span> ({getTotalDays().length}일간)
                                </p>
                            </div>

                            {/* 컨트롤 바 아키텍처 */}
                            <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                                {/* 토스 세그먼트 컨트롤 칩 레이아웃 스타일의 탭 스위치 고도화 */}
                                <div className="bg-[#F2F4F6] p-1 rounded-xl flex items-center">
                                    <button
                                        onClick={() => setViewType('card')}
                                        className={`px-4 py-2 text-[13px] font-black rounded-lg transition-all ${viewType === 'card' ? 'bg-white text-[#3182F6] shadow-xs' : 'text-[#6B7684] hover:text-[#191F28]'}`}
                                    >
                                        카드 리스트(타임라인)
                                    </button>
                                    <button
                                        onClick={() => setViewType('table')}
                                        className={`px-4 py-2 text-[13px] font-black rounded-lg transition-all ${viewType === 'table' ? 'bg-white text-[#3182F6] shadow-xs' : 'text-[#6B7684] hover:text-[#191F28]'}`}
                                    >
                                        표 형태(전체)
                                    </button>
                                </div>


                                {viewType === 'table' && (
                                    <button 
                                        onClick={handleDownloadImage} 
                                        className="text-[13px] font-black bg-[#3182F6] text-white px-5 py-3 rounded-xl hover:bg-[#1b64da] transition-all shadow-xs"
                                    >
                                        일정표 다운로드
                                    </button>
                                )}
                                {/* <button onClick = {handleDownloadImage} className="text-sm font-bold bg-[#3182F6] text-white px-4 py-2 rounded-lg">
                                    표 이미지 다운로드
                                </button> */}

                                <button
                                    onClick={() => openModal(null)}
                                    className="px-5 py-3 bg-[#191F28] hover:bg-black text-white font-black text-[13px] rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                                >
                                    ➕ 일정 추가
                                </button>
                            </div>
                        </div>

                        {/* 데이 캡슐 정렬 (카드뷰에서 작동) */}
                        {viewType === 'card' && (
                            // 일자 선택 탭 바를 동글동글하고 픽셀 밀도가 깔끔한 토스 터치 타겟 레이아웃으로 변경
                            <div className="bg-[#F2F4F6]/60 p-1 rounded-[16px] flex gap-1 mb-6 border border-[#E5E8EB]/40">
                                {getTotalDays().map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => setActiveDay(day)}
                                        className={`flex-1 py-3 text-center text-[14px] font-black rounded-[12px] transition-all ${activeDay === day ? "bg-[#191F28] text-white shadow-sm" : "text-[#6B7684] hover:bg-white/60 hover:text-[#191F28]"}`}
                                    >
                                        Day {day} <span className="text-[11px] font-bold opacity-60 font-mono">({formatMonthDay(getDayDateString(selectedGroup.startDate, day))})</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 메인 리스트 분기 스위치 */}
                        {viewType === 'card' ? (
                            // 카드뷰 타임라인 버티컬 라인 및 불렛 포인트 테두리를 슬림하고 우아하게 최적화
                            <div className="relative border-l border-[#E5E8EB] ml-3 pl-6 space-y-4">
                                {filteredSchedules.length > 0 ? filteredSchedules.map((item) => (
                                    <div key={item.id} className="relative group transition-all">
                                        <div className={`absolute left-0 top-[26px] w-2.5 h-2.5 rounded-full transform -translate-x-[31px] transition-all z-10 ${isCurrentSchedule(item) ? "bg-[#3182F6] ring-4 ring-[#3182F6]/20" : "bg-[#D1D6DB] group-hover:bg-[#8B95A1]"}`} />

                                        <div
                                            onClick={() => openModal(item)}
                                            className={`bg-white rounded-[20px] p-5 border text-left cursor-pointer transition-all ${isCurrentSchedule(item) ? "border-[#3182F6] shadow-[0_4px_16px_rgba(49,130,246,0.04)]" : "border-[#E5E8EB] hover:border-[#B0B8C1]"}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] font-black text-[#3182F6] bg-[#E8F3FF] px-2.5 py-0.5 rounded-md font-mono">{item.startTime} — {item.endTime}</span>
                                                    {isCurrentSchedule(item) && <span className="text-[10px] font-black text-white bg-[#3182F6] px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse">현재 진행중</span>}
                                                </div>
                                                <span className="text-xs font-black text-[#B0B8C1] group-hover:text-[#6B7684]">편집 &rarr;</span>
                                            </div>
                                            <h4 className="text-[16px] font-black text-[#191F28] leading-snug">{item.title}</h4>

                                            {(item.location || item.manager || item.memo) && (
                                                <div className="mt-3 pt-3 border-t border-[#F2F4F6] flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#4E5968] font-semibold">
                                                    {item.location && <span className="flex items-center gap-1 text-[#191F28]"><span className="text-[#8B95A1]">📍 장소</span> {item.location}</span>}
                                                    {item.manager && <span className="flex items-center gap-1"><span className="text-[#8B95A1]">👤 담당</span> {item.manager}</span>}
                                                    {item.memo && <span className="flex items-center gap-1 max-w-full truncate text-[#8B95A1]"><span className="font-bold">📝</span> {item.memo}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center bg-white rounded-[24px] border border-[#E5E8EB] text-[#8B95A1] font-bold text-[13px]">
                                        이 날짜에 등록된 스케줄이 아직 없습니다. 오른편 위 '일정 추가' 버튼을 눌러보세요.
                                    </div>
                                )}
                            </div>
                        ) : (
                            renderTableView()
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 3️⃣ MODAL LAYERS: 팝업 컴포넌트 아키텍처 */}
                {/* ========================================================================= */}

                {/* 팝업 1: 플래너 그룹 새 문서 생성 전용 모달 */}
                {isGroupModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                        {/* 모달 프레임을 토스의 라운디드 팝업 레이아웃 가이드에 맞추어 개편 */}
                        <div className="bg-white rounded-[28px] max-w-md w-full p-8 shadow-2xl border border-[#E5E8EB] animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[20px] font-black text-[#191F28] tracking-tight">새 플래너 만들기</h3>
                                <button onClick={() => setIsGroupModalOpen(false)} className="text-xl text-[#B0B8C1] hover:text-[#4E5968] font-light">&times;</button>
                            </div>

                            <form onSubmit={handleCreateGroup} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black text-[#4E5968] mb-1.5 uppercase tracking-wide">수련회 명칭</label>
                                    <input
                                        type="text"
                                        placeholder="예: 2026 청년부 여름수련회"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-semibold outline-none transition-all bg-[#FAFBFC] focus:bg-white"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-black text-[#4E5968] mb-1.5 uppercase tracking-wide">시작 날짜</label>
                                        <input
                                            type="date"
                                            value={groupStartDate}
                                            onChange={(e) => setGroupStartDate(e.target.value)}
                                            className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-mono outline-none transition-all bg-[#FAFBFC] focus:bg-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-[#4E5968] mb-1.5 uppercase tracking-wide">종료 날짜</label>
                                        <input
                                            type="date"
                                            value={groupEndDate}
                                            onChange={(e) => setGroupEndDate(e.target.value)}
                                            className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-mono outline-none transition-all bg-[#FAFBFC] focus:bg-white"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsGroupModalOpen(false)}
                                        className="flex-1 py-3.5 bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] font-black text-[14px] rounded-xl transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3.5 bg-[#3182F6] hover:bg-[#1b64da] text-white font-black text-[14px] rounded-xl transition-all shadow-xs"
                                    >
                                        개설하기
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 팝업 2: 단일 세부 일정 관리 폼 모달 (생성/수정 공용) */}
                {isModalOpen && selectedGroup && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                        <div className="bg-white rounded-[28px] max-w-md w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#E5E8EB] animate-in fade-in zoom-in-95 duration-200">

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[21px] font-black text-[#191F28] tracking-tight">
                                    {editingItem ? "일정 수정하기" : "새로운 일정 추가"}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB] hover:text-[#191F28] transition-all text-lg font-medium"
                                >
                                    &times;
                                </button>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();

                                    const localTimeToMinutes = (timeStr: string): number => {
                                        if (!timeStr) return 0;
                                        const [hours, minutes] = timeStr.split(':').map(Number);
                                        return hours * 60 + minutes;
                                    };

                                    // 1. 30분 단위 스냅 보정 처리 함수
                                    const snapTime = (timeStr: string) => {
                                        if (!timeStr) return "";
                                        const [h, m] = timeStr.split(":");
                                        const min = parseInt(m, 10);
                                        const snappedMin = min < 15 ? "00" : min < 45 ? "30" : "00";
                                        let hour = parseInt(h, 10);
                                        if (min >= 45) hour = (hour + 1) % 24;
                                        return `${String(hour).padStart(2, '0')}:${snappedMin}`;
                                    };

                                    const finalStartTime = snapTime(formData.startTime);
                                    const finalEndTime = snapTime(formData.endTime);

                                    const startMin = timeToMinutes(finalStartTime);
                                    const endMin = timeToMinutes(finalEndTime);

                                    // 예외 처리: 시작 시간이 종료 시간보다 늦거나 같을 경우 방어
                                    if (startMin >= endMin) {
                                        showAlert("종료 시간은 시작 시간보다 늦어야 합니다.");
                                        return;
                                    }

                                    // 2. 동일 날짜 내 시간대 중복 및 겹침 검증 로직
                                    const groupStart = new Date(selectedGroup.startDate);
                                    const formDate = new Date(formData.date);
                                    const calculatedDay = Math.floor((formDate.getTime() - groupStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                                    const isOverlapped = currentSchedules.some(s => {
                                        // 수정 중인 자기 자신의 기존 데이터는 중복 검사에서 제외
                                        if (editingItem && s.id === editingItem.id) return false;

                                        // 같은 Day인 일정들만 비교
                                        if (s.day !== calculatedDay) return false;

                                        const existingStart = timeToMinutes(s.startTime);
                                        const existingEnd = timeToMinutes(s.endTime);

                                        // 두 시간대 간의 교집합(겹침) 여부 판단 표준 공식
                                        // (새로운시작 < 기존종료) && (새로운종료 > 기존시작)
                                        return startMin < existingEnd && endMin > existingStart;
                                    });

                                    if (isOverlapped) {
                                        showAlert("선택하신 시간대에 이미 등록된 다른 일정이 존재합니다. 시간을 다시 확인해 주세요.");
                                        return;
                                    }

                                    // 검증 통과 시 보정된 최종 시간을 반영하여 저장 함수 실행
                                    formData.startTime = finalStartTime;
                                    formData.endTime = finalEndTime;
                                    handleSaveSchedule(e);
                                }}
                                className="space-y-5"
                            >
                                {/* 1. 일정 제목 섹션 */}
                                <div>
                                    <label className="block text-[12px] font-bold text-[#4E5968] mb-2 tracking-wide">일정 제목</label>
                                    <input
                                        type="text"
                                        placeholder="예: 조별 아이스브레이킹 및 오리엔테이션"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[15px] font-semibold outline-none transition-all bg-[#FAFBFC] focus:bg-white placeholder-[#B0B8C1]"
                                        required
                                    />
                                </div>

                                {/* 2. 활동 일자 섹션 */}
                                <div>
                                    <label className="block text-[12px] font-bold text-[#4E5968] mb-2 tracking-wide">활동 일자</label>
                                    <input
                                        type="date"
                                        min={selectedGroup.startDate}
                                        max={selectedGroup.endDate}
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[15px] font-medium font-mono outline-none transition-all bg-[#FAFBFC] focus:bg-white text-[#191F28]"
                                        required
                                    />
                                </div>

                                {/* 3. 시간 설정 세그먼트 */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[12px] font-bold text-[#4E5968] tracking-wide">시간 설정</label>
                                        <span className="text-[11px] text-[#3182F6] font-semibold">🔴 30분 단위만 선택 가능합니다</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <select
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[15px] text-center font-bold font-mono outline-none transition-all bg-[#FAFBFC] focus:bg-white text-[#191F28] appearance-none cursor-pointer"
                                                required
                                            >
                                                {timeOptions.slice(0, -1).map(t => (
                                                    <option key={`start-${t}`} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <span className="text-[#B0B8C1] font-medium px-1">부터</span>
                                        <div className="flex-1 relative">
                                            <select
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[15px] text-center font-bold font-mono outline-none transition-all bg-[#FAFBFC] focus:bg-white text-[#191F28] appearance-none cursor-pointer"
                                                required
                                            >
                                                {timeOptions.map(t => (
                                                    <option key={`end-${t}`} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. 장소 및 담당자 섹션 */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[12px] font-bold text-[#4E5968] mb-2 tracking-wide">장소 <span className="text-[#B0B8C1] font-normal">(선택)</span></label>
                                        <input
                                            type="text"
                                            placeholder="예: 본당 2층"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-semibold outline-none transition-all bg-[#FAFBFC] focus:bg-white placeholder-[#B0B8C1]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-bold text-[#4E5968] mb-2 tracking-wide">담당자 <span className="text-[#B0B8C1] font-normal">(선택)</span></label>
                                        <input
                                            type="text"
                                            placeholder="예: 홍길동"
                                            value={formData.manager}
                                            onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                            className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-semibold outline-none transition-all bg-[#FAFBFC] focus:bg-white placeholder-[#B0B8C1]"
                                        />
                                    </div>
                                </div>

                                {/* 5. 상세 메모 섹션 */}
                                <div>
                                    <label className="block text-[12px] font-bold text-[#4E5968] mb-2 tracking-wide">상세 메모 또는 준비물 <span className="text-[#B0B8C1] font-normal">(선택)</span></label>
                                    <textarea
                                        rows={3}
                                        placeholder="필요한 공지나 지참해야 할 준비물 내역을 입력하세요."
                                        value={formData.memo}
                                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                        className="w-full px-4 py-3.5 border border-[#E5E8EB] focus:border-[#3182F6] rounded-xl text-[14px] font-semibold outline-none transition-all bg-[#FAFBFC] focus:bg-white resize-none placeholder-[#B0B8C1] leading-relaxed"
                                    />
                                </div>

                                {/* 6. 하단 액션 버튼 그룹 */}
                                <div className="pt-4 flex gap-3 items-center">
                                    {editingItem && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSchedule(editingItem.id)}
                                            className="px-4 py-4 bg-[#FFF0F0] hover:bg-[#FFE0E0] text-[#F04452] font-black text-[14px] rounded-xl transition-all shrink-0"
                                        >
                                            삭제
                                        </button>
                                    )}

                                    <div className="flex gap-2 flex-1 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 sm:flex-none px-5 py-4 bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#4E5968] font-black text-[14px] rounded-xl transition-all"
                                        >
                                            닫기
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-4 bg-[#3182F6] hover:bg-[#1b64da] text-white font-black text-[14px] rounded-xl transition-all shadow-xs"
                                        >
                                            {editingItem ? "변경 저장" : "일정 등록 완료"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
