(function () {
  'use strict';

  // 3 cards, each showing one of the feature graphics in full (contain —
  // never cropped). Same dimensions on disk, so one aspect ratio covers all.
  //
  // Placeholder filenames per language — swap these for the real localized
  // graphics whenever they're ready. Each set must have 3 entries in the
  // same order (card 1 / card 2 / card 3) so the carousel positions line up
  // when the language changes.
  var HERO_IMAGES_BY_LANG = {
    en: [
      'featuregraphic1-en.png',
      'featuregraphic12-en.png',
      'featuregraphic13-en.png'
    ],
    zu: [
      'featuregraphic1-zu.png',
      'featuregraphic12-zu.png',
      'featuregraphic13-zu.png'
    ],
    st: [
      'featuregraphic1-st.png',
      'featuregraphic12-st.png',
      'featuregraphic13-st.png'
    ]
  };

  var DEFAULT_LANG = 'en';
  var HERO_IMAGES = HERO_IMAGES_BY_LANG[DEFAULT_LANG];

  var HERO_PHOTO_RATIO = 1600 / 600; // native aspect of the feature graphics

  var THICKNESS_LAYERS = [-1.47, -0.73, 0, 0.73, 1.47];

  // Kept so we can update images in place later without rebuilding the DOM.
  var cardEls = [];
  var currentLang = DEFAULT_LANG;

  function frontFaceHTML(imgUrl) {
    return (
      '<div class="c3d-face" style="background-image:url(&#39;' + imgUrl + '&#39;);background-size:contain;background-repeat:no-repeat;background-position:center;"></div>'
    );
  }

  function buildCard(imgUrl) {
    var card = document.createElement('div');
    card.className = 'carousel3d__card';

    THICKNESS_LAYERS.forEach(function (zOffset, layerIdx) {
      var isFront = layerIdx === THICKNESS_LAYERS.length - 1;
      var isBack = layerIdx === 0;
      var layer = document.createElement('div');
      layer.className = 'carousel3d__layer';

      if (!isFront && !isBack) {
        layer.style.cssText =
          'background:#808080;border:1px solid #808080;border-radius:16px;transform:translateZ(' + zOffset + 'px);';
      } else if (isFront) {
        layer.className += ' carousel3d__layer--front';
        layer.style.cssText =
          'background:#0A1628;border:1px solid rgba(255,255,255,0.15);' +
          'border-radius:16px;transform:translateZ(' + zOffset + 'px);backface-visibility:hidden;' +
          'box-shadow:inset 0 1px 1px rgba(255,255,255,0.15);';
        layer.innerHTML = frontFaceHTML(imgUrl);
      } else {
        // back — never actually seen in a coverflow (max ~46deg turn), kept
        // as a plain dark slab so there's no gap if the tilt ever overshoots
        layer.style.cssText =
          'background:#08111f;border-radius:16px;transform:translateZ(' + zOffset + 'px) rotateY(180deg);backface-visibility:hidden;';
      }
      card.appendChild(layer);
    });

    return card;
  }

  // Swap the background image on a card's front face without touching its
  // current animation position/transform.
  function setCardImage(card, imgUrl) {
    var face = card.querySelector('.carousel3d__layer--front .c3d-face');
    if (face) face.style.backgroundImage = "url('" + imgUrl + "')";
  }

  // Public hook: call this whenever the site language changes so the
  // carousel picks up that language's image set. Falls back to English if
  // the requested language has no image set defined.
  function setLanguage(lang) {
    var images = HERO_IMAGES_BY_LANG[lang] || HERO_IMAGES_BY_LANG[DEFAULT_LANG];
    currentLang = HERO_IMAGES_BY_LANG[lang] ? lang : DEFAULT_LANG;
    cardEls.forEach(function (card, i) {
      if (images[i]) setCardImage(card, images[i]);
    });
  }

  function initCarousel(container) {
    if (!container || container.dataset.c3dInit) return;
    container.dataset.c3dInit = '1';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cardCount = HERO_IMAGES.length;

    var stage = document.createElement('div');
    stage.className = 'carousel3d';
    container.appendChild(stage);

    var viewport = document.createElement('div');
    viewport.className = 'carousel3d__viewport';
    stage.appendChild(viewport);

    cardEls = HERO_IMAGES.map(function (imgUrl) {
      var card = buildCard(imgUrl);
      viewport.appendChild(card);
      return card;
    });

    // Cards are sized off the container's height and locked to the feature
    // graphics' own aspect ratio, so "contain" shows the whole image with
    // no cropping and no letterboxing gaps. Sized noticeably larger than
    // before — the box has plenty of room, no need to shrink this far.
    var cardW = 340, cardH = 128;

    function resize() {
      var rect = container.getBoundingClientRect();
      cardH = Math.max(170, Math.min(280, rect.height * 0.68));
      cardW = cardH * HERO_PHOTO_RATIO;
      if (cardW > rect.width * 0.78) { cardW = rect.width * 0.78; cardH = cardW / HERO_PHOTO_RATIO; }
      viewport.style.width = cardW + 'px';
      viewport.style.height = cardH + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      // static fallback: show the first card centered, no motion, no listeners
      cardEls.forEach(function (card, i) {
        card.style.transform = i === 0 ? 'translateZ(0)' : 'translateZ(-400px)';
        card.style.opacity = i === 0 ? '1' : '0';
        card.style.visibility = i === 0 ? 'visible' : 'hidden';
      });
      return;
    }

    var mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    window.addEventListener('mousemove', function (e) {
      var rx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      var ry = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      mouse.targetX = Math.max(-1, Math.min(1, rx));
      mouse.targetY = Math.max(-1, Math.min(1, ry));
    });
    document.addEventListener('mouseleave', function () {
      mouse.targetX = 0;
      mouse.targetY = 0;
    });

    var progress = 0;
    var frameId = null;

    function renderLoop() {
      progress += 0.0016;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      var rect = container.getBoundingClientRect();
      var w = rect.width;

      var roundedIndex = Math.round(progress);
      var diffFromRound = progress - roundedIndex;
      var easedDiff = Math.sign(diffFromRound) * Math.pow(Math.abs(diffFromRound) * 2, 4.2) / 2;
      var virtualActiveIndex = roundedIndex + easedDiff;

      for (var i = 0; i < cardCount; i++) {
        var card = cardEls[i];

        var offset = i - virtualActiveIndex;
        var halfCount = cardCount / 2;
        while (offset > halfCount) offset -= cardCount;
        while (offset < -halfCount) offset += cardCount;

        var absOffset = Math.abs(offset);
        var sign = Math.sign(offset);

        if (absOffset > 2.0) {
          card.style.visibility = 'hidden';
          continue;
        }
        card.style.visibility = 'visible';

        var gap = 26;
        var peekAmount = -60;
        var D = 1350;

        var x = 0, z = 0, rot = 0;

        if (absOffset <= 1) {
          // center card <-> its immediate left/right neighbor
          var t1 = absOffset;
          var eT1 = t1 * t1 * (3 - 2 * t1);
          var targetX = cardW + gap;
          x = sign * (eT1 * targetX);
          z = 380 + eT1 * (170 - 380);
          rot = eT1 * 48;
        } else {
          // neighbor <-> further out of frame, mostly hidden behind it
          var t2 = Math.min(absOffset - 1, 1);
          var eT2 = t2 * t2 * (3 - 2 * t2);

          var xStart = cardW + gap;
          var zStart2 = 170;
          var rotStart2 = 48;
          var zEnd2 = -80;
          var rotEnd2 = 58;

          var sEnd2 = D / (D - zEnd2);
          var xEnd2 = (w / 2 - peekAmount) / sEnd2 - (cardW / 2);

          var currentX2 = xStart + eT2 * (xEnd2 - xStart);
          x = sign * currentX2;
          z = zStart2 + eT2 * (zEnd2 - zStart2);
          rot = rotStart2 + eT2 * (rotEnd2 - rotStart2);
        }

        var localCardRotation = -sign * rot;
        var centerFactor = Math.max(0, 1 - absOffset);

        var maxTiltY = 10, maxTiltX = 6;
        var activeTiltY = mouse.x * maxTiltY * centerFactor;
        var activeTiltX = -mouse.y * maxTiltX * centerFactor;

        var totalRotY = localCardRotation + activeTiltY;
        var totalRotX = activeTiltX;

        var dim = 1 - Math.min(0.4, absOffset * 0.3);

        card.style.zIndex = String(Math.round(z));
        card.style.opacity = String(Math.max(0, dim));
        card.style.transform =
          'translateX(' + x.toFixed(2) + 'px) translateZ(' + z.toFixed(2) + 'px) ' +
          'rotateX(' + totalRotX.toFixed(2) + 'deg) rotateY(' + totalRotY.toFixed(2) + 'deg)';
      }

      frameId = requestAnimationFrame(renderLoop);
    }

    frameId = requestAnimationFrame(renderLoop);

    // pause the loop while off-screen to save battery/CPU
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && frameId === null) {
            frameId = requestAnimationFrame(renderLoop);
          } else if (!entry.isIntersecting && frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
          }
        });
      }, { threshold: 0.05 });
      io.observe(container);
    }
  }

  function start() {
    var container = document.getElementById('heroCarousel');
    initCarousel(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Expose a small public API so the language-switcher in index.html can
  // tell the carousel to swap images.
  window.TracXYCarousel = {
    setLanguage: setLanguage,
    getLanguage: function () { return currentLang; }
  };
})();
