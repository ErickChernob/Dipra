/*
 * Restores the Webflow IX2 scroll-linked and mouse-tracked interactions
 * that were lost when webflow.js was removed during decoupling. The
 * infinite-loop and simple-hover interactions are plain CSS
 * (css/animations.css); everything here needs JS because it's driven by
 * scroll progress or live cursor position - GSAP + ScrollTrigger, per the
 * project's own choice of tool for this category of animation.
 *
 * Every value below (duration/easing/offsets) is taken from the original
 * IX2 JSON embedded in js/webflow.js (see ANIMATIONS_NOTES.md for the
 * full event-by-event mapping) rather than guessed. Webflow's named
 * easings map onto GSAP's power-eases exactly (both describe the same
 * Penner curves): outQuad -> power1.out, inOutQuint -> power4.inOut.
 */
(function () {
  'use strict';

  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- IX2 "Nav scrolling" (action list a-9) ----------------------------
     PAGE_SCROLL, every page. Over the first ~100px of scroll: .navbar
     height 80px -> 65px, .nav-cover slides from its resting position
     (translateY 0) down by 100% of its own height to cover the bar. */
  function initNavScroll() {
    var navbar = document.querySelector('.navbar.w-nav');
    var cover = document.querySelector('.nav-cover');
    if (!navbar || !cover) return;

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: '+=100',
      scrub: true,
      onUpdate: function (self) {
        gsap.set(navbar, { height: gsap.utils.interpolate(80, 65, self.progress) });
        gsap.set(cover, { yPercent: gsap.utils.interpolate(0, 100, self.progress) });
      },
    });
  }

  /* ---- IX2 "Images while scrolling into view" (action list a-7) --------
     SCROLLING_IN_VIEW, class target .large-growing-images (applies
     wherever the class appears: index/quienes-somos/servicios). Child
     .growing-image.small widens from its resting 35% to 65% as its
     container scrolls through the viewport. */
  function initGrowingImages() {
    document.querySelectorAll('.large-growing-images').forEach(function (wrap) {
      var img = wrap.querySelector('.growing-image.small');
      if (!img) return;
      gsap.fromTo(
        img,
        { width: '35%' },
        {
          width: '65%',
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top 90%',
            end: 'bottom 20%',
            scrub: 1,
          },
        }
      );
    });
  }

  /* ---- IX2 "Paralax background" (action list a-34) ---------------------
     SCROLLING_IN_VIEW on the #soluciones section (index.html). Child
     .background scales 1.1 -> 1.05 and shifts y -10% -> +10% across the
     section's scroll-through range. */
  function initParallaxBackground() {
    var section = document.getElementById('soluciones');
    if (!section) return;
    var bg = section.querySelector('.background-wrapper .background');
    if (!bg) return;
    gsap.fromTo(
      bg,
      { scale: 1.1, yPercent: -10 },
      {
        scale: 1.05,
        yPercent: 10,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  }

  /* ---- IX2 "Skills scrolling" (action list a-8) -------------------------
     SCROLLING_IN_VIEW on .scrolling-text-wrapper (index.html). Child
     .scrolling-text moves y 20% -> -50% across the wrapper's
     scroll-through range - the "Soluciones enfocadas..." ticker. */
  function initSkillsScrolling() {
    var wrap = document.querySelector('.scrolling-text-wrapper');
    if (!wrap) return;
    var text = wrap.querySelector('.scrolling-text');
    if (!text) return;
    gsap.fromTo(
      text,
      { yPercent: 20 },
      {
        yPercent: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      }
    );
  }

  /* ---- IX2 "Mouse over button" (action list a-13) -----------------------
     MOUSE_MOVE on .button, continuous parameter (mouse X/Y within the
     element) rather than a plain hover state, so CSS alone can't do it:
     .button-outline shifts up to ±12px horizontally / ±6px vertically
     following the cursor's position inside the button, eased back to
     center over 500ms when the cursor leaves. */
  function initMagneticButtons() {
    document.querySelectorAll('.button').forEach(function (btn) {
      var outline = btn.querySelector('.button-outline');
      if (!outline) return;
      var setX = gsap.quickTo(outline, 'x', { duration: 0.5, ease: 'power2.out' });
      var setY = gsap.quickTo(outline, 'y', { duration: 0.5, ease: 'power2.out' });

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width; // 0..1
        var py = (e.clientY - rect.top) / rect.height; // 0..1
        setX(gsap.utils.interpolate(-12, 12, px));
        setY(gsap.utils.interpolate(-6, 6, py));
      });
      btn.addEventListener('mouseleave', function () {
        setX(0);
        setY(0);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (prefersReducedMotion) return; // respect OS-level motion preference
    initNavScroll();
    initGrowingImages();
    initParallaxBackground();
    initSkillsScrolling();
    initMagneticButtons();
    ScrollTrigger.refresh();
  });
})();
