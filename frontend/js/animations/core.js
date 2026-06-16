/**
 * SnapVision Animation Core
 * GSAP orchestration, performance detection, lifecycle management
 */
const AnimCore = (() => {

  const tweens = [];
  let _ready = false;
  let _perfTier = 'high'; // 'high' | 'mid' | 'low'

  // ── Performance detection ──
  function detectPerfTier() {
    const mem = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Mobi|Android/.test(navigator.userAgent);
    const dpr = window.devicePixelRatio || 1;

    if (isMobile && mem < 4) return 'low';
    if (isMobile || cores < 4 || mem < 8) return 'mid';
    return 'high';
  }

  function init() {
    if (_ready) return;
    _perfTier = detectPerfTier();
    document.documentElement.setAttribute('data-perf', _perfTier);
    _ready = true;
    window.addEventListener('resize', onResize);
  }

  function destroy() {
    tweens.forEach(t => { try { t.kill(); } catch(e) {} });
    tweens.length = 0;
    window.removeEventListener('resize', onResize);
    _ready = false;
  }

  let _resizeTimer;
  function onResize() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      if (window._onAnimResize) window._onAnimResize();
    }, 200);
  }

  function register(tween) {
    tweens.push(tween);
    return tween;
  }

  // ── Professional easing presets ──
  const EASE = {
    spring:   'cubic-bezier(0.22, 0.61, 0.36, 1)',
    outExpo:  'expo.out',
    outQuint: 'power3.out',
    inOutQuint:'power3.inOut',
    smooth:   'power2.out',
  };

  // ── Safe GSAP check ──
  function gsap() {
    return window.gsap || null;
  }

  return { init, destroy, register, EASE, gsap,
    get perfTier() { return _perfTier; },
    get ready() { return _ready; } };
})();
