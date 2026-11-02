// 첫 화면: 오늘의 전례·오늘의 미사·미사 시간표·최근 공지·앨범
import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { liturgicalDay, readingsUrl } from './liturgy.js';

// ===========================
// 미사 시간 (pages/info/mass.html 기준) — 시간표와 '오늘의 미사'가 함께 사용
// days: 0=일 … 6=토
// ===========================
const MASSES = [
  { group: 'sunday',   time: '06:00', days: [0] },
  { group: 'sunday',   time: '08:00', days: [0] },
  { group: 'sunday',   time: '09:30', days: [0], note: '중고등부' },
  { group: 'sunday',   time: '11:00', days: [0], note: '교중미사' },
  { group: 'sunday',   time: '18:00', days: [0], note: '청년' },
  { group: 'sunday',   time: '20:00', days: [0] },
  { group: 'saturday', time: '15:00', days: [6], note: '초등부 · 소성당' },
  { group: 'saturday', time: '19:00', days: [6] },
  { group: 'weekday',  time: '06:00', days: [1, 2, 3, 4, 5], range: '월~금' },
  { group: 'weekday',  time: '10:00', days: [2, 3, 4, 5, 6], range: '화~토' },
  { group: 'weekday',  time: '19:00', days: [2, 3, 4, 5],    range: '화~금' },
];

const GROUPS = [
  { key: 'sunday',   title: '주일 미사' },
  { key: 'saturday', title: '토요 특전미사' },
  { key: 'weekday',  title: '평일 미사' },
];

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderMassTable() {
  const el = document.getElementById('massTable');
  if (!el) return;
  el.innerHTML = GROUPS.map(g => `
    <div class="mass-row">
      <h3>${g.title}</h3>
      <ul class="mass-list">
        ${MASSES.filter(m => m.group === g.key).map(m => `
          <li>
            <span class="mass-t">${m.time}</span>
            <span class="mass-n">${[m.range, m.note].filter(Boolean).join(' · ')}</span>
          </li>`).join('')}
      </ul>
    </div>`).join('');
}

function renderToday() {
  const now = new Date();
  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dateEl = document.getElementById('todayDate');
  const listEl = document.getElementById('todayMasses');
  if (!listEl) return;

  dateEl.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAY_NAMES[day]}요일`;

  const massesOn = d => MASSES.filter(m => m.days.includes(d))
    .sort((a, b) => a.time.localeCompare(b.time));
  const today = massesOn(day);
  // 아직 시작 전인 첫 미사를 '다음 미사'로 강조
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const next = today.find(m => toMin(m.time) > nowMin);

  // 토요일엔 내일 주일 미사 전체, 그 외엔 오늘 미사가 끝났을 때 내일 첫 미사 안내
  const tomorrowLine = () => {
    const d = (day + 1) % 7;
    if (d === 0) {
      return `<li class="today-tomorrow">내일 주일 미사 <strong>${massesOn(0).map(m => m.time).join(' · ')}</strong></li>`;
    }
    const first = massesOn(d)[0];
    return first
      ? `<li class="today-tomorrow">오늘 미사는 모두 끝났습니다 · 내일(${DAY_NAMES[d]}) 첫 미사 <strong>${first.time}</strong></li>`
      : '';
  };

  if (!today.length) {
    listEl.innerHTML = '<li class="today-none">오늘은 미사가 없습니다.</li>' + tomorrowLine();
    return;
  }
  listEl.innerHTML = today.map(m => {
    const past = toMin(m.time) <= nowMin;
    const cls = m === next ? 'is-next' : past ? 'is-past' : '';
    const label = day === 6 && m.group === 'saturday' ? '특전' : '';
    return `<li class="${cls}">
      <span class="today-t">${m.time}</span>
      <span class="today-n">${[label, m.note].filter(Boolean).join(' · ')}</span>
      ${m === next ? '<span class="today-badge">다음 미사</span>' : ''}
    </li>`;
  }).join('') + (next && day !== 6 ? '' : tomorrowLine());
}

// 오늘의 전례: 전례일 이름·전례색, 굿뉴스 매일미사 연결
function renderLiturgy() {
  const now = new Date();
  const lit = liturgicalDay(now);
  document.getElementById('today')?.setAttribute('data-lit', lit.color);
  document.getElementById('litName').textContent = lit.name;
  document.getElementById('litMeta').textContent =
    [lit.note, `전례색 ${lit.colorName}`, `${lit.season} 시기`].filter(Boolean).join(' · ');
  document.getElementById('readingsLink').href = readingsUrl(now);
}

async function renderNotices() {
  const el = document.getElementById('homeNotices');
  if (!el) return;
  try {
    const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(5)));
    if (snap.empty) {
      el.innerHTML = '<li class="news-empty">등록된 공지가 없습니다.</li>';
      return;
    }
    el.innerHTML = snap.docs.map(d => {
      const n = d.data();
      const t = n.createdAt?.toDate ? n.createdAt.toDate() : null;
      const date = t ? `${String(t.getMonth() + 1).padStart(2, '0')}.${String(t.getDate()).padStart(2, '0')}` : '';
      const cat = n.category ? `<span class="news-cat${n.category === '행사' ? ' event' : ''}">${esc(n.category)}</span>` : '';
      return `<li><a href="pages/board/view.html?type=notice&id=${encodeURIComponent(d.id)}">
        ${cat}<span class="news-title">${esc(n.title)}</span><span class="news-date">${date}</span>
      </a></li>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<li class="news-empty">공지를 불러오지 못했습니다. <a href="pages/board/notice.html">공지사항 보기</a></li>';
  }
}

// 갤러리: gallery 컬렉션 최근 6장 (필드: imageUrl, title, createdAt)
async function renderGallery() {
  const el = document.getElementById('homeGallery');
  if (!el) return;
  const empty = '<p class="album-empty">본당 행사 사진이 이곳에 소개됩니다.</p>';
  try {
    const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(6)));
    const items = snap.docs.map(d => d.data()).filter(g => /^https:\/\//.test(g.imageUrl || ''));
    el.innerHTML = items.length
      ? items.map(g => `
          <a class="album-item" href="pages/dataroom/photo.html">
            <img src="${esc(g.imageUrl)}" alt="${esc(g.title)}" loading="lazy">
            ${g.title ? `<span>${esc(g.title)}</span>` : ''}
          </a>`).join('')
      : empty;
  } catch (e) {
    el.innerHTML = empty;
  }
}

renderMassTable();
renderLiturgy();
renderToday();
renderNotices();
renderGallery();
