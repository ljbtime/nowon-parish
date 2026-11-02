// 첫 화면: 오늘의 전례·오늘의 미사·미사 시간표·최근 공지·앨범
import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { liturgicalDay, readingsUrl } from './liturgy.js';
import { DEFAULT_SCHEDULE, GROUPS, DAY_NAMES, loadSchedule, rangeText, sortByTime } from './mass-data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 미사 시간표 (평일은 요일 범위를 함께 표시)
function renderMassTable(schedule) {
  const el = document.getElementById('massTable');
  if (!el) return;
  el.innerHTML = GROUPS.map(g => {
    const list = sortByTime(schedule.masses.filter(m => m.group === g.key));
    if (!list.length) return '';
    return `
    <div class="mass-row">
      <h3>${g.title}</h3>
      <ul class="mass-list">
        ${list.map(m => `
          <li>
            <span class="mass-t">${esc(m.time)}</span>
            <span class="mass-n">${esc([g.key === 'weekday' ? rangeText(m.days) : '', m.note].filter(Boolean).join(' · '))}</span>
          </li>`).join('')}
      </ul>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-mass]').forEach(e => {
    const v = schedule[e.dataset.mass];
    if (v) e.textContent = v;
  });
}

function renderToday(schedule) {
  const now = new Date();
  const day = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dateEl = document.getElementById('todayDate');
  const listEl = document.getElementById('todayMasses');
  if (!listEl) return;

  dateEl.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 ${DAY_NAMES[day]}요일`;

  const massesOn = d => sortByTime(schedule.masses.filter(m => m.days.includes(d)));
  const today = massesOn(day);
  // 아직 시작 전인 첫 미사를 '다음 미사'로 강조
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const next = today.find(m => toMin(m.time) > nowMin);

  // 토요일엔 내일 주일 미사 전체, 그 외엔 오늘 미사가 끝났을 때 내일 첫 미사 안내
  const tomorrowLine = () => {
    const d = (day + 1) % 7;
    if (d === 0) {
      return `<li class="today-tomorrow">내일 주일 미사 <strong>${massesOn(0).map(m => esc(m.time)).join(' · ')}</strong></li>`;
    }
    const first = massesOn(d)[0];
    return first
      ? `<li class="today-tomorrow">오늘 미사는 모두 끝났습니다 · 내일(${DAY_NAMES[d]}) 첫 미사 <strong>${esc(first.time)}</strong></li>`
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
      <span class="today-t">${esc(m.time)}</span>
      <span class="today-n">${esc([label, m.note].filter(Boolean).join(' · '))}</span>
      ${m === next ? '<span class="today-badge">다음 미사</span>' : ''}
    </li>`;
  }).join('') + (next && day !== 6 ? '' : tomorrowLine());
}

function renderSchedule(schedule) {
  renderMassTable(schedule);
  renderToday(schedule);
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

renderLiturgy();
renderSchedule(DEFAULT_SCHEDULE);          // 기본값으로 먼저 그리고
loadSchedule().then(renderSchedule);       // 편집자가 저장한 자료가 있으면 다시 그림
renderNotices();
renderGallery();
