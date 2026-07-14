/*
 * Custom vanilla-JS replacement for Webflow's runtime (js/webflow.js + jQuery).
 * Reproduces, for this specific site, only the behaviors that were actually
 * load-bearing: the mobile nav toggle, the (unlinked) testimonial slider on
 * detail_projects.html, and a safe no-op guard on the contact form (which has
 * no working backend now that Webflow's form processing is out of scope).
 * See MIGRATION_NOTES.md for the full rationale.
 */
(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  function initNavbars() {
    var navbars = document.querySelectorAll('.navbar.w-nav');
    navbars.forEach(function (navbar) {
      var button = navbar.querySelector('.menu-button.w-nav-button');
      var menu = navbar.querySelector('.mobile-nav-menu.w-nav-menu');
      if (!button || !menu) return;

      var duration = parseInt(navbar.getAttribute('data-duration'), 10);
      if (isNaN(duration)) duration = 400;
      var easing = navbar.getAttribute('data-easing') || 'ease';

      menu.style.overflow = 'hidden';
      menu.style.transition = 'max-height ' + duration + 'ms ' + easing;
      menu.style.maxHeight = '0px';
      menu.setAttribute('aria-hidden', 'true');
      button.setAttribute('role', 'button');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('tabindex', '0');

      var isOpen = false;

      function openMenu() {
        isOpen = true;
        menu.style.display = 'block';
        var target = menu.scrollHeight;
        /* force layout so the transition runs from 0 -> target */
        requestAnimationFrame(function () {
          menu.style.maxHeight = target + 'px';
        });
        button.classList.add('w--open');
        button.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
      }

      function closeMenu() {
        isOpen = false;
        menu.style.maxHeight = '0px';
        button.classList.remove('w--open');
        button.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      }

      function toggleMenu() {
        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      }

      button.addEventListener('click', toggleMenu);
      button.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMenu();
        }
      });

      menu.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'max-height' && !isOpen) {
          menu.style.display = '';
        }
      });

      /* Close the menu after choosing a link, and if the viewport is
         resized back up past the collapse breakpoint. */
      menu.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          if (isOpen) closeMenu();
        });
      });

      window.addEventListener('resize', function () {
        if (isOpen && window.innerWidth > 991) {
          closeMenu();
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) closeMenu();
      });
    });
  }

  /* ---------- Contact form (no working backend, see MIGRATION_NOTES.md) --- */
  function initForms() {
    var forms = document.querySelectorAll('.form-block.w-form form');
    forms.forEach(function (form) {
      var wrapper = form.closest('.form-block.w-form');
      var failMessage = wrapper ? wrapper.querySelector('.error-message.w-form-fail') : null;

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (failMessage) {
          failMessage.style.display = 'block';
        }
      });
    });
  }

  /* ---------- Generic slider (used by the unlinked detail_projects.html) -- */
  function initSliders() {
    var sliders = document.querySelectorAll('.w-slider');
    sliders.forEach(function (slider) {
      var mask = slider.querySelector('.w-slider-mask');
      if (!mask) return;
      var slides = Array.prototype.slice.call(mask.children).filter(function (el) {
        return el.classList.contains('w-slide');
      });
      if (slides.length < 2) return;

      /* .w-slider-mask is itself the overflow:hidden viewport, so it must
         stay put; the slides need their own inner track to translate,
         which Webflow's own markup doesn't include. Create one at runtime
         and move the existing slides into it (no visual change with JS
         off: they'd stay direct children of the mask, first slide shown). */
      var track = document.createElement('div');
      track.className = 'slider-track';
      track.style.whiteSpace = 'nowrap';
      slides.forEach(function (slide) {
        track.appendChild(slide);
      });
      mask.appendChild(track);

      var nav = slider.querySelector('.w-slider-nav');
      var prevArrow = slider.querySelector('.w-slider-arrow-left');
      var nextArrow = slider.querySelector('.w-slider-arrow-right');
      [prevArrow, nextArrow].forEach(function (arrow, i) {
        if (!arrow) return;
        arrow.setAttribute('role', 'button');
        arrow.setAttribute('tabindex', '0');
        arrow.setAttribute('aria-label', i === 0 ? 'Anterior' : 'Siguiente');
        arrow.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            arrow.click();
          }
        });
      });
      var infinite = slider.getAttribute('data-infinite') !== 'false';
      var duration = parseInt(slider.getAttribute('data-duration'), 10);
      if (isNaN(duration)) duration = 400;

      track.style.transition = 'transform ' + duration + 'ms ease';
      var current = 0;

      var dots = [];
      if (nav) {
        nav.innerHTML = '';
        slides.forEach(function (_, i) {
          var dot = document.createElement('div');
          dot.className = 'w-slider-dot';
          dot.setAttribute('role', 'button');
          dot.setAttribute('tabindex', '0');
          dot.setAttribute('aria-label', 'Slide ' + (i + 1));
          dot.addEventListener('click', function () {
            goTo(i);
          });
          nav.appendChild(dot);
          dots.push(dot);
        });
      }

      function render() {
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        dots.forEach(function (dot, i) {
          dot.classList.toggle('w-active', i === current);
        });
      }

      function goTo(index) {
        if (infinite) {
          current = (index + slides.length) % slides.length;
        } else {
          current = Math.min(Math.max(index, 0), slides.length - 1);
        }
        render();
      }

      if (prevArrow) prevArrow.addEventListener('click', function () { goTo(current - 1); });
      if (nextArrow) nextArrow.addEventListener('click', function () { goTo(current + 1); });

      render();
    });
  }

  /* ---- Restored IX2 "Nav link left/right on hover" (a-29/a-30/a-31/a-32) -
     .nav-link.left and .nav-link.right each have a sibling .nav-link-line
     between them; hovering either slides that shared line toward it and
     shrinks it to 50% width. Plain CSS can't reach a *preceding* sibling,
     so this small class toggle does the targeting - the actual animation
     is entirely CSS (see css/animations.css). */
  function initNavLinkHover() {
    document.querySelectorAll('.nav-menu-items').forEach(function (group) {
      var left = group.querySelector('.nav-link.left');
      var right = group.querySelector('.nav-link.right');
      var line = group.querySelector('.nav-link-line');
      if (!line) return;

      function hoverIn(cls) {
        line.style.transitionDuration = '.5s';
        line.classList.add(cls);
      }
      function hoverOut(cls) {
        line.style.transitionDuration = '';
        line.classList.remove(cls);
      }

      if (left) {
        left.addEventListener('mouseenter', function () { hoverIn('ix2-hover-left'); });
        left.addEventListener('mouseleave', function () { hoverOut('ix2-hover-left'); });
      }
      if (right) {
        right.addEventListener('mouseenter', function () { hoverIn('ix2-hover-right'); });
        right.addEventListener('mouseleave', function () { hoverOut('ix2-hover-right'); });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavbars();
    initForms();
    initSliders();
    initNavLinkHover();
  });
})();
