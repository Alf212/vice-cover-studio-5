/* Vice Cover Studio — canvas composition engine.
   Draws a multi-panel GTA-style poster from the visitor's own photos:
   panel layouts, per-panel colour casts, a poster-wide grade, keylines,
   and bold caption lettering in a heavy system-font stack (Impact /
   Arial Black) with gradient fill, dark outline and a hard shadow.
   No webfont and no network: everything is a local file or a data the
   visitor's own machine produced. */
(function () {
  'use strict';

  var HEADLINE_FONT = 'Impact, "Arial Black", "Franklin Gothic Heavy", Arial, sans-serif';

  var canvas = document.getElementById('poster');
  var ctx = canvas.getContext('2d');

  var els = {
    input: document.getElementById('photoInput'),
    drop: document.getElementById('dropZone'),
    strip: document.getElementById('photoStrip'),
    layouts: document.getElementById('layoutPicker'),
    fill: document.getElementById('fillMode'),
    zoom: document.getElementById('zoomRange'),
    zoomLabel: document.getElementById('zoomLabel'),
    center: document.getElementById('centerBtn'),
    headline: document.getElementById('headlineInput'),
    subline: document.getElementById('sublineInput'),
    captionPos: document.getElementById('captionPos'),
    grade: document.getElementById('gradeSelect'),
    size: document.getElementById('sizeSelect'),
    exportBtn: document.getElementById('exportBtn')
  };

  /* Panel layouts as fractions of the poster; a gutter is carved out of
     each cell when the rectangles are made concrete. */
  var LAYOUTS = {
    duo: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]],
    trio: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]],
    quad: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    hero: [[0, 0, 1, 0.62], [0, 0.62, 0.5, 0.38], [0.5, 0.62, 0.5, 0.38]],
    banner: [[0, 0, 1, 0.55], [0, 0.55, 1 / 3, 0.45], [1 / 3, 0.55, 1 / 3, 0.45], [2 / 3, 0.55, 1 / 3, 0.45]]
  };

  /* Each panel gets its own colour cast, like the panes of a game cover. */
  var PANEL_HUES = [18, 285, 190, 330, 45, 150];

  var state = {
    layout: 'trio',
    photos: [],            /* { img: HTMLImageElement, url: string } */
    placements: [],         /* per panel: { panX, panY, zoom } */
    selected: 0,
    dragging: null
  };
  for (var p = 0; p < 6; p++) state.placements.push({ panX: 0, panY: 0, zoom: 1 });

  function panelRects() {
    var W = canvas.width, H = canvas.height;
    var gap = Math.max(6, Math.round(W * 0.012));
    return LAYOUTS[state.layout].map(function (cell) {
      var x = cell[0] * W, y = cell[1] * H, w = cell[2] * W, h = cell[3] * H;
      return { x: x + gap / 2, y: y + gap / 2, w: w - gap, h: h - gap };
    });
  }

  function photoForPanel(index) {
    if (!state.photos.length) return null;
    if (els.fill.value === 'one') return state.photos[0];
    return state.photos[index % state.photos.length];
  }

  /* Deterministic pseudo-random for the placeholder scenes. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* A procedural sunset skyline so the studio can be tried with no photo:
     gradient sky, a low sun, a dark skyline and two palm silhouettes. */
  function drawPlaceholder(rect, index) {
    var hue = PANEL_HUES[index % PANEL_HUES.length];
    var sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    sky.addColorStop(0, 'hsl(' + (hue + 40) + ', 85%, 62%)');
    sky.addColorStop(0.55, 'hsl(' + hue + ', 90%, 55%)');
    sky.addColorStop(1, 'hsl(' + (hue - 30) + ', 80%, 38%)');
    ctx.fillStyle = sky;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    var sunX = rect.x + rect.w * 0.68, sunY = rect.y + rect.h * 0.36;
    var sunR = Math.min(rect.w, rect.h) * 0.17;
    ctx.fillStyle = 'rgba(255, 236, 170, 0.95)';
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

    var rand = mulberry32(1234 + index * 777);
    var base = rect.y + rect.h * 0.98, top = rect.y + rect.h * 0.58;
    ctx.fillStyle = 'rgba(16, 4, 30, 0.92)';
    var bx = rect.x - 4;
    while (bx < rect.x + rect.w) {
      var bw = rect.w * (0.06 + rand() * 0.12);
      var bh = (base - top) * (0.35 + rand() * 0.65);
      ctx.fillRect(bx, base - bh, bw, bh);
      bx += bw + rect.w * 0.015;
    }
    ctx.fillRect(rect.x, base, rect.w, rect.y + rect.h - base);

    ctx.strokeStyle = 'rgba(10, 2, 20, 0.9)';
    ctx.lineWidth = Math.max(3, rect.w * 0.012);
    ctx.lineCap = 'round';
    [0.22, 0.85].forEach(function (fx) {
      var px = rect.x + rect.w * fx, py = base;
      var lean = (fx < 0.5 ? 1 : -1) * rect.w * 0.05;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + lean * 0.3, py - rect.h * 0.22, px + lean, py - rect.h * 0.34);
      ctx.stroke();
      for (var f = 0; f < 5; f++) {
        var ang = Math.PI * (0.08 + f * 0.21);
        ctx.beginPath();
        ctx.moveTo(px + lean, py - rect.h * 0.34);
        ctx.quadraticCurveTo(
          px + lean + Math.cos(ang) * rect.w * 0.10,
          py - rect.h * 0.34 - Math.sin(ang) * rect.h * 0.10 - rect.h * 0.03,
          px + lean + Math.cos(ang) * rect.w * 0.17,
          py - rect.h * 0.34 - Math.sin(ang) * rect.h * 0.06 + rect.h * 0.05
        );
        ctx.stroke();
      }
    });
  }

  /* Draw one photo into a panel, cover-fit, honouring pan and zoom, and
     clamped so the photo always covers the whole panel. */
  function drawPhoto(rect, photo, place) {
    var img = photo.img;
    var base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    var scale = base * place.zoom;
    var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    var maxPanX = Math.max(0, (dw - rect.w) / 2);
    var maxPanY = Math.max(0, (dh - rect.h) / 2);
    var offX = Math.max(-maxPanX, Math.min(maxPanX, place.panX * rect.w));
    var offY = Math.max(-maxPanY, Math.min(maxPanY, place.panY * rect.h));
    ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + offX, rect.y + (rect.h - dh) / 2 + offY, dw, dh);
  }

  function drawPanels(rects) {
    rects.forEach(function (rect, i) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
      var photo = photoForPanel(i);
      if (photo) drawPhoto(rect, photo, state.placements[i]);
      else drawPlaceholder(rect, i);
      /* the panel's own colour cast */
      ctx.fillStyle = 'hsla(' + PANEL_HUES[i % PANEL_HUES.length] + ', 90%, 55%, 0.10)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    });
  }

  /* Poster-wide colour grades, drawn over the panels. */
  function drawGrade() {
    var W = canvas.width, H = canvas.height;
    var grade = els.grade.value;
    ctx.save();
    if (grade === 'sunset') {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255, 110, 40, 0.16)');
      g.addColorStop(0.5, 'rgba(255, 60, 140, 0.05)');
      g.addColorStop(1, 'rgba(38, 0, 80, 0.38)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (grade === 'neon') {
      var r1 = ctx.createRadialGradient(0, 0, 10, 0, 0, W * 0.75);
      r1.addColorStop(0, 'rgba(255, 40, 180, 0.28)'); r1.addColorStop(1, 'rgba(255, 40, 180, 0)');
      ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
      var r2 = ctx.createRadialGradient(W, H, 10, W, H, W * 0.75);
      r2.addColorStop(0, 'rgba(30, 200, 255, 0.26)'); r2.addColorStop(1, 'rgba(30, 200, 255, 0)');
      ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
    } else if (grade === 'noir') {
      ctx.fillStyle = 'rgba(18, 20, 34, 0.30)'; ctx.fillRect(0, 0, W, H);
    }
    /* vignette for every grade */
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(4, 0, 12, 0.42)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawKeylines(rects) {
    var W = canvas.width;
    ctx.save();
    ctx.lineWidth = Math.max(4, W * 0.006);
    ctx.strokeStyle = 'rgba(5, 0, 14, 0.85)';
    rects.forEach(function (r) { ctx.strokeRect(r.x, r.y, r.w, r.h); });
    ctx.lineWidth = Math.max(1, W * 0.0016);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    rects.forEach(function (r) { ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); });
    ctx.restore();
  }

  function fitSize(text, maxWidth, startPx, fontTail) {
    var px = startPx;
    while (px > 22) {
      ctx.font = px + 'px ' + fontTail;
      if (ctx.measureText(text).width <= maxWidth) break;
      px -= 4;
    }
    return px;
  }

  var GRADE_HEADLINE_STOPS = {
    sunset: ['#ffffff', '#ffd23d', '#ff7a3d'],
    neon: ['#ffffff', '#7df9ff', '#ff4dd2'],
    noir: ['#ffffff', '#d7deeb', '#8fa0bd'],
    clean: ['#ffffff', '#fff3c4', '#ffd23d']
  };

  /* The caption: scrim band, subline over a big gradient headline with a
     dark outline and a hard offset shadow — poster lettering, no font file. */
  function drawCaption() {
    var W = canvas.width, H = canvas.height;
    var headline = (els.headline.value || '').trim().toUpperCase();
    var subline = (els.subline.value || '').trim().toUpperCase();
    var atTop = els.captionPos.value === 'top';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    var bandH = H * 0.30;
    var scrim = atTop
      ? ctx.createLinearGradient(0, 0, 0, bandH)
      : ctx.createLinearGradient(0, H - bandH, 0, H);
    scrim.addColorStop(0, 'rgba(6, 0, 16, 0)');
    scrim.addColorStop(1, 'rgba(6, 0, 16, 0.80)');
    ctx.fillStyle = scrim;
    if (atTop) ctx.fillRect(0, 0, W, bandH); else ctx.fillRect(0, H - bandH, W, bandH);

    var headPx = fitSize(headline || 'VICE COVER', W * 0.92, Math.round(W * 0.118), HEADLINE_FONT);
    var headBase = atTop ? H * 0.055 + headPx : H * 0.945;
    if (headline) {
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(headPx * 0.02) + 'px';
      ctx.font = headPx + 'px ' + HEADLINE_FONT;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0a0214';
      ctx.lineWidth = headPx * 0.16;
      ctx.strokeText(headline, W / 2, headBase);
      ctx.fillStyle = 'rgba(8, 1, 20, 0.85)';
      ctx.fillText(headline, W / 2, headBase + headPx * 0.055);
      var fill = ctx.createLinearGradient(0, headBase - headPx, 0, headBase);
      var stops = GRADE_HEADLINE_STOPS[els.grade.value] || GRADE_HEADLINE_STOPS.sunset;
      fill.addColorStop(0, stops[0]); fill.addColorStop(0.55, stops[1]); fill.addColorStop(1, stops[2]);
      ctx.fillStyle = fill;
      ctx.fillText(headline, W / 2, headBase);
    }
    if (subline) {
      var subPx = Math.round(headPx * 0.30);
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(subPx * 0.34) + 'px';
      ctx.font = '700 ' + subPx + 'px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = Math.max(2, subPx * 0.10);
      var subBase = atTop ? headBase + subPx * 1.5 : headBase - headPx * 1.12;
      ctx.fillText(subline, W / 2, subBase);
      ctx.shadowOffsetY = 0;
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    /* small studio credit in the corner opposite the caption */
    var creditPx = Math.max(13, Math.round(W * 0.017));
    ctx.font = '600 ' + creditPx + 'px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.textAlign = atTop ? 'right' : 'left';
    ctx.fillText('VICE COVER STUDIO', atTop ? W * 0.975 : W * 0.025, atTop ? H * 0.982 : H * 0.032);
    ctx.restore();
  }

  function drawSelection(rects) {
    var r = rects[state.selected];
    if (!r) return;
    ctx.save();
    ctx.lineWidth = Math.max(3, canvas.width * 0.004);
    ctx.strokeStyle = '#39d5e8';
    ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    ctx.restore();
  }

  function draw(showSelection) {
    var rects = panelRects();
    ctx.fillStyle = '#05010d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawPanels(rects);
    drawGrade();
    drawKeylines(rects);
    drawCaption();
    if (showSelection) drawSelection(rects);
  }

  /* ---------- photos in ---------- */

  function refreshStrip() {
    els.strip.innerHTML = '';
    state.photos.forEach(function (photo) {
      var img = document.createElement('img');
      img.src = photo.url;
      img.alt = 'Loaded photo';
      img.className = 'is-used';
      els.strip.appendChild(img);
    });
  }

  function loadFiles(files) {
    Array.prototype.forEach.call(files, function (file) {
      if (!file.type || file.type.indexOf('image/') !== 0) return;
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        state.photos.push({ img: img, url: url });
        state.selected = 0;
        refreshStrip();
        syncZoom();
        draw(true);
      };
      img.src = url;
    });
  }

  els.input.addEventListener('change', function () {
    loadFiles(els.input.files);
    els.input.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    els.drop.addEventListener(name, function (ev) {
      ev.preventDefault();
      els.drop.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (name) {
    els.drop.addEventListener(name, function (ev) {
      ev.preventDefault();
      els.drop.classList.remove('is-dragging');
    });
  });
  els.drop.addEventListener('drop', function (ev) {
    if (ev.dataTransfer) loadFiles(ev.dataTransfer.files);
  });

  /* ---------- panel selection, drag, zoom ---------- */

  function canvasPoint(ev) {
    var box = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - box.left) * (canvas.width / box.width),
      y: (ev.clientY - box.top) * (canvas.height / box.height)
    };
  }

  canvas.addEventListener('pointerdown', function (ev) {
    var pt = canvasPoint(ev);
    var rects = panelRects();
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
        state.selected = i;
        state.dragging = { x: pt.x, y: pt.y, rect: r };
        canvas.setPointerCapture(ev.pointerId);
        syncZoom();
        draw(true);
        break;
      }
    }
  });

  canvas.addEventListener('pointermove', function (ev) {
    if (!state.dragging) return;
    var pt = canvasPoint(ev);
    var place = state.placements[state.selected];
    place.panX += (pt.x - state.dragging.x) / state.dragging.rect.w;
    place.panY += (pt.y - state.dragging.y) / state.dragging.rect.h;
    state.dragging.x = pt.x;
    state.dragging.y = pt.y;
    draw(true);
  });

  ['pointerup', 'pointercancel'].forEach(function (name) {
    canvas.addEventListener(name, function () { state.dragging = null; });
  });

  function syncZoom() {
    var place = state.placements[state.selected];
    els.zoom.value = Math.round(place.zoom * 100);
    els.zoomLabel.textContent = Math.round(place.zoom * 100) + '%';
  }

  els.zoom.addEventListener('input', function () {
    state.placements[state.selected].zoom = Number(els.zoom.value) / 100;
    els.zoomLabel.textContent = els.zoom.value + '%';
    draw(true);
  });

  els.center.addEventListener('click', function () {
    state.placements[state.selected] = { panX: 0, panY: 0, zoom: 1 };
    syncZoom();
    draw(true);
  });

  /* Keyboard nudging for the selected panel: arrows pan the photo in
     small steps, + and - zoom it, 0 re-centres. The canvas is focusable
     (tabindex in index.html), so this works without the mouse. */
  var NUDGE_KEYS = {
    ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0],
    ArrowUp: [0, -0.02], ArrowDown: [0, 0.02]
  };
  canvas.addEventListener('keydown', function (ev) {
    var place = state.placements[state.selected];
    if (NUDGE_KEYS[ev.key]) {
      place.panX += NUDGE_KEYS[ev.key][0];
      place.panY += NUDGE_KEYS[ev.key][1];
    } else if (ev.key === '+' || ev.key === '=') {
      place.zoom = Math.min(3, place.zoom + 0.05);
      syncZoom();
    } else if (ev.key === '-' || ev.key === '_') {
      place.zoom = Math.max(1, place.zoom - 0.05);
      syncZoom();
    } else if (ev.key === '0') {
      state.placements[state.selected] = { panX: 0, panY: 0, zoom: 1 };
      syncZoom();
    } else {
      return;
    }
    ev.preventDefault();
    draw(true);
  });

  /* ---------- controls ---------- */

  els.layouts.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-layout]');
    if (!btn) return;
    state.layout = btn.getAttribute('data-layout');
    Array.prototype.forEach.call(els.layouts.querySelectorAll('.layout-btn'), function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    state.selected = 0;
    syncZoom();
    draw(true);
  });

  [els.fill, els.captionPos, els.grade].forEach(function (el) {
    el.addEventListener('change', function () { draw(true); });
  });
  [els.headline, els.subline].forEach(function (el) {
    el.addEventListener('input', function () { draw(true); });
  });

  els.size.addEventListener('change', function () {
    var parts = els.size.value.split('x');
    canvas.width = Number(parts[0]);
    canvas.height = Number(parts[1]);
    draw(true);
  });

  els.exportBtn.addEventListener('click', function () {
    draw(false); /* export without the selection outline */
    canvas.toBlob(function (blob) {
      if (!blob) { draw(true); return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      draw(true);
    }, 'image/png');
  });

  syncZoom();
  draw(true);
})();
