// 서브페이지 본문 편집
// - [data-editable] 영역: 저장된 본문(pages/{페이지ID})이 있으면 그것을 보여 준다.
// - 편집자(관리자 포함)에게는 본문 카드 위에 편집 막대가 보인다:
//     이 페이지 수정 → 그 자리에서 편집(TinyMCE) → 저장하면 바로 게시
//     수정 이력 → 이전 버전 미리보기·되돌리기 (저장할 때마다 직전 내용이 이력에 쌓임)
// - [data-edit-link] 영역(미사 시간·연락처·사제단처럼 양식으로 고치는 자료)은 관리 화면으로 가는 버튼만 보인다.
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, addDoc, collection, query, orderBy, limit, getDocs, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs';
import { getRole, canEdit, ROLE_NAMES } from './roles.js';

const TINYMCE = 'https://cdn.jsdelivr.net/npm/tinymce@7.6.0/tinymce.min.js';
const TINYMCE_KO = 'https://cdn.jsdelivr.net/npm/tinymce-i18n@24.12.9/langs7/ko_KR.js';

const region = document.querySelector('[data-editable]');
const card = document.querySelector('.sub-content');
const m = location.pathname.match(/pages\/([^/]+)\/([^/.]+)\.html/);
const pageId = m ? `${m[1]}-${m[2]}` : null;

const clean = html => DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = ts => {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const nameOf = user => user.displayName || user.email || '편집자';

let published = region ? region.innerHTML : '';   // 지금 게시 중인 본문
let meta = null;                                  // { updatedAt, updatedByName }
let editor = null;
let bar = null;

// ── 저장된 본문 표시 ─────────────────────────────
async function loadPublished() {
  if (!region || !pageId) return;
  // 원본이 잠깐 보였다 바뀌는 깜빡임 방지 (느리면 1.5초 뒤엔 원본이라도 보여 줌)
  region.classList.add('is-loading');
  setTimeout(() => region.classList.remove('is-loading'), 1500);
  try {
    const snap = await getDoc(doc(db, 'pages', pageId));
    if (snap.exists()) {
      published = clean(snap.data().html);
      region.innerHTML = published;
      meta = snap.data();
    }
  } catch { /* 읽지 못하면 HTML 원본 그대로 */ }
  region.classList.remove('is-loading');
}

// ── 편집 막대 ───────────────────────────────────
function button(label, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `edit-btn ${cls || ''}`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function mountBar(user, role) {
  bar = document.createElement('div');
  bar.className = 'edit-bar';
  bar.innerHTML = `
    <span class="edit-bar-info">
      <strong>${ROLE_NAMES[role]} 모드</strong>
      <span class="edit-bar-meta"></span>
    </span>
    <span class="edit-bar-actions"></span>`;
  card.prepend(bar);
  renderBar(user);
}

function renderBar(user) {
  const info = bar.querySelector('.edit-bar-meta');
  info.textContent = meta?.updatedAt ? `· 최종 수정 ${fmt(meta.updatedAt)} ${meta.updatedByName || ''}` : '';
  const actions = bar.querySelector('.edit-bar-actions');
  actions.innerHTML = '';

  if (editor) {
    actions.append(
      button('취소', '', () => stopEdit(true)),
      button('저장하고 게시', 'primary', () => save(user, editor.getContent())),
    );
    return;
  }
  document.querySelectorAll('[data-edit-link]').forEach(el => {
    const a = document.createElement('a');
    a.className = 'edit-btn';
    a.href = el.dataset.editLink;
    a.textContent = `✎ ${el.dataset.editLabel || '자료 수정'}`;
    actions.append(a);
  });
  if (region && pageId) {
    actions.append(
      button('수정 이력', '', () => openHistory(user)),
      button('✎ 이 페이지 수정', 'primary', () => startEdit(user)),
    );
  }
}

// ── 편집 ────────────────────────────────────────
function loadScript(src) {
  if (window.tinymce) return Promise.resolve();
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => fail(new Error('편집기를 불러오지 못했습니다.'));
    document.head.append(s);
  });
}

async function startEdit(user) {
  try {
    await loadScript(TINYMCE);
  } catch (e) {
    alert(e.message);
    return;
  }
  region.classList.add('is-editing');
  // 도구 막대는 편집 막대 바로 아래에 항상 보이게 (커서를 넣지 않아도)
  const tools = document.createElement('div');
  tools.id = 'editTools';
  tools.className = 'edit-tools';
  bar.after(tools);
  const [ed] = await window.tinymce.init({
    target: region,
    inline: true,
    fixed_toolbar_container: '#editTools',
    toolbar_persist: true,
    license_key: 'gpl',
    language: 'ko_KR',
    language_url: TINYMCE_KO,
    menubar: false,
    plugins: 'lists link table autolink',
    toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | link table | removeformat',
    block_formats: '본문=p; 소제목=h3; 작은 제목=h4',
    valid_elements: '*[*]',        // 기존 모양(표·색 상자) 그대로 유지 — 대신 들어오는 내용은 모두 DOMPurify 로 정리
    convert_urls: false,
    link_default_target: '_blank',
    setup: ed => {
      // 붙여넣기·내용 설정 때도 정리해야 편집 중에 스크립트가 실행되지 않는다
      ed.on('BeforeSetContent', e => { e.content = clean(e.content); });
      ed.on('PastePreProcess', e => { e.content = clean(e.content); });
    },
  });
  editor = ed;
  editor.focus();
  renderBar(user);
}

function stopEdit(confirmLeave) {
  if (!editor) return;
  if (confirmLeave && editor.isDirty() && !confirm('고친 내용을 저장하지 않고 닫을까요?')) return;
  closeEditor();
  region.innerHTML = published;
  renderBar(auth.currentUser);
}

function closeEditor() {
  editor?.remove();
  editor = null;
  region.classList.remove('is-editing');
  document.getElementById('editTools')?.remove();
}

async function save(user, rawHtml) {
  const html = clean(rawHtml);
  const actions = bar.querySelectorAll('.edit-btn');
  actions.forEach(b => { b.disabled = true; });
  try {
    // 직전 게시본을 이력에 남긴 뒤 새 본문 게시
    await addDoc(collection(db, 'pages', pageId, 'revisions'), {
      html: published,
      savedAt: serverTimestamp(),
      savedBy: user.uid,
      savedByName: nameOf(user),
    });
    await setDoc(doc(db, 'pages', pageId), {
      html,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
      updatedByName: nameOf(user),
    });
    published = html;
    meta = { updatedAt: { toDate: () => new Date() }, updatedByName: nameOf(user) };
    closeEditor();
    region.innerHTML = published;
    renderBar(user);
    toast('저장되었습니다. 홈페이지에 바로 반영되었습니다.');
  } catch (e) {
    alert(`저장하지 못했습니다: ${e.message}`);
    actions.forEach(b => { b.disabled = false; });
  }
}

// ── 수정 이력 ───────────────────────────────────
function openModal(title, bodyHtml) {
  const wrap = document.createElement('div');
  wrap.className = 'edit-modal';
  wrap.innerHTML = `
    <div class="edit-modal-box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="edit-modal-head"><h3>${esc(title)}</h3><button type="button" class="edit-btn" data-close>닫기</button></div>
      <div class="edit-modal-body">${bodyHtml}</div>
    </div>`;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  return { wrap, close };
}

async function openHistory(user) {
  const { wrap, close } = openModal('수정 이력', '<p class="edit-empty">불러오는 중…</p>');
  const body = wrap.querySelector('.edit-modal-body');
  let revs = [];
  try {
    const snap = await getDocs(query(collection(db, 'pages', pageId, 'revisions'), orderBy('savedAt', 'desc'), limit(30)));
    revs = snap.docs.map(d => d.data());
  } catch (e) {
    body.innerHTML = `<p class="edit-empty">이력을 불러오지 못했습니다: ${esc(e.message)}</p>`;
    return;
  }
  if (!revs.length) {
    body.innerHTML = '<p class="edit-empty">아직 수정 이력이 없습니다. 처음 저장하면 원래 내용이 이력에 남습니다.</p>';
    return;
  }
  body.innerHTML = `
    <p class="edit-note">저장할 때마다 <strong>그 직전에 게시되어 있던 내용</strong>이 아래에 남습니다.</p>
    <ul class="rev-list">${revs.map((r, i) => `
      <li>
        <span>${esc(fmt(r.savedAt))} <em>${esc(r.savedByName)} 님이 수정하기 전 내용</em></span>
        <span><button type="button" class="edit-btn" data-view="${i}">보기</button>
        <button type="button" class="edit-btn primary" data-restore="${i}">이 버전으로 되돌리기</button></span>
      </li>`).join('')}
    </ul>
    <div class="rev-preview content-body" hidden></div>`;
  const preview = body.querySelector('.rev-preview');
  body.addEventListener('click', async e => {
    const v = e.target.dataset.view;
    const r = e.target.dataset.restore;
    if (v !== undefined) {
      preview.hidden = false;
      preview.innerHTML = clean(revs[v].html);
      preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (r !== undefined && confirm('이 버전으로 되돌릴까요? 지금 내용은 이력에 남습니다.')) {
      close();
      await save(user, revs[r].html);
    }
  });
}

// ── 알림 ────────────────────────────────────────
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'edit-toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 3000);
}

window.addEventListener('beforeunload', e => {
  if (editor?.isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

// ── 시작 ────────────────────────────────────────
const ready = loadPublished();
onAuthStateChanged(auth, async user => {
  if (!user || !card || bar) return;
  const role = await getRole(user);
  if (!canEdit(role)) return;
  await ready;
  mountBar(user, role);
});
