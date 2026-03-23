// ===========================
// 헤더 스크롤 효과
// ===========================
window.addEventListener('scroll', () => {
  document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
});

// ===========================
// 모바일 햄버거 메뉴
// ===========================
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

hamburger.addEventListener('click', () => nav.classList.toggle('open'));

// 모바일: 드롭다운 토글
nav.querySelectorAll('.has-dropdown > a').forEach(link => {
  link.addEventListener('click', function (e) {
    if (window.innerWidth <= 680) {
      e.preventDefault();
      const parent = this.parentElement;
      const isOpen = parent.classList.contains('open');
      nav.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
      if (!isOpen) parent.classList.add('open');
    }
  });
});

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', e => {
  if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
    nav.classList.remove('open');
    nav.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
  }
});

nav.querySelectorAll('.dropdown a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

// ===========================
// 부드러운 스크롤
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===========================
// 관리자 데이터 반영 (localStorage)
// ===========================
function applyAdminData() {
  const load = key => {
    const raw = localStorage.getItem('nwsd_' + key);
    return raw ? JSON.parse(raw) : null;
  };

  // 배너 이미지
  const bannerImage = load('bannerImage');
  const banner = document.querySelector('.banner');
  if (bannerImage && banner) {
    banner.style.backgroundImage = `url(${bannerImage})`;
    banner.style.backgroundSize = 'cover';
    banner.style.backgroundPosition = 'center';
  }

  // 배너 오버레이 투명도
  const opacity = load('bannerOpacity');
  const overlay = document.querySelector('.banner-overlay');
  if (opacity !== null && overlay) {
    overlay.style.background = `rgba(0,0,0,${opacity})`;
  }

  // 배너 텍스트
  const bt = load('bannerText');
  if (bt) {
    if (bt.label) document.getElementById('bannerLabel').textContent = bt.label;
    if (bt.title) document.getElementById('bannerTitle').textContent = bt.title;
    if (bt.desc)  document.getElementById('bannerDesc').textContent  = bt.desc;
  }

  // 성당 연락처
  const contact = load('parishContact');
  if (contact) {
    if (contact.phone) document.querySelectorAll('[data-phone]').forEach(el => el.textContent = contact.phone);
    if (contact.fax)   document.querySelectorAll('[data-fax]').forEach(el => el.textContent = contact.fax);
  }

  // 위치 정보
  const location = load('parishLocation');
  if (location) {
    if (location.subway)  { const el = document.getElementById('subwayInfo');  if (el) el.textContent = location.subway; }
    if (location.address) {
      const el = document.getElementById('addressInfo'); if (el) el.textContent = location.address;
      const fe = document.getElementById('footerAddress'); if (fe) fe.textContent = location.address;
    }
    if (location.mapUrl) {
      const mapEmbed = document.getElementById('mapEmbed');
      if (mapEmbed) {
        mapEmbed.innerHTML = `<iframe src="${location.mapUrl}" allowfullscreen loading="lazy"></iframe>`;
      }
    }
  }

  // 공지사항
  const notices = load('notices');
  const noticeList = document.getElementById('noticeList');
  if (notices && noticeList) {
    const badgeClass = cat => cat === '행사' ? 'event' : cat === '주보' ? 'book' : '';
    noticeList.innerHTML = notices.slice(-5).reverse().map(n => {
      const d = n.date ? n.date.replace(/-/g, '.').slice(5) : '';
      return `
        <li class="notice-row">
          <span class="notice-badge ${badgeClass(n.category)}">${n.category}</span>
          <span class="notice-title">${n.title}</span>
          <span class="notice-date">${d}</span>
        </li>`;
    }).join('');
  }

  // 주일 미사 시간
  const sunday = load('sundayMasses');
  const sundayEl = document.getElementById('sundayMassDisplay');
  if (sunday && sundayEl) {
    sundayEl.innerHTML = sunday.map(m => `
      <li>
        <span class="t">${m.time}</span>
        ${m.note ? `<span class="tag">${m.note}</span>` : ''}
      </li>`).join('');
  }

  // 평일 미사 시간
  const weekday = load('weekdayMasses');
  const weekdayEl = document.getElementById('weekdayMassDisplay');
  if (weekday && weekdayEl) {
    weekdayEl.innerHTML = weekday.map(m => `
      <li><span class="t">${m.time}</span></li>`).join('');
  }

  // 고해성사
  const confession = load('confession');
  const confEl = document.getElementById('confessionDisplay');
  if (confession && confEl) {
    const parts = [];
    if (confession.sunday)  parts.push(`주일 ${confession.sunday}`);
    if (confession.weekday) parts.push(`평일 ${confession.weekday}`);
    if (parts.length) confEl.innerHTML = `<span>고해성사</span><br>${parts.join(' · ')}`;
  }
}

applyAdminData();

// ===========================
// Firebase 연동 (배포 후 활성화)
// ===========================
/*
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
*/
