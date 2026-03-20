// ===========================
// 인증 확인
// ===========================
if (!sessionStorage.getItem('adminLoggedIn')) {
  window.location.href = 'index.html';
}

// ===========================
// 유틸리티
// ===========================
const $ = id => document.getElementById(id);

function showToast(msg = '✅ 저장되었습니다') {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function saveData(key, value) {
  localStorage.setItem('nwsd_' + key, JSON.stringify(value));
}

function loadData(key, fallback = null) {
  const raw = localStorage.getItem('nwsd_' + key);
  return raw ? JSON.parse(raw) : fallback;
}

// ===========================
// 사이드바 네비게이션
// ===========================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const section = item.dataset.section;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    item.classList.add('active');
    document.getElementById('section-' + section).classList.add('active');
    $('pageTitle').textContent = item.textContent.trim();

    // 모바일: 메뉴 닫기
    document.getElementById('sidebar').classList.remove('open');
  });
});

$('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

$('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'index.html';
});

// ===========================
// ① 배너 관리
// ===========================

// 이미지 업로드 미리보기
$('bannerImageInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const src = e.target.result;
    $('bannerPreview').style.backgroundImage = `url(${src})`;
    $('bannerPreview').style.backgroundSize = 'cover';
    $('bannerPreview').style.backgroundPosition = 'center';
    $('bannerPreviewIcon').style.display = 'none';
    $('bannerPreviewText').style.display = 'none';
    // 실시간 모의 화면 반영
    $('heroMockup').style.backgroundImage = `url(${src})`;
    $('heroMockup').style.backgroundSize = 'cover';
    saveData('bannerImage', src);
  };
  reader.readAsDataURL(file);
});

$('upload-label') && $('bannerImageInput').addEventListener('click', () => {
  $('bannerImageInput').click();
});
document.querySelector('.upload-label').addEventListener('click', () => {
  $('bannerImageInput').click();
});

// 오버레이 투명도
$('overlayOpacity').addEventListener('input', function () {
  const val = parseFloat(this.value);
  $('overlayVal').textContent = Math.round(val * 100) + '%';
  $('heroMockupOverlay').style.background = `rgba(0,0,0,${val})`;
});

// 배너 텍스트 실시간 반영
function bindTextPreview(inputId, mockupId) {
  const input = $(inputId);
  const mockup = $(mockupId);
  input.addEventListener('input', () => { mockup.textContent = input.value; });
}
bindTextPreview('heroLabel', 'mockupLabel');
bindTextPreview('heroTitle', 'mockupTitle');
bindTextPreview('heroDesc', 'mockupDesc');
bindTextPreview('heroBtn1', 'mockupBtn1');
bindTextPreview('heroBtn2', 'mockupBtn2');

$('saveBannerImage').addEventListener('click', () => {
  const opacity = parseFloat($('overlayOpacity').value);
  saveData('bannerOpacity', opacity);
  showToast('✅ 배너 이미지가 저장되었습니다');
});

$('saveBannerText').addEventListener('click', () => {
  saveData('bannerText', {
    label: $('heroLabel').value,
    title: $('heroTitle').value,
    desc: $('heroDesc').value,
    btn1: $('heroBtn1').value,
    btn2: $('heroBtn2').value,
  });
  showToast('✅ 배너 텍스트가 저장되었습니다');
});

// ===========================
// ② 성당 기본 정보
// ===========================
$('saveParishContact').addEventListener('click', () => {
  saveData('parishContact', {
    name: $('parishName').value,
    diocese: $('parishDiocese').value,
    phone: $('parishPhone').value,
    fax: $('parishFax').value,
    email: $('parishEmail').value,
  });
  showToast('✅ 연락처 정보가 저장되었습니다');
});

$('saveParishLocation').addEventListener('click', () => {
  saveData('parishLocation', {
    address: $('parishAddress').value,
    subway: $('parishSubway').value,
    bus: $('parishBus').value,
    parking: $('parishParking').value,
    mapUrl: $('parishMapUrl').value,
  });
  showToast('✅ 위치 정보가 저장되었습니다');
});

$('saveAboutCards').addEventListener('click', () => {
  saveData('aboutCards', [
    { title: $('aboutCard1Title').value, desc: $('aboutCard1Desc').value },
    { title: $('aboutCard2Title').value, desc: $('aboutCard2Desc').value },
    { title: $('aboutCard3Title').value, desc: $('aboutCard3Desc').value },
  ]);
  showToast('✅ 소개 문구가 저장되었습니다');
});

// ===========================
// ③ 미사 시간 관리
// ===========================
let sundayMasses = loadData('sundayMasses', [
  { time: '06:00', note: '' },
  { time: '08:00', note: '' },
  { time: '09:30', note: '청소년' },
  { time: '11:00', note: '' },
  { time: '18:00', note: '청년' },
  { time: '20:00', note: '' },
]);

let weekdayMasses = loadData('weekdayMasses', [
  { time: '06:00', note: '' },
  { time: '10:00', note: '' },
  { time: '19:00', note: '' },
]);

function renderMassList(listId, masses) {
  const container = $(listId);
  container.innerHTML = '';
  masses.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'mass-edit-row';
    row.innerHTML = `
      <input type="time" class="time-input" value="${m.time}" data-index="${i}" data-field="time" />
      <input type="text" class="note-input" value="${m.note}" placeholder="특이사항 (청년, 청소년 등)" data-index="${i}" data-field="note" />
      <button class="btn btn-danger btn-sm" data-index="${i}">삭제</button>
    `;
    container.appendChild(row);
  });

  // 삭제 버튼
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.dataset.index);
      if (listId === 'sundayMassList') {
        sundayMasses.splice(idx, 1);
        renderMassList('sundayMassList', sundayMasses);
      } else {
        weekdayMasses.splice(idx, 1);
        renderMassList('weekdayMassList', weekdayMasses);
      }
    });
  });

  // 입력값 변경
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', function () {
      const idx = parseInt(this.dataset.index);
      const field = this.dataset.field;
      if (listId === 'sundayMassList') {
        sundayMasses[idx][field] = this.value;
      } else {
        weekdayMasses[idx][field] = this.value;
      }
    });
  });
}

renderMassList('sundayMassList', sundayMasses);
renderMassList('weekdayMassList', weekdayMasses);

$('addSundayMass').addEventListener('click', () => {
  sundayMasses.push({ time: '00:00', note: '' });
  renderMassList('sundayMassList', sundayMasses);
});

$('addWeekdayMass').addEventListener('click', () => {
  weekdayMasses.push({ time: '00:00', note: '' });
  renderMassList('weekdayMassList', weekdayMasses);
});

$('saveSundayMass').addEventListener('click', () => {
  saveData('sundayMasses', sundayMasses);
  showToast('✅ 주일 미사 시간이 저장되었습니다');
});

$('saveWeekdayMass').addEventListener('click', () => {
  saveData('weekdayMasses', weekdayMasses);
  showToast('✅ 평일 미사 시간이 저장되었습니다');
});

$('saveConfession').addEventListener('click', () => {
  saveData('confession', {
    sunday: $('confessionSunday').value,
    weekday: $('confessionWeekday').value,
  });
  showToast('✅ 고해성사 시간이 저장되었습니다');
});

// ===========================
// ④ 성당 업무 정보
// ===========================
const serviceFields = [
  { btn: 'saveBaptism', key: 'baptism', fields: ['baptismClass', 'baptismRegister', 'baptismRequirements', 'baptismNote'] },
  { btn: 'saveMarriage', key: 'marriage', fields: ['marriageApply', 'marriageRegister', 'marriagePrep', 'marriageNote'] },
  { btn: 'saveFuneral', key: 'funeral', fields: ['funeralContact', 'funeralRegister', 'funeralNote'] },
  { btn: 'saveOffice', key: 'office', fields: ['officeWeekday', 'officeWeekend', 'officeHoliday', 'officeNote'] },
];

serviceFields.forEach(({ btn, key, fields }) => {
  $(btn).addEventListener('click', () => {
    const data = {};
    fields.forEach(f => { data[f] = $(f).value; });
    saveData(key, data);
    showToast('✅ 저장되었습니다');
  });
});

// ===========================
// ⑤ 공지사항 관리
// ===========================
let notices = loadData('notices', [
  { category: '공지', title: '2024년 부활절 미사 안내', date: '2024-03-15', content: '' },
  { category: '행사', title: '본당 창립기념 행사 안내', date: '2024-03-10', content: '' },
  { category: '주보', title: '이번 주 주보 (3월 셋째 주)', date: '2024-03-17', content: '' },
]);

// 오늘 날짜 기본값
const today = new Date().toISOString().split('T')[0];
$('noticeDate').value = today;

function renderNoticeAdminList() {
  const container = $('noticeAdminList');
  if (notices.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:0.85rem;text-align:center;padding:1rem">등록된 공지사항이 없습니다.</p>';
    return;
  }
  container.innerHTML = notices.slice().reverse().map((n, i) => {
    const realIdx = notices.length - 1 - i;
    return `
      <div class="notice-admin-item">
        <span class="notice-admin-badge">${n.category}</span>
        <span class="notice-admin-title">${n.title}</span>
        <span class="notice-admin-date">${n.date}</span>
        <button class="btn btn-danger btn-sm" onclick="deleteNotice(${realIdx})">삭제</button>
      </div>
    `;
  }).join('');
}

window.deleteNotice = function(idx) {
  if (!confirm('삭제하시겠습니까?')) return;
  notices.splice(idx, 1);
  saveData('notices', notices);
  renderNoticeAdminList();
  showToast('🗑️ 삭제되었습니다');
};

$('addNotice').addEventListener('click', () => {
  const title = $('noticeTitle').value.trim();
  if (!title) { alert('제목을 입력하세요.'); return; }
  notices.push({
    category: $('noticeCategory').value,
    title,
    date: $('noticeDate').value,
    content: $('noticeContent').value,
  });
  saveData('notices', notices);
  renderNoticeAdminList();
  $('noticeTitle').value = '';
  $('noticeContent').value = '';
  $('noticeDate').value = today;
  showToast('✅ 공지사항이 등록되었습니다');
});

renderNoticeAdminList();

// ===========================
// 저장된 데이터 로드 (페이지 진입 시)
// ===========================
function loadSavedData() {
  // 배너 텍스트
  const bannerText = loadData('bannerText');
  if (bannerText) {
    $('heroLabel').value = bannerText.label || '';
    $('heroTitle').value = bannerText.title || '';
    $('heroDesc').value = bannerText.desc || '';
    $('heroBtn1').value = bannerText.btn1 || '';
    $('heroBtn2').value = bannerText.btn2 || '';
    $('mockupLabel').textContent = bannerText.label || '천주교 서울대교구 5지구장';
    $('mockupTitle').textContent = bannerText.title || '노원성당';
    $('mockupDesc').textContent = bannerText.desc || '하느님 안에서 함께하는 노원 신앙 공동체';
    $('mockupBtn1').textContent = bannerText.btn1 || '미사 시간 보기';
    $('mockupBtn2').textContent = bannerText.btn2 || '오시는 길';
  }

  // 배너 이미지
  const bannerImage = loadData('bannerImage');
  if (bannerImage) {
    $('bannerPreview').style.backgroundImage = `url(${bannerImage})`;
    $('bannerPreview').style.backgroundSize = 'cover';
    $('heroMockup').style.backgroundImage = `url(${bannerImage})`;
    $('heroMockup').style.backgroundSize = 'cover';
    $('bannerPreviewIcon').style.display = 'none';
    $('bannerPreviewText').style.display = 'none';
  }

  // 성당 연락처
  const contact = loadData('parishContact');
  if (contact) {
    $('parishName').value = contact.name || '';
    $('parishDiocese').value = contact.diocese || '';
    $('parishPhone').value = contact.phone || '';
    $('parishFax').value = contact.fax || '';
    $('parishEmail').value = contact.email || '';
  }

  // 위치 정보
  const location = loadData('parishLocation');
  if (location) {
    $('parishAddress').value = location.address || '';
    $('parishSubway').value = location.subway || '';
    $('parishBus').value = location.bus || '';
    $('parishParking').value = location.parking || '';
    $('parishMapUrl').value = location.mapUrl || '';
  }

  // 소개 카드
  const cards = loadData('aboutCards');
  if (cards) {
    $('aboutCard1Title').value = cards[0]?.title || '';
    $('aboutCard1Desc').value = cards[0]?.desc || '';
    $('aboutCard2Title').value = cards[1]?.title || '';
    $('aboutCard2Desc').value = cards[1]?.desc || '';
    $('aboutCard3Title').value = cards[2]?.title || '';
    $('aboutCard3Desc').value = cards[2]?.desc || '';
  }

  // 고해성사
  const confession = loadData('confession');
  if (confession) {
    $('confessionSunday').value = confession.sunday || '';
    $('confessionWeekday').value = confession.weekday || '';
  }

  // 업무 정보
  serviceFields.forEach(({ key, fields }) => {
    const d = loadData(key);
    if (d) fields.forEach(f => { if ($(f)) $(f).value = d[f] || ''; });
  });
}

loadSavedData();
