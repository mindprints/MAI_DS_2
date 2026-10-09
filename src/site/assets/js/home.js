// Home page interactions: entry screen (language + appearance), the
// clients marquee, and reveal-on-scroll — all respecting reduced motion.
// The stylesheet keeps everything visible when JS is absent (html.no-js).
(function () {
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Entry screen -------------------------------------------------
  // Shown by the pre-paint head snippet (html[data-entry="show"]) until
  // both the language and the appearance have been chosen; the choices
  // persist in localStorage and the veil fades away.
  var LANG_KEY = 'mai-lang';
  var THEME_KEY = 'mai-theme';
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var veil = document.getElementById('entry-veil');
  if (veil && document.documentElement.getAttribute('data-entry') === 'show') {
    var pageLang = document.documentElement.lang === 'sv' ? 'sv' : 'en';
    var chosen = { lang: storeGet(LANG_KEY), theme: storeGet(THEME_KEY) };

    function markGroup(groupId, matchAttr, value) {
      var group = document.getElementById(groupId);
      if (!group) return;
      group.classList.add('is-set');
      group.querySelectorAll('.entry-opt').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute(matchAttr) === value ? 'true' : 'false');
      });
    }

    function dismiss() {
      veil.classList.add('entry-leave');
      setTimeout(function () {
        veil.remove();
        document.documentElement.removeAttribute('data-entry');
      }, 550);
    }

    function maybeDone(delay) {
      if (chosen.lang && chosen.theme) setTimeout(dismiss, delay || 0);
    }

    // Prefill whichever half was already chosen on an earlier page
    if (chosen.lang) markGroup('entry-lang', 'data-lang', chosen.lang);
    if (chosen.theme) markGroup('entry-theme', 'data-theme-choice', chosen.theme);

    veil.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang');
        chosen.lang = lang;
        storeSet(LANG_KEY, lang);
        markGroup('entry-lang', 'data-lang', lang);
        if (lang !== pageLang) {
          // Take them to the chosen language right away; the entry screen
          // continues there if the appearance is still unchosen.
          window.location.href = lang === 'sv' ? 'sv/index.html' : '../index.html';
          return;
        }
        maybeDone(350);
      });
    });

    veil.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-theme-choice');
        chosen.theme = theme;
        storeSet(THEME_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
        markGroup('entry-theme', 'data-theme-choice', theme);
        maybeDone(350);
      });
    });

    var skip = document.getElementById('entry-skip');
    if (skip) {
      skip.addEventListener('click', function () {
        if (!chosen.lang) { chosen.lang = pageLang; storeSet(LANG_KEY, pageLang); }
        if (!chosen.theme) { chosen.theme = 'dark'; storeSet(THEME_KEY, 'dark'); }
        dismiss();
      });
    }

    var firstOpen = veil.querySelector('.entry-group:not(.is-set) .entry-opt');
    if (firstOpen) firstOpen.focus({ preventScroll: true });
  }

  // The header EN/SV links also remember the language choice
  document.querySelectorAll('.lang-toggle a[lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      storeSet(LANG_KEY, a.getAttribute('lang'));
    });
  });

  // ---- Header appearance toggle -------------------------------------
  // Mirrors (and updates) the entry-screen choice.
  var modeButtons = document.querySelectorAll('.mode-toggle [data-set-theme]');
  function syncModeToggle() {
    var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    modeButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-theme') === current ? 'true' : 'false');
    });
  }
  modeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var theme = b.getAttribute('data-set-theme');
      document.documentElement.setAttribute('data-theme', theme);
      storeSet(THEME_KEY, theme);
      syncModeToggle();
    });
  });
  if (modeButtons.length) syncModeToggle();

  // ---- Scroll progress hairline -------------------------------------
  var progress = document.querySelector('.scroll-progress');
  if (progress) {
    var progressQueued = false;
    var paintProgress = function () {
      progressQueued = false;
      var doc = document.documentElement;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      progress.style.transform = 'scaleX(' + Math.min(1, (window.scrollY || 0) / max) + ')';
    };
    window.addEventListener('scroll', function () {
      if (!progressQueued) { progressQueued = true; requestAnimationFrame(paintProgress); }
    }, { passive: true });
    paintProgress();
  }

  // ---- Collection artwork: advances as you scroll --------------------
  // The build still injects the slide of the day; scrolling then walks
  // through the whole collection, one crossfade per ~420px travelled.
  // Skipped under reduced motion (the day's image simply stays).
  var art = document.querySelector('.artwork-frame .daily-artwork');
  if (art && !prefersReducedMotion && window.fetch) {
    var srcMatch = (art.getAttribute('src') || '').match(/^(.*\/slide\/)(.+)$/);
    if (srcMatch) {
      fetch(srcMatch[1] + 'slides.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (slides) {
          if (!slides) return;
          var entries = slides.filter(function (s) { return s && s.filename; });
          if (entries.length < 2) return;
          var idx = entries.findIndex(function (s) { return s.filename === srcMatch[2]; });
          if (idx < 0) idx = 0;

          // Double-buffer inside the frame for seamless crossfades
          var stack = document.createElement('div');
          stack.className = 'artwork-stack';
          art.parentNode.insertBefore(stack, art);
          stack.appendChild(art);
          var top = art.cloneNode(false);
          top.removeAttribute('loading');
          top.alt = '';
          top.setAttribute('aria-hidden', 'true');
          top.classList.remove('is-showing');
          stack.appendChild(top);

          var busy = false;
          function advance() {
            if (busy) return;
            busy = true;
            idx = (idx + 1) % entries.length;
            var slide = entries[idx];
            var next = srcMatch[1] + slide.filename;
            var pre = new Image();
            pre.onload = function () {
              top.src = next;
              top.classList.add('is-showing');
              setTimeout(function () {
                art.src = next;
                art.alt = slide.title || 'Museum of AI';
                top.classList.remove('is-showing');
                setTimeout(function () { busy = false; }, 100);
              }, 600);
            };
            pre.onerror = function () { busy = false; };
            pre.src = next;
          }

          var travelled = 0;
          var lastY = window.scrollY || 0;
          window.addEventListener('scroll', function () {
            var y = window.scrollY || 0;
            travelled += Math.abs(y - lastY);
            lastY = y;
            if (travelled >= 420) { travelled = 0; advance(); }
          }, { passive: true });
        })
        .catch(function () {});
    }
  }

  // ---- Clients & Partners marquee -----------------------------------
  // Duplicate the track once so the CSS animation loops seamlessly.
  // Skipped under reduced motion, where the row stays statically
  // scrollable instead.
  var track = document.querySelector('.logo-track');
  if (track && !prefersReducedMotion) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    track.parentElement.classList.add('is-cloned');
  }

  var items = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
  );
  items.forEach(function (el) { observer.observe(el); });
})();
