/* ============================================================
   ✦ main.js - page router, HUD, sounds & micro-interactions
============================================================ */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = v => String(v).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* ------- sound ------- */
  let actx = null, muted = false;
  const ensureAudio = () => {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === "suspended") actx.resume();
  };
  const blip = (f = 660, d = 0.05, type = "sine", v = 0.04) => {
    if (muted || !actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + d);
  };
  addEventListener("pointerdown", ensureAudio);
  const sndBtn = $("#soundBtn");
  sndBtn.addEventListener("click", () => {
    ensureAudio(); muted = !muted;
    sndBtn.classList.toggle("off", muted);
    $("#soundState").textContent = muted ? "OFF" : "ON";
    if (!muted) blip(880, .08);
  });
  $$("a,button,.cert").forEach(el => el.addEventListener("mouseenter", () => blip(600, .03, "sine", .02)));

  /* ------- clock ------- */
  const clockEl = $("#clock");
  setInterval(() => {
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString("en-GB") + " PH";
  }, 1000);

  /* ------- page router ------- */
  const ORDER = ["home","intro","about","skills","projects","certificates","videos","resume","contact"];
  const links = $$("[data-fnav]");
  let current = null;

  const reveals = id => {
    const page = document.getElementById(id);
    $$(".reveal", page).forEach((el, i) => {
      el.classList.remove("in");
      setTimeout(() => el.classList.add("in"), 100 + i * 80);
    });
  };

  const scanEl = $("#scan");
  function scanSweep() {
    if (!scanEl) return;
    scanEl.classList.remove("on"); void scanEl.offsetWidth;
    scanEl.classList.add("on");
    setTimeout(() => scanEl.classList.remove("on"), 800);
  }
  function showPage(id, silent = false) {
    if (!ORDER.includes(id) || id === current) return;
    window.__closePopups && window.__closePopups();                     // never carry a pop-up across pages
    if (current) { scanSweep(); document.getElementById(current).classList.remove("page-active"); }
    current = id;
    const page = document.getElementById(id);
    page.classList.add("page-active");
    page.scrollTop = 0;
    links.forEach(l => l.classList.toggle("act", l.dataset.fnav === id));
    document.body.classList.toggle("deck", id !== "home");
    edgeSync(ORDER.indexOf(id));
    history.replaceState(null, "", "#" + id);
    if (!silent) blip(680 + ORDER.indexOf(id) * 50, .06);
    window.__P3 && window.__P3.setActive(id);       // activate its 3D scene
    window.__fitCrystal && window.__fitCrystal();
    window.__fitCarousel && window.__fitCarousel();
    reveals(id);
    if (id === "intro") startTyped();
  }

  const DECK = ORDER.slice(1);                                    // deck pages only (home stays on the crystal)
  const step = d => {
    if (current === "home") { if (d > 0) window.__enterDeck(); return; }
    showPage(DECK[(DECK.indexOf(current) + d + DECK.length) % DECK.length]);
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    showPage(a.getAttribute("href").slice(1));
  }));
  addEventListener("keydown", e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (document.body.classList.contains("popup-open")) return;   // modal / lightbox handle their own keys
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  /* ------- edge facets - candy-wrap rails ------- */
  const NAV_NAMES = {home:"HOME",intro:"INTRO",about:"PROFILE",skills:"SKILLS",projects:"PROJECTS",certificates:"CERTIFICATES",videos:"VIDEOS",resume:"RÉSUMÉ",contact:"CONTACT"};
  const edgePrev = $("#edgePrev"), edgeNext = $("#edgeNext");
  const tagPrev = $("#tagPrev"), tagNext = $("#tagNext");
  edgePrev && edgePrev.addEventListener("click", () => step(-1));
  edgeNext && edgeNext.addEventListener("click", () => step(1));
  function edgeSync(idx) {
    if (!edgePrev || !edgeNext) return;
    if (idx < 1) return;                                            // home: rails stay hidden
    const deck = ORDER.slice(1), di = deck.indexOf(ORDER[idx]);
    if (tagPrev) tagPrev.textContent = "PREV · " + NAV_NAMES[deck[(di - 1 + deck.length) % deck.length]];
    if (tagNext) tagNext.textContent = "NEXT · " + NAV_NAMES[deck[(di + 1) % deck.length]];
    const lit = Math.min(4, Math.ceil((di + 1) * 4 / deck.length)); // pages fill the rails as you climb
    edgePrev.querySelectorAll(".ef").forEach((f, i) => f.classList.toggle("lit", 3 - i < lit));
    edgeNext.querySelectorAll(".ef").forEach((f, i) => f.classList.toggle("lit", 3 - i < lit));
  }
  edgeSync(0);

  /* ------- touch: swipe left / right between pages ------- */
  let sw = null;
  addEventListener("touchstart", e => {
    sw = null;
    if (e.touches.length !== 1 || current === "home" || document.body.classList.contains("popup-open")) return;
    if (e.target.closest(".carousel, input, textarea, .facetnav")) return;   // the ring has its own drag
    const t = e.touches[0]; sw = { x: t.clientX, y: t.clientY, t: performance.now() };
  }, { passive: true });
  addEventListener("touchend", e => {
    if (!sw) return;
    const t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = performance.now() - sw.t;
    sw = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 1000) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  const dragHint = $("#dragHint");
  if (dragHint && matchMedia("(hover:none)").matches) dragHint.textContent = "◈ TAP TO ENTER";

  /* ------- ENTER the command deck (crystal shatter) ------- */
  window.__enterDeck = () => {
    if (window.__deckEntered) return;                         // one shatter per visit-home
    window.__deckEntered = true; setTimeout(() => window.__deckEntered = false, 900);
    blip(880, .09); setTimeout(() => blip(1200, .07), 140);
    window.__shatterCrystal && window.__shatterCrystal();
    setTimeout(() => showPage("intro"), 680);
  };

  /* ------- space particles (stars + drifting hexagons) ------- */
  (() => {
    const c = $("#spaceCanvas"); if (!c) return;
    const ctx = c.getContext("2d");
    let W, H; const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    size(); addEventListener("resize", size);
    const stars = [], hexes = [];
    for (let i = 0; i < 130; i++) stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.5+0.4,tw:Math.random()*6.28,sp:Math.random()*0.25+0.08});
    for (let i = 0; i < 15; i++) hexes.push({x:Math.random(),y:Math.random(),s:Math.random()*15+8,rot:Math.random()*6.28,vr:(Math.random()-.5)*0.0024,vx:(Math.random()-.5)*0.00009,vy:(Math.random()-.5)*0.00009,col:Math.random()<.6?"94,227,255":"170,220,255"});
    let t = 0;
    const hex = s => { ctx.beginPath(); for(let k=0;k<6;k++){const a=s.rot+k*1.047;ctx[k?"lineTo":"moveTo"](Math.cos(a)*s.s,Math.sin(a)*s.s);} ctx.closePath(); ctx.stroke(); };
    let prev = 0;
    (function loop(now){
      requestAnimationFrame(loop);
      if (document.hidden || document.body.classList.contains("popup-open")) return;
      if (now - prev < 33) return;                                   // ~30 fps is plenty for drifting stars
      prev = now; t++;
      ctx.clearRect(0,0,W,H);
      for (const s of hexes){ s.x=(s.x+1+s.vx*2)%1; s.y=(s.y+1+s.vy*2)%1; s.rot+=s.vr*2;
        ctx.save(); ctx.translate(s.x*W,s.y*H); ctx.strokeStyle=`rgba(${s.col},.13)`; ctx.lineWidth=1; hex(s); ctx.restore(); }
      for (const s of stars){ const a=.22+.6*Math.abs(Math.sin(t/29*s.sp+s.tw)); ctx.fillStyle=`rgba(214,240,255,${a.toFixed(3)})`; ctx.fillRect(s.x*W,s.y*H,s.r,s.r); }
    })(0);
  })();

  /* ------- facet shards nav ------- */
  $$("[data-fnav]").forEach(l => l.addEventListener("click", () => { blip(700, .05); showPage(l.dataset.fnav); }));

  /* ------- loader ------- */
  const pre = $("#preloader"), preCount = $("#preCount"), preBar = $("#preBar");
  let n = 0, booted = false;
  const tick = () => {
    if (booted) return;
    n = Math.min(100, n + Math.random() * 10 + 5);
    preCount.textContent = String(Math.floor(n)).padStart(2, "0");
    preBar.style.width = n + "%";
    if (n < 100) setTimeout(tick, 60 + Math.random() * 70);
    else {
      booted = true;
      setTimeout(() => {
        pre.classList.add("done");
        showPage("home", true);   // always boot in space at the crystal - page 01
        history.replaceState(null, "", location.pathname);
        setTimeout(() => pre.remove(), 800);
      }, 350);
    }
  };
  if (document.readyState === "complete") tick();
  else { window.addEventListener("load", tick); setTimeout(tick, 2000); }

  /* ------- typed roles ------- */
  const roles = ["FULL-STACK WEB", "NETWORKING", "GAME DEVELOPMENT", "SYSTEM BUILDING"];
  const typedEl = $("#typedRole");
  let ri = 0, ci = 0, del = false, typedOn = false;
  function startTyped() {
    if (!typedEl || typedOn) return; typedOn = true;
    const type = () => {
      const w = roles[ri];
      ci += del ? -1 : 1;
      typedEl.textContent = w.slice(0, ci);
      let d = del ? 32 : 72;
      if (!del && ci === w.length) { d = 1400; del = true; }
      else if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; d = 300; }
      setTimeout(type, d);
    };
    type();
  }

  /* ------- cursor ------- */
  if (fine) {
    const dot = $("#cursorDot"), ring = $("#cursorRing");
    let mx = -100, my = -100, rx = -100, ry = -100, running = false, last = 0;
    const ringLoop = t => {
      const dt = Math.min(64, t - last); last = t;
      const k = 1 - Math.pow(1 - .42, dt / 16.7);                // same feel at 60/120/144 Hz
      rx += (mx - rx) * k; ry += (my - ry) * k;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
      if (Math.abs(mx - rx) + Math.abs(my - ry) > .3) requestAnimationFrame(ringLoop);
      else running = false;                                         // idle: no work while the mouse rests
    };
    addEventListener("mousemove", e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;   // zero-lag dot
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(ringLoop); }
    }, { passive: true });
    const HOV = "a,button,.cert,.vid,.cap-tile,input,textarea,.skillrow,canvas,video,.resume__doc";
    addEventListener("mouseover", e => ring.classList.toggle("hovering", !!e.target.closest(HOV)));
  } else document.body.classList.add("no-cursorfx");

  /* ------- skill bars + counters (on visibility) ------- */
  const barIO = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.style.width = en.target.dataset.level + "%";
    blip(520, .18, "sine", .025);
    barIO.unobserve(en.target);
  }), { threshold: .4 });
  $$(".skillrow .track b").forEach(b => barIO.observe(b));

  const numIO = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, end = +el.dataset.count, t0 = performance.now();
    (function cnt(t) {
      const p = Math.min(1, (t - t0) / 1100);
      el.textContent = Math.round(end * p);
      if (p < 1) requestAnimationFrame(cnt);
    })(t0);
    numIO.unobserve(el);
  }), { threshold: .6 });
  $$("[data-count]").forEach(el => numIO.observe(el));

  /* ------- lightbox (gallery: certificates / résumé) ------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap"), lbPrev = $("#lbPrev"), lbNext = $("#lbNext");
  let lbSet = [], lbI = 0;
  const lbShow = i => {
    lbI = (i + lbSet.length) % lbSet.length;
    const f = lbSet[lbI], b = f.querySelector("figcaption b"), sp = f.querySelector("figcaption span");
    lbImg.src = f.dataset.lightbox;
    lbCap.innerHTML = b ? `<b>${esc(b.textContent)}</b>${sp ? `<span>${esc(sp.textContent)}</span>` : ""}<em>${String(lbI + 1).padStart(2, "0")} / ${String(lbSet.length).padStart(2, "0")}</em>` : "";
    lbCap.style.display = b ? "" : "none";
  };
  $$("[data-lightbox]").forEach(f => f.addEventListener("click", () => {
    lbSet = $$("[data-lightbox]", f.parentElement);                // gallery = siblings (8 certs) or just itself
    lb.classList.toggle("lb--single", lbSet.length < 2);
    lbShow(lbSet.indexOf(f));
    lb.classList.add("open"); document.body.classList.add("popup-open"); blip(900, .08);
  }));
  const shut = () => { lb.classList.remove("open"); syncPopup(); };
  lbPrev.addEventListener("click", e => { e.stopPropagation(); lbShow(lbI - 1); blip(760, .05); });
  lbNext.addEventListener("click", e => { e.stopPropagation(); lbShow(lbI + 1); blip(820, .05); });
  $("#lbClose").addEventListener("click", shut);
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb__fig")) shut(); });

  /* ------- modal (glass pop-up: page details + video player) ------- */
  const modal = $("#modal"), mBox = $("#modalBox"), mBody = $("#modalBody");
  function syncPopup() {
    document.body.classList.toggle("popup-open", lb.classList.contains("open") || modal.classList.contains("open"));
  }
  function openModal(content, kind = "") {
    mBody.querySelectorAll("video").forEach(v => v.pause());
    mBody.innerHTML = ""; mBody.append(content); mBody.scrollTop = 0;
    mBox.className = "modal__box glass" + (kind ? " modal__box--" + kind : "");
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
    syncPopup(); blip(980, .07);
    $("#modalClose").focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal.classList.contains("open")) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    mBody.querySelectorAll("video").forEach(v => v.pause());
    modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true");
    syncPopup();
    setTimeout(() => { if (!modal.classList.contains("open")) mBody.innerHTML = ""; }, 400);
  }
  window.__closePopups = () => { closeModal(); shut(); };
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  $$("[data-modal]").forEach(t => t.addEventListener("click", () => {
    const tpl = document.getElementById(t.dataset.modal); if (!tpl) return;
    openModal(tpl.content.cloneNode(true));
    if (t.dataset.focus != null) {                                  // capability tiles: spotlight the one clicked
      const c = mBody.querySelectorAll(".cap")[+t.dataset.focus];
      if (c) { c.classList.add("focus"); setTimeout(() => c.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60); }
    }
  }));

  /* ------- videos: compact cards → modal player ------- */
  const vcards = $$("#videos .vid");
  let vI = 0;
  function playVideo(i) {
    vI = (i + vcards.length) % vcards.length;
    const c = vcards[vI], d = c.dataset, title = esc(c.querySelector("h3").textContent);
    const w = document.createElement("div"); w.className = "vplayer";
    w.innerHTML = `
      <div class="vplayer__frame">
        <video controls playsinline autoplay preload="auto" controlslist="nofullscreen nodownload" disablepictureinpicture src="${esc(d.video)}"></video>
        <button class="vplayer__exit mono" type="button" aria-label="Exit fullscreen">✕ EXIT FULLSCREEN</button>
      </div>
      <div class="vplayer__meta mono"><span>V·${esc(d.n)}</span><b>${esc(d.tag)}</b><b>${esc(d.dur)} · FULL WALKTHROUGH</b>${d.wip ? '<span class="vid__wip">IN DEVELOPMENT</span>' : ""}</div>
      <div class="vplayer__row">
        <div><h3 class="modal__title">${title}</h3><p>${esc(d.cap)}</p></div>
        <div class="vplayer__nav mono">
          ${caseOf(d.video) >= 0 ? '<button type="button" class="vplayer__case" aria-label="Open case study">◈ CASE STUDY</button>' : ""}
          <button type="button" class="vplayer__fs" aria-label="Fullscreen">⛶ FULLSCREEN</button>
          <button type="button" data-step="-1" aria-label="Previous video">‹ PREV</button>
          <em>${String(vI + 1).padStart(2, "0")} / ${String(vcards.length).padStart(2, "0")}</em>
          <button type="button" data-step="1" aria-label="Next video">NEXT ›</button>
        </div>
      </div>`;
    w.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => playVideo(vI + +b.dataset.step)));
    const v = w.querySelector("video");
    v.addEventListener("error", () => {
      v.parentElement.innerHTML = `<div class="video-missing"><div class="pm">▶</div><b>VIDEO UNAVAILABLE</b><code>${esc(d.video)}</code></div>`;
    });
    const frame = w.querySelector(".vplayer__frame");
    w.querySelector(".vplayer__fs").addEventListener("click", () => toggleFs(frame, v));
    w.querySelector(".vplayer__exit").addEventListener("click", exitFs);
    const cb = w.querySelector(".vplayer__case");
    cb && cb.addEventListener("click", () => { exitFs(); openCase(caseOf(d.video)); });
    v.addEventListener("dblclick", () => toggleFs(frame, v));
    let idleT;                                                       // exit button fades when the mouse rests
    frame.addEventListener("mousemove", () => {
      frame.classList.remove("fs-idle"); clearTimeout(idleT);
      idleT = setTimeout(() => frame.classList.add("fs-idle"), 2500);
    });
    openModal(w, "video");
    v.play().catch(() => {});
  }
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function exitFs() {
    if (!fsEl()) return;
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
  function toggleFs(frame, v) {
    if (fsEl()) return exitFs();
    const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (req) req.call(frame);
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone: native player with its own Done button
  }
  vcards.forEach((c, i) => {
    c.addEventListener("click", () => playVideo(i));
    c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playVideo(i); } });
    const tv = c.querySelector("video");
    tv && tv.addEventListener("error", () => c.classList.add("vid--nothumb"));
  });

  /* ------- case studies: 04 Projects → pop-up (content lives in js/projects.js) ------- */
  const PR = window.PROJECTS || [];
  const pad2 = n => String(n).padStart(2, "0");
  const fileOf = src => String(src || "").split("/").pop();
  function caseOf(src) { return PR.findIndex(p => p.video === fileOf(src)); }
  function videoOf(p) { return vcards.findIndex(c => fileOf(c.dataset.video) === p.video); }
  let cI = 0;
  function openCase(i) {
    if (!PR.length) return;
    cI = (i + PR.length) % PR.length;
    const p = PR[cI], vi = videoOf(p);
    const w = document.createElement("div"); w.className = "case";
    w.innerHTML = `
      <p class="modal__kicker mono"><span>${pad2(cI + 1)} / ${pad2(PR.length)}</span>CASE STUDY · ${esc(p.role)}</p>
      <h3 class="modal__title">${esc(p.t)}</h3>
      <div class="tags mono case__tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}${p.wip ? '<span class="vid__wip">IN DEVELOPMENT</span>' : ""}</div>
      <div class="case__grid">
        <section class="case__block"><h4 class="mono"><i>01</i>${p.kind === "game" ? "THE IDEA" : "THE PROBLEM"}</h4><p>${esc(p.problem)}</p></section>
        <section class="case__block"><h4 class="mono"><i>02</i>MY ROLE</h4><p>${esc(p.myrole)}</p></section>
        <section class="case__block case__block--wide"><h4 class="mono"><i>03</i>WHAT I BUILT</h4><ul>${p.built.map(b => `<li>${esc(b)}</li>`).join("")}</ul></section>
        <section class="case__block case__block--wide case__block--out"><h4 class="mono"><i>04</i>OUTCOME</h4><p>${esc(p.outcome)}</p></section>
      </div>
      <div class="case__foot">
        ${vi >= 0 ? `<button type="button" class="btn case__watch">▶ Watch walkthrough <em class="mono">${esc(vcards[vi].dataset.dur)}</em></button>` : ""}
        <div class="vplayer__nav mono">
          <button type="button" data-step="-1" aria-label="Previous case study">‹ PREV</button>
          <em>${pad2(cI + 1)} / ${pad2(PR.length)}</em>
          <button type="button" data-step="1" aria-label="Next case study">NEXT ›</button>
        </div>
      </div>`;
    w.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => openCase(cI + +b.dataset.step)));
    const wb = w.querySelector(".case__watch");
    wb && wb.addEventListener("click", () => playVideo(vi));
    openModal(w, "case");
  }
  window.__openCase = openCase;
  const carIdx = () => +($("#carInfo") && $("#carInfo").dataset.idx) || 0;
  $("#carCase") && $("#carCase").addEventListener("click", () => openCase(carIdx()));
  $("#carWatch") && $("#carWatch").addEventListener("click", () => {
    const p = PR[carIdx()], vi = p ? videoOf(p) : -1;
    if (vi >= 0) playVideo(vi);
  });

  addEventListener("keydown", e => {
    if (e.key === "Escape") { closeModal(); shut(); return; }
    if (lb.classList.contains("open") && lbSet.length > 1) {
      if (e.key === "ArrowRight") lbShow(lbI + 1);
      if (e.key === "ArrowLeft") lbShow(lbI - 1);
    } else if (modal.classList.contains("open") && mBox.classList.contains("modal__box--video")
               && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (e.key === "ArrowRight" && e.shiftKey) playVideo(vI + 1);   // plain arrows stay with the player (seek)
      if (e.key === "ArrowLeft" && e.shiftKey) playVideo(vI - 1);
    } else if (modal.classList.contains("open") && mBox.classList.contains("modal__box--case")) {
      if (e.key === "ArrowRight") openCase(cI + 1);
      if (e.key === "ArrowLeft") openCase(cI - 1);
    }
  });

  /* ------- magnetic UI ------- */
  if (fine) {
    $$(".btn, .snd, .gchip").forEach(el => {
      el.classList.add("magnetic");
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.classList.add("on");
        el.style.translate = (dx * .28) + "px " + (dy * .28) + "px";
      });
      el.addEventListener("pointerleave", () => { el.classList.remove("on"); el.style.translate = ""; });
    });
  }

  /* ------- live git chip (public GitHub API, read-only) ------- */
  (() => {
    const gc = $("#gitChip"); if (!gc) return;
    const dot = '<i class="gchip__dot"></i>';
    const ago = d => {
      const s = (Date.now() - d) / 1000;
      if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago";
      return Math.floor(s / 86400) + "d ago";
    };
    fetch("https://api.github.com/repos/illyayuuki-ops/Portfolio/commits?per_page=1")
      .then(r => r.json())
      .then(a => {
        const c = a && a[0];
        if (!c || !c.sha) throw 0;
        gc.innerHTML = dot;
        gc.append("GIT · " + String(c.sha).slice(0, 7).toUpperCase() + " · " + ago(new Date(c.commit.committer.date)));
      })
      .catch(() => { gc.innerHTML = dot + "GIT · MAIN BRANCH"; });
  })();

  /* ------- contact form ------- */
  const ME = "johnraphael030306@gmail.com";
  $("#contactForm").addEventListener("submit", e => {
    e.preventDefault();
    blip(700, .05); setTimeout(() => blip(950, .06), 90);
    const nm = $("#cName").value, em = $("#cEmail").value, ms = $("#cMsg").value;
    location.href = `mailto:${ME}?subject=Portfolio inquiry from ${encodeURIComponent(nm)}&body=${encodeURIComponent(ms + "\n\nFrom: " + nm + " (" + em + ")")}`;
    const b = e.target.querySelector("button");
    b.textContent = "Opening email client…";
    setTimeout(() => (b.textContent = "Send →"), 3000);
  });
})();
