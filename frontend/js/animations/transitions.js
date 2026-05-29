/**
 * Page Transitions — SPA-style enter/exit with blur
 * GSAP 增强，CSS 降级
 */
const AnimTransitions = (() => {

  let _inited = false;

  function init() { _inited = true; }

  function enterSection(sectionEl) {
    if (!sectionEl) return;
    sectionEl.classList.remove('hidden');

    const gsap = AnimCore.gsap();
    if (!gsap) return; // CSS handles visibility

    gsap.set(sectionEl, { opacity: 0, filter: 'blur(6px)', y: 20 });
    gsap.to(sectionEl, {
      opacity: 1, filter: 'blur(0px)', y: 0,
      duration: 0.7, ease: AnimCore.EASE.outExpo,
      clearProps: 'filter,transform',
    });
  }

  function exitSection(sectionEl, callback) {
    if (!sectionEl) { if (callback) callback(); return; }

    const gsap = AnimCore.gsap();
    if (!gsap) {
      // 无 GSAP：直接隐藏 + 回调
      sectionEl.classList.add('hidden');
      if (callback) callback();
      return;
    }

    gsap.to(sectionEl, {
      opacity: 0, scale: 0.98, filter: 'blur(4px)',
      duration: 0.35, ease: AnimCore.EASE.smooth,
      onComplete: () => {
        sectionEl.classList.add('hidden');
        gsap.set(sectionEl, { clearProps: 'all' });
        if (callback) callback();
      }
    });
  }

  function swapSections(hideEl, showEl) {
    exitSection(hideEl, () => enterSection(showEl));
  }

  function destroy() { _inited = false; }

  return { init, destroy, enterSection, exitSection, swapSections };
})();
