// 연락처·오시는 길 자료 — 모든 페이지의 data-site="키" 요소를 채운다
// 편집자가 관리 화면(admin/site.html)에서 고치면 site/contact 에 저장되고,
// 저장된 것이 없으면 HTML 에 적힌 내용이 그대로 보인다.
import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const CONTACT_FIELDS = [
  { key: 'phone',        label: '전화' },
  { key: 'fax',          label: '팩스' },
  { key: 'address',      label: '주소' },
  { key: 'oldAddress',   label: '구 주소' },
  { key: 'subway',       label: '지하철' },
  { key: 'subwayDetail', label: '지하철 설명' },
  { key: 'bus',          label: '버스 정류장' },
  { key: 'busDetail',    label: '버스 노선' },
];

export const DEFAULT_CONTACT = {
  phone: '02-933-9981',
  fax: '02-933-9986',
  address: '서울특별시 노원구 한글비석로 585',
  oldAddress: '상계8동 856번지',
  subway: '7호선 마들역 5번 출구',
  subwayDetail: '10·11단지 아파트길로 약 500m, 도보 7~8분',
  bus: '주공 11단지성당 정류장',
  busDetail: '마을버스 노원08 · 11-885',
};

export async function loadContact() {
  try {
    const snap = await getDoc(doc(db, 'site', 'contact'));
    if (snap.exists()) return { ...DEFAULT_CONTACT, ...snap.data() };
  } catch { /* 읽지 못하면 기본값 */ }
  return DEFAULT_CONTACT;
}

export function applyContact(c) {
  document.querySelectorAll('[data-site]').forEach(el => {
    const v = c[el.dataset.site];
    if (!v) return;
    el.textContent = v;
    if (el.tagName === 'A' && el.dataset.site === 'phone') el.href = `tel:${v}`;
  });
}

if (document.querySelector('[data-site]')) loadContact().then(applyContact);
