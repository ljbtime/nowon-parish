// 헤더 스크롤 효과
window.addEventListener('scroll', () => {
  document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
});

// 모바일 햄버거 메뉴
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

hamburger.addEventListener('click', () => nav.classList.toggle('open'));

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

document.addEventListener('click', e => {
  if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
    nav.classList.remove('open');
    nav.querySelectorAll('.has-dropdown').forEach(el => el.classList.remove('open'));
  }
});

nav.querySelectorAll('.dropdown a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});
