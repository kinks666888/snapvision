/**
 * Hero — Logo float, text reveal, nav entrance
 */
const AnimHero = (() => {

  let _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;

    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const tl = gsap.timeline({ defaults: { ease: AnimCore.EASE.outExpo } });

    // Logo icon — gentle float
    const logoIcon = document.querySelector('.app-logo-icon');
    if (logoIcon) {
      AnimCore.register(gsap.to(logoIcon, {
        y: -3, duration: 3, repeat: -1, yoyo: true,
        ease: 'sine.inOut',
      }));
    }

    // Title text — fade + slide up
    tl.from('.app-logo-text h1', {
      y: 12, opacity: 0, duration: 0.7,
    }, 0);

    tl.from('.app-logo-text span', {
      y: 8, opacity: 0, duration: 0.5,
    }, 0.1);

    // Nav buttons — stagger right
    tl.from('.nav-btn', {
      x: 20, opacity: 0, duration: 0.4,
      stagger: 0.06, ease: AnimCore.EASE.outQuint,
    }, 0.2);

    // Upload terminal — fade up with scale
    tl.from('.upload-terminal', {
      y: 30, opacity: 0, scale: 0.98,
      duration: 0.7, ease: AnimCore.EASE.spring,
    }, 0.3);

    // Upload icon ring — continuous gentle pulse (GSAP version)
    const ring = document.querySelector('.upload-icon-ring');
    if (ring && AnimCore.perfTier !== 'low') {
      ring.style.animation = 'none';
      AnimCore.register(gsap.to(ring, {
        boxShadow: '0 0 0 12px rgba(10,132,255,0)',
        duration: 2.5, repeat: -1, yoyo: true,
        ease: 'sine.inOut',
      }));
    }

    AnimCore.register(tl);
  }

  function destroy() {
    _inited = false;
  }

  return { init, destroy };
})();
