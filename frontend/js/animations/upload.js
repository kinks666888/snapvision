/**
 * Upload Zone — border glow, scan animation, glass highlight on hover
 */
const AnimUpload = (() => {

  let _inited = false;
  let _particles = [];

  function init() {
    if (_inited) return;
    _inited = true;

    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const zone = document.getElementById('upload-zone');
    if (!zone) return;

    // ── Hover glass highlight track ──
    if (AnimCore.perfTier === 'high') {
      zone.addEventListener('mousemove', (e) => {
        const rect = zone.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        gsap.to(zone, {
          '--mx': x, '--my': y,
          duration: 0.4, overwrite: 'auto', ease: 'power2.out',
        });
      });
      zone.addEventListener('mouseleave', () => {
        gsap.to(zone, { '--mx': 0.5, '--my': 0.5, duration: 0.6, ease: 'power2.out' });
      });
    }

    // ── Drag over — scale pulse ──
    const origDragOver = zone.addEventListener ? null : null;
    // Hook into existing drag events via MutationObserver or override
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          if (zone.classList.contains('drag-active')) {
            gsap.to(zone, { scale: 1.015, duration: 0.4, ease: AnimCore.EASE.spring });
            gsap.to('.scan-line', { opacity: 1, duration: 0.3 });
          } else {
            gsap.to(zone, { scale: 1, duration: 0.5, ease: AnimCore.EASE.spring });
            gsap.to('.scan-line', { opacity: 0.4, duration: 0.3 });
          }
        }
      }
    });
    observer.observe(zone, { attributes: true, attributeFilter: ['class'] });

    // ── Scan line — GSAP loop instead of CSS ──
    const scanLine = zone.querySelector('.scan-line');
    if (scanLine) {
      scanLine.style.animation = 'none';
      AnimCore.register(gsap.fromTo(scanLine,
        { top: '-2px', opacity: 0 },
        { top: '100%', opacity: 0.8, duration: 2.5, repeat: -1,
          ease: 'none',
          onUpdate: function() {
            const progress = this.progress();
            if (progress < 0.1 || progress > 0.9) {
              gsap.set(scanLine, { opacity: 0 });
            } else if (progress < 0.2) {
              gsap.set(scanLine, { opacity: progress * 8 - 0.8 });
            } else if (progress > 0.8) {
              gsap.set(scanLine, { opacity: (1 - progress) * 8 });
            }
          }
        }
      ));
    }
  }

  // ── Particle loading animation ──
  function startLoadingParticles() {
    if (AnimCore.perfTier === 'low') return;
    const gsap = AnimCore.gsap();
    if (!gsap) return;

    const panel = document.getElementById('loading-state');
    if (!panel) return;

    // Create 8 floating particles
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('div');
      dot.className = 'loading-particle';
      Object.assign(dot.style, {
        position: 'absolute',
        width: '4px', height: '4px',
        borderRadius: '50%',
        background: 'var(--accent)',
        opacity: '0',
        pointerEvents: 'none',
      });
      panel.appendChild(dot);
      _particles.push(dot);

      AnimCore.register(gsap.fromTo(dot,
        {
          x: Math.random() * 200 - 100 + 200,
          y: Math.random() * 40 - 20 + 80,
          opacity: 0, scale: 0,
        },
        {
          x: '+=random(-80,80)', y: '-=random(20,60)',
          opacity: 0.8, scale: 1,
          duration: 1.5 + Math.random(),
          repeat: -1, yoyo: true,
          ease: 'sine.inOut',
          delay: Math.random() * 0.5,
        }
      ));
    }
  }

  function stopLoadingParticles() {
    _particles.forEach(el => {
      try { el.remove(); } catch(e) {}
    });
    _particles = [];
  }

  function destroy() {
    _inited = false;
    stopLoadingParticles();
  }

  return { init, destroy, startLoadingParticles, stopLoadingParticles };
})();
