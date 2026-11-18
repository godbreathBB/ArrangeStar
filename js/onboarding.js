/* ============================================================
 * 星垣 ArrangeStar · 首次启动引导（原生 ES6，无依赖）
 * 控制 4 页引导：滑动 / 按钮 / 入场动画 / 首次检测 / 双语
 * 暴露 window.XyOnboarding.replay() 供「重看引导」调用。
 * ============================================================ */
(() => {
  'use strict';

  const ONBOARDED_KEY = 'xingyuan_onboarded';   // 用户指定的存储键
  const LANG_KEY = 'xingyuan.lang.v1';           // 与主程序 i18n 共用
  const SWIPE_THRESHOLD = 50;                    // 滑动切换阈值（px）

  const root = document.getElementById('onboarding');
  const track = document.getElementById('obTrack');
  const dotsBox = document.getElementById('obDots');
  const skipBtn = document.getElementById('obSkip');
  const nextBtn = document.getElementById('obNext');
  const mainContent = document.getElementById('main-content');
  if (!root || !track || !dotsBox || !skipBtn || !nextBtn) return;

  const slides = Array.from(track.querySelectorAll('.ob-slide'));
  const total = slides.length;
  let currentSlide = 0;
  let isAnimating = false;

  /* ---------- 语言：与主程序保持一致 ---------- */
  const readLang = () => {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') return q;
    try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh'; }
    catch (_) { return 'zh'; }
  };
  let lang = readLang();

  const LABELS = {
    zh: { next: '下一步', start: '开始使用', skip: '跳过' },
    en: { next: 'Next', start: 'Get Started', skip: 'Skip' },
  };

  // 把每页 title/desc 的 data-zh / data-en 应用为当前语言文本
  const applyLang = () => {
    root.querySelectorAll('[data-zh][data-en]').forEach((el) => {
      const v = el.getAttribute(lang === 'en' ? 'data-en' : 'data-zh');
      if (v !== null) el.textContent = v;
    });
  };

  /* ---------- 页码指示器（注入） ---------- */
  const dots = [];
  for (let i = 0; i < total; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'ob-dot' + (i === 0 ? ' ob-dot-on' : '');
    dot.setAttribute('aria-label', `${i + 1} / ${total}`);
    dot.addEventListener('click', () => goTo(i));
    dotsBox.appendChild(dot);
    dots.push(dot);
  }

  /* ---------- 切换逻辑 ---------- */
  const triggerAnimation = (slide) => {
    // 重启 CSS 入场动画：先摘 .active 触发重排，再挂回
    slides.forEach((s) => s.classList.remove('active'));
    void slide.offsetWidth; // 强制 reflow
    slide.classList.add('active');
  };

  const updateControls = () => {
    dots.forEach((d, i) => d.classList.toggle('ob-dot-on', i === currentSlide));
    const t = LABELS[lang];
    skipBtn.textContent = t.skip;
    nextBtn.textContent = currentSlide === total - 1 ? t.start : t.next;
    nextBtn.setAttribute('aria-label', nextBtn.textContent);
  };

  const goTo = (index) => {
    if (isAnimating) return;
    const target = Math.max(0, Math.min(total - 1, index));
    if (target === currentSlide) return;
    isAnimating = true;
    currentSlide = target;
    track.classList.remove('ob-dragging');
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    updateControls();
    triggerAnimation(slides[currentSlide]);
    window.setTimeout(() => { isAnimating = false; }, 400); // 与 CSS transition 对齐
  };

  /* ---------- 结束引导 ---------- */
  const finish = () => {
    try { localStorage.setItem(ONBOARDED_KEY, 'true'); } catch (_) { /* 隐私模式忽略 */ }
    root.classList.add('ob-fade-out');
    const done = () => {
      root.classList.remove('onboarding-active');
      root.classList.add('onboarding-hidden');
      root.classList.remove('ob-fade-out');
      root.style.transform = '';
      if (mainContent) mainContent.removeAttribute('hidden');
      // 主内容由 hidden 恢复后布局尺寸变化，通知重绘（如星盘连线）
      window.dispatchEvent(new Event('resize'));
    };
    window.setTimeout(done, 450); // 与淡出 transition 对齐
  };

  /* ---------- 打开 / 初始化 ---------- */
  const open = () => {
    lang = readLang();
    applyLang();
    currentSlide = 0;
    isAnimating = false;
    track.classList.remove('ob-dragging');
    track.style.transform = 'translateX(0)';
    root.classList.remove('onboarding-hidden', 'ob-fade-out');
    root.classList.add('onboarding-active');
    document.body.classList.add('intro-open');
    updateControls();
    triggerAnimation(slides[0]);
  };

  const hasOnboarded = () => {
    try { return localStorage.getItem(ONBOARDED_KEY) === 'true'; }
    catch (_) { return false; }
  };

  /* ---------- 触摸滑动 ---------- */
  let startX = 0;
  let startY = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    dragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    track.classList.add('ob-dragging');
  };
  const onTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // 仅横向滑动跟手，纵向交给页面（touch-action: pan-y 已在 CSS）
    if (Math.abs(dx) > Math.abs(dy)) {
      const pct = (currentSlide * 100) - (dx / track.clientWidth) * 100;
      track.style.transform = `translateX(${-pct}%)`;
    }
  };
  const onTouchEnd = (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('ob-dragging');
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(currentSlide + (dx < 0 ? 1 : -1));
    } else {
      // 未达阈值：回弹到当前页
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
  };

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchmove', onTouchMove, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  root.addEventListener('touchcancel', () => {
    dragging = false;
    track.classList.remove('ob-dragging');
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }, { passive: true });

  /* ---------- 按钮 ---------- */
  skipBtn.addEventListener('click', finish);
  nextBtn.addEventListener('click', () => {
    if (currentSlide === total - 1) finish();
    else goTo(currentSlide + 1);
  });

  /* ---------- 暴露给主程序 ---------- */
  window.XyOnboarding = {
    replay: () => { open(); },
  };

  /* ---------- 首次访问判定 ---------- */
  if (hasOnboarded()) {
    root.classList.remove('onboarding-active');
    root.classList.add('onboarding-hidden');
    if (mainContent) mainContent.removeAttribute('hidden');
  } else {
    open();
  }
})();
