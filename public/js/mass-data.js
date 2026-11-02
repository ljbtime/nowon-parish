// 미사 시간 자료 — 첫 화면(오늘의 미사·시간표)과 미사 안내 페이지가 함께 사용
// 편집자가 관리 화면(admin/site.html)에서 고치면 site/massSchedule 에 저장되고,
// 저장된 것이 없으면 아래 기본값을 쓴다.
import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// days: 0=일 … 6=토
export const DEFAULT_SCHEDULE = {
  masses: [
    { group: 'sunday',   time: '06:00', days: [0], place: '대성당', note: '' },
    { group: 'sunday',   time: '08:00', days: [0], place: '대성당', note: '' },
    { group: 'sunday',   time: '09:30', days: [0], place: '대성당', note: '중고등부' },
    { group: 'sunday',   time: '11:00', days: [0], place: '대성당', note: '교중미사' },
    { group: 'sunday',   time: '18:00', days: [0], place: '대성당', note: '청년' },
    { group: 'sunday',   time: '20:00', days: [0], place: '대성당', note: '' },
    { group: 'saturday', time: '15:00', days: [6], place: '소성당', note: '초등부' },
    { group: 'saturday', time: '19:00', days: [6], place: '대성당', note: '' },
    { group: 'weekday',  time: '06:00', days: [1, 2, 3, 4, 5], place: '', note: '' },
    { group: 'weekday',  time: '10:00', days: [2, 3, 4, 5, 6], place: '', note: '' },
    { group: 'weekday',  time: '19:00', days: [2, 3, 4, 5],    place: '', note: '' },
  ],
  confession: '미사 20분 전 (주일 30분 전)',
  holyHour: '매월 첫째 목요일 19:30 대성당',
};

export const GROUPS = [
  { key: 'sunday',   title: '주일 미사',     long: '주일미사 (일요일)',     days: [0] },
  { key: 'saturday', title: '토요 특전미사', long: '토요특전미사 (토요일)', days: [6] },
  { key: 'weekday',  title: '평일 미사',     long: '평일미사',              days: null },
];

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export async function loadSchedule() {
  try {
    const snap = await getDoc(doc(db, 'site', 'massSchedule'));
    const data = snap.exists() ? snap.data() : null;
    if (data && Array.isArray(data.masses) && data.masses.length) return { ...DEFAULT_SCHEDULE, ...data };
  } catch { /* 읽지 못하면 기본값 */ }
  return DEFAULT_SCHEDULE;
}

// [1,2,3,4,5] → '월~금' (long: '월요일 ~ 금요일'), 띄엄띄엄이면 '월·수·금'
export function rangeText(days, long = false) {
  const d = [...days].sort((a, b) => a - b);
  if (!d.length) return '';
  const name = i => DAY_NAMES[i] + (long ? '요일' : '');
  const consecutive = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  if (d.length === 1) return name(d[0]);
  if (consecutive && d.length >= 3) return long ? `${name(d[0])} ~ ${name(d.at(-1))}` : `${name(d[0])}~${name(d.at(-1))}`;
  return d.map(name).join('·');
}

export const sortByTime = list => [...list].sort((a, b) => a.time.localeCompare(b.time));
