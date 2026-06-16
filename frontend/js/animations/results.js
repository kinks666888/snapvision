/**
 * Results — Card stagger, number rolling, chart integration
 */
const AnimResults = (() => {

  let _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;
  }

  /**
   * Stagger-in all .glass cards inside the results grid
   */
  function revealCards() {
    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const cards = document.querySelectorAll('#result-section .glass');
    if (!cards.length) return;

    gsap.set(cards, { opacity: 0, y: 24, scale: 0.97 });

    gsap.to(cards, {
      opacity: 1, y: 0, scale: 1,
      duration: 0.6,
      stagger: 0.07,
      ease: AnimCore.EASE.spring,
      clearProps: 'transform',
    });
  }

  /**
   * Animate a number from 0 to target (Apple-style counter)
   */
  function countTo(el, target, opts = {}) {
    const gsap = AnimCore.gsap();
    if (!gsap || !el) return;

    const decimals = opts.decimals ?? 2;
    const prefix = opts.prefix || '';
    const suffix = opts.suffix || '';
    const duration = opts.duration || 0.8;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration,
      ease: AnimCore.EASE.outExpo,
      onUpdate: () => {
        el.textContent = prefix + obj.val.toFixed(decimals) + suffix;
      }
    });
  }

  /**
   * Animate price change badge color pulse
   */
  function pulseBadge(el, isUp) {
    const gsap = AnimCore.gsap();
    if (!gsap || !el) return;

    gsap.fromTo(el, { scale: 1.08 }, {
      scale: 1, duration: 0.5, ease: AnimCore.EASE.spring,
      overwrite: 'auto',
    });
  }

  /**
   * Signal ring draw animation
   */
  function animateSignalRing(strength) {
    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const arc = document.getElementById('signal-arc');
    const num = document.getElementById('signal-num');
    if (!arc || !num) return;

    const circumference = 188.5;
    const targetOffset = circumference - (strength / 100) * circumference;

    const obj = { offset: circumference };
    gsap.to(obj, {
      offset: targetOffset,
      duration: 1.2,
      ease: AnimCore.EASE.outExpo,
      onUpdate: () => arc.setAttribute('stroke-dashoffset', obj.offset),
    });

    // Number counting
    countTo(num, strength, { decimals: 0, duration: 1.0 });

    // Color based on final strength
    const color = strength >= 70 ? '#32d74b' : strength >= 55 ? '#ff9f0a' : strength >= 40 ? '#8e8e93' : '#ff3b6f';
    gsap.to(arc, { attr: { stroke: color }, duration: 0.6, delay: 0.8 });
  }

  /**
   * Factor bar draw animation
   */
  function animateFactorBars() {
    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const fills = document.querySelectorAll('.factor-fill');
    fills.forEach((fill, i) => {
      const targetWidth = fill.style.width;
      fill.style.width = '0%';
      gsap.to(fill, {
        width: targetWidth,
        duration: 0.6,
        delay: 0.8 + i * 0.06,
        ease: AnimCore.EASE.outExpo,
      });
    });
  }

  function destroy() {
    _inited = false;
  }

  return { init, destroy, revealCards, countTo, pulseBadge, animateSignalRing, animateFactorBars };
})();
