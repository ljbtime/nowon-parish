// 관리 화면 출입 확인: 관리자·편집자만 (adminOnly 면 관리자만)
// 통과하면 { user, role } 을 돌려주고, 상단의 이름·로그아웃·관리자 전용 항목을 채운다.
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getRole, canEdit, ROLE_NAMES } from './roles.js';

export function guard({ adminOnly = false } = {}) {
  return new Promise(resolve => {
    const stop = onAuthStateChanged(auth, async user => {
      stop();
      const role = user ? await getRole(user) : null;
      if (!canEdit(role)) { location.href = 'index.html'; return; }
      if (adminOnly && role !== 'admin') { location.href = 'dashboard.html'; return; }

      document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = `${user.displayName || user.email} · ${ROLE_NAMES[role]}`;
      });
      document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = role !== 'admin'; });
      document.querySelectorAll('[data-logout]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await signOut(auth);
          location.href = 'index.html';
        });
      });
      document.body.classList.remove('is-guarding');
      resolve({ user, role });
    });
  });
}
