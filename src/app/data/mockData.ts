// mockData.ts

export interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
  image: string;
  price: number; // 전체 대관 총 견적 기준
  verified: boolean;
  denomination: string;
  facilities: string[];
  distance: string; // 에러 원인이었던 누락 필드 추가
  description: string;
  amenities: {
    worship: {
      hallSize: string;
      sound: string;
      instruments: string;
      projector: string;
    };
    accommodation: {
      maleRooms: number;
      femaleRooms: number;
      roomCapacity: string;
      bedding: string;
    };
    dining: {
      cafeteriaCapacity: number;
      selfCooking: boolean;
      nearbyRestaurants: string;
    };
  };
  reviews: {
    church: string;
    rating: number;
    comment: string;
    date: string;
  }[];
  checklistItems: string[];
}

export const mockVenues: Venue[] = [
  {
    id: 1,
    name: "은혜산 수양관",
    location: "강원도 평창군",
    capacity: 200,
    image: "https://images.unsplash.com/photo-1774516534143-8e6406a2df45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZXRyZWF0JTIwY2VudGVyJTIwbW91bnRhaW5zfGVufDF8fHx8MTc3NDUzMjk3NXww&ixlib=rb-4.1.0&q=80&w=1080",
    price: 2500000,
    verified: true,
    denomination: "예장통합",
    facilities: ["wifi", "음향", "식당", "에어컨", "주차장"],
    distance: "도보 5분 거리 계곡",
    description: "평창의 아름다운 자연 속에 위치한 수양관으로 200명 수용 가능한 대강당과 쾌적한 숙소를 갖추고 있습니다.",
    amenities: {
      worship: {
        hallSize: "300평",
        sound: "디지털 믹서, 무선 마이크 4개",
        instruments: "드럼, 건반, 앰프 완비",
        projector: "4K 프로젝터 2대",
      },
      accommodation: {
        maleRooms: 15,
        femaleRooms: 15,
        roomCapacity: "6-8인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 250,
        selfCooking: false,
        nearbyRestaurants: "차량 10분 거리 식당가",
      },
    },
    reviews: [
      {
        church: "서울중앙교회",
        rating: 5,
        comment: "음향 시설이 훌륭해서 찬양하기 정말 좋았습니다.",
        date: "2026-03-15",
      },
    ],
    checklistItems: [
      "수건 미제공 - 개인 준비 필요",
      "겨울철 난방 최소 2시간 전 요청",
    ],
  },
  {
    id: 2,
    name: "믿음의 집",
    location: "경기도 가평군",
    capacity: 120,
    image: "https://images.unsplash.com/photo-1762967022036-d9a86874183a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHVyY2glMjB3b3JzaGlwJTIwaGFsbCUyMGludGVyaW9yfGVufDF8fHx8MTc3NDUzMjk3NXww&ixlib=rb-4.1.0&q=80&w=1080",
    price: 1800000,
    verified: true,
    denomination: "기독교대한감리회",
    facilities: ["wifi", "음향", "주방", "세탁실"],
    distance: "차량 5분 거리 강",
    description: "가평의 조용한 환경에서 집중적인 영적 훈련이 가능한 중소형 수양관입니다.",
    amenities: {
      worship: {
        hallSize: "150평",
        sound: "아날로그 믹서, 유선 마이크 3개",
        instruments: "드럼, 건반",
        projector: "빔프로젝터 1대",
      },
      accommodation: {
        maleRooms: 10,
        femaleRooms: 10,
        roomCapacity: "4-6인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 150,
        selfCooking: true,
        nearbyRestaurants: "도보 15분 거리 식당",
      },
    },
    reviews: [
      {
        church: "열린교회",
        rating: 4,
        comment: "규모는 작지만 깔끔하고 기도하기 좋은 환경입니다.",
        date: "2026-03-01",
      },
    ],
    checklistItems: [
      "직접 취사 가능 - 주방기구 완비",
      "세탁실 사용 가능",
    ],
  },
  {
    id: 3,
    name: "평화 기도원",
    location: "충청남도 천안시",
    capacity: 80,
    image: "https://images.unsplash.com/photo-1763410723546-db98ef034af5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmF5ZXIlMjByb29tJTIwcGVhY2VmdWx8ZW58MXx8fHwxNzc0NTMyOTc2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 1000000,
    verified: false,
    denomination: "예장합동",
    facilities: ["음향", "식당", "주차장"],
    distance: "차량 5분 거리 상가동",
    description: "소규모 교회를 위한 아담한 기도원으로 조용한 분위기가 특징입니다.",
    amenities: {
      worship: {
        hallSize: "80평",
        sound: "기본 음향 장비",
        instruments: "건반만 보유",
        projector: "빔프로젝터 1대",
      },
      accommodation: {
        maleRooms: 6,
        femaleRooms: 6,
        roomCapacity: "6-8인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 100,
        selfCooking: false,
        nearbyRestaurants: "차량 5분 거리",
      },
    },
    reviews: [
      {
        church: "새생명교회",
        rating: 4,
        comment: "소규모 교회에 적합한 곳입니다.",
        date: "2026-02-10",
      },
    ],
    checklistItems: [
      "드럼 미보유 - 필요시 개인 준비",
      "WiFi 미제공",
    ],
  },
  {
    id: 4,
    name: "갈릴리 수련원",
    location: "경상북도 문경시",
    capacity: 150,
    image: "https://images.unsplash.com/photo-1768141919912-d20b8f4119fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJldHJlYXQlMjBsYW5kc2NhcGUlMjBrb3JlYXxlbnwxfHx8fDE3NzQ1MzI5NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 2100000,
    verified: true,
    denomination: "예장고신",
    facilities: ["wifi", "음향", "식당", "에어컨", "운동장"],
    distance: "도보 10분 거리 등산로",
    description: "문경의 아름다운 산속에 위치한 수련원으로 운동장과 체육 시설을 갖추고 있습니다.",
    amenities: {
      worship: {
        hallSize: "200평",
        sound: "디지털 믹서, 무선 마이크 4개",
        instruments: "드럼, 건반, 베이스 앰프",
        projector: "4K 프로젝터 1대",
      },
      accommodation: {
        maleRooms: 12,
        femaleRooms: 12,
        roomCapacity: "6-8인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 180,
        selfCooking: true,
        nearbyRestaurants: "차량 15분 거리",
      },
    },
    reviews: [
      {
        church: "청년교회",
        rating: 5,
        comment: "운동장이 있어서 레크리에이션 하기 좋았어요.",
        date: "2026-03-10",
      },
    ],
    checklistItems: [
      "운동장 사용 가능 - 축구, 족구 가능",
      "직접 취사 가능",
    ],
  },
  {
    id: 5,
    name: "시온산 집회소",
    location: "전라북도 전주시",
    capacity: 100,
    image: "https://images.unsplash.com/photo-1764471444363-e6dc0f9773bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mZXJlbmNlJTIwaGFsbCUyMGF1ZGl0b3JpdW18ZW58MXx8fHwxNzc0NTMyOTc2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 1400000,
    verified: true,
    denomination: "기독교대한하나님의성회",
    facilities: ["wifi", "음향", "식당", "에어컨"],
    distance: "도보 5분 거리 시내 상권",
    description: "전주 시내에 위치하여 접근성이 좋은 집회소입니다.",
    amenities: {
      worship: {
        hallSize: "120평",
        sound: "디지털 믹서, 무선 마이크 3개",
        instruments: "드럼, 건반",
        projector: "빔프로젝터 1대",
      },
      accommodation: {
        maleRooms: 8,
        femaleRooms: 8,
        roomCapacity: "6인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 120,
        selfCooking: false,
        nearbyRestaurants: "도보 5분 거리 다수",
      },
    },
    reviews: [
      {
        church: "부흥교회",
        rating: 4,
        comment: "시내 접근성이 좋아서 편리했습니다.",
        date: "2026-02-28",
      },
    ],
    checklistItems: [
      "시내 위치 - 대중교통 편리",
      "주차 공간 제한적",
    ],
  },
  {
    id: 6,
    name: "새순 수양관",
    location: "제주특별자치도 서귀포시",
    capacity: 180,
    image: "https://images.unsplash.com/photo-1549881567-c622c1080d78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRyZWF0JTIwZG9ybWl0b3J5JTIwcm9vbXN8ZW58MXx8fHwxNzc0NTMyOTc2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    price: 3200000,
    verified: true,
    denomination: "예장통합",
    facilities: ["wifi", "음향", "식당", "에어컨", "바다 전망"],
    distance: "도보 3분 거리 바다",
    description: "제주 서귀포의 아름다운 바다가 보이는 특별한 수양관입니다.",
    amenities: {
      worship: {
        hallSize: "250평",
        sound: "디지털 믹서, 무선 마이크 6개",
        instruments: "드럼, 건반, 베이스 앰프, 기타 앰프",
        projector: "4K 프로젝터 2대",
      },
      accommodation: {
        maleRooms: 14,
        femaleRooms: 14,
        roomCapacity: "6-8인실",
        bedding: "침구류 제공",
      },
      dining: {
        cafeteriaCapacity: 200,
        selfCooking: false,
        nearbyRestaurants: "차량 10분 거리",
      },
    },
    reviews: [
      {
        church: "온누리교회",
        rating: 5,
        comment: "바다 전망이 정말 아름답고 시설도 최고입니다.",
        date: "2026-03-20",
      },
    ],
    checklistItems: [
      "바다 수영 가능 (여름철)",
      "관광 프로그램 연계 가능",
    ],
  },
];

export const refundPolicy = [
  {
    period: "답사 후 3일 내",
    rate: "100%",
    note: "답사 결과가 불만족스러울 경우 보호",
  },
  {
    period: "행사 30일 전",
    rate: "100%",
    note: "-",
  },
  {
    period: "행사 21일 전",
    rate: "70%",
    note: "대체 장소를 찾을 수 있는 최소 기한",
  },
  {
    period: "행사 14일 전",
    rate: "50%",
    note: "-",
  },
  {
    period: "행사 7일 전",
    rate: "20%",
    note: "관리비 및 청소 준비금 공제",
  },
  {
    period: "행사 3일 전~당일",
    rate: "0%",
    note: "노쇼(No-show) 방지",
  },
];