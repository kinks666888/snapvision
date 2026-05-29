/**
 * Background — Liquid Glass orbs + parallax
 */
const AnimBackground = (() => {

  let _inited = false;

  function init() {
    if (_inited) return;
    _inited = true;

    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const orbs = document.querySelectorAll('.bg-orb');
    if (!orbs.length) return;

    // Replace CSS keyframes with GSAP for smoother motion
    orbs.forEach((orb, i) => {
      gsap.set(orb, { clearProps: 'animation' });
    });

    // Orb 1 — slow diagonal drift
    AnimCore.register(gsap.to('.bg-orb-1', {
      x: 60, y: -40, scale: 1.08,
      duration: 18 + Math.random() * 4,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut',
    }));

    // Orb 2 — wider orbit
    AnimCore.register(gsap.to('.bg-orb-2', {
      x: -70, y: 30, scale: 1.12,
      duration: 22 + Math.random() * 4,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut',
      delay: -5,
    }));

    // Orb 3 — subtle pulse
    AnimCore.register(gsap.to('.bg-orb-3', {
      x: 40, y: -25, scale: 1.05,
      duration: 16 + Math.random() * 3,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut',
      delay: -9,
    }));

    // Parallax on mouse move (high perf only)
    if (AnimCore.perfTier === 'high') {
      document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        gsap.to('.bg-orb-1', { x: x + 60, y: y - 40, duration: 1.5, overwrite: 'auto', ease: 'power2.out' });
        gsap.to('.bg-orb-2', { x: x * -1.2 - 70, y: y * 0.8 + 30, duration: 1.8, overwrite: 'auto', ease: 'power2.out' });
        gsap.to('.bg-orb-3', { x: x * 0.6 + 40, y: y * 0.6 - 25, duration: 2.0, overwrite: 'auto', ease: 'power2.out' });
      });
    }
  }

  function destroy() {
    _inited = false;
  }

  return { init, destroy };
})();
