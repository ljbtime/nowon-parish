// 서브페이지 헤더에 로그인/로그아웃 버튼 공통 삽입 모듈
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// header-inner 안에 auth 영역 동적 삽입
const inner = document.querySelector('.header-inner');
if (inner) {
  const authDiv = document.createElement('div');
  authDiv.className = 'header-auth';
  authDiv.id = 'headerAuth';
  authDiv.innerHTML = `
    <a href="/pages/member/login.html" class="btn-login" id="btnLoginLink">로그인</a>
    <a href="/pages/member/join.html" class="btn-join" id="btnJoinLink">회원가입</a>
    <span class="user-greeting" id="userGreeting" style="display:none"></span>
    <button class="btn-logout" id="btnLogout" style="display:none">로그아웃</button>
  `;
  // 햄버거 버튼 앞에 삽입
  const hamburger = inner.querySelector('.hamburger');
  if (hamburger) inner.insertBefore(authDiv, hamburger);
  else inner.appendChild(authDiv);
}

export function onAuthReady(callback) {
  return onAuthStateChanged(auth, callback);
}

onAuthStateChanged(auth, (user) => {
  const btnLogin  = document.getElementById('btnLoginLink');
  const btnJoin   = document.getElementById('btnJoinLink');
  const greeting  = document.getElementById('userGreeting');
  const btnLogout = document.getElementById('btnLogout');
  if (!btnLogin) return;

  if (user) {
    btnLogin.style.display  = 'none';
    btnJoin.style.display   = 'none';
    greeting.style.display  = 'inline';
    btnLogout.style.display = 'inline';
    greeting.textContent    = `✝ ${user.displayName || ''}님`;
  } else {
    btnLogin.style.display  = '';
    btnJoin.style.display   = '';
    greeting.style.display  = 'none';
    btnLogout.style.display = 'none';
  }
});

document.addEventListener('click', async (e) => {
  if (e.target.id === 'btnLogout') {
    await signOut(auth);
    window.location.reload();
  }
});
