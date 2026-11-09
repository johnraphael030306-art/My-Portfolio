/* ============================================================
   ✦ three-scenes.js - REAL interactive 3D (Three.js, vendored)
   Scene A: draggable glass CRYSTAL with inertia (home page)
   Scene B: draggable 3D PROJECT CAROUSEL (projects page)
   Both run only while their page is active.
============================================================ */
(() => {
  "use strict";
  if (!window.THREE) return; // graceful: pages still work without WebGL

  const SKY = 0x5ee3ff, DEEP = 0x2a6cff, INK = 0xeaf4ff;
  const active = { home: false, projects: false };
  window.__P3 = { setActive(name) { for (const k in active) active[k] = k === name; } };

  const isCoarse = matchMedia("(pointer:coarse)").matches;

  /* ============================================================
     SCENE A - HERO CRYSTAL (drag = rotate, inertia spin)
  ============================================================ */
  (() => {
    const canvas = document.getElementById("crystalCanvas");
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarse ? 1.6 : 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    // ---- lighting (glassy rim feel) ----
    scene.add(new THREE.AmbientLight(0x8fb8ff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(SKY, 2.2);      rim.position.set(-4, -1, -3); scene.add(rim);
    const fillP = new THREE.PointLight(DEEP, 2.0, 30);     fillP.position.set(-3, 3, 3); scene.add(fillP);

    const group = new THREE.Group();
    scene.add(group);

    // ---- glass crystal ----
    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 0),
      new THREE.MeshPhysicalMaterial({
        color: 0xbfefff, metalness: 0.05, roughness: 0.04,
        transmission: 0.92, thickness: 1.6, ior: 1.45,
        clearcoat: 1, clearcoatRoughness: 0.12,
        envMapIntensity: 1.4, flatShading: true, transparent: true, opacity: 0.96,
      })
    );
    group.add(crystal);
    // faint edge glow
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(crystal.geometry),
      new THREE.LineBasicMaterial({ color: SKY, transparent: true, opacity: 0.55 })
    );
    group.add(edges);

    // ---- inner core ----
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: SKY, wireframe: true, transparent: true, opacity: 0.75 })
    );
    group.add(core);

    // ---- orbit rings ----
    const ringMat = new THREE.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.35 });
    const rings = [];
    [[1.95, 0.0045, 0.35, 0.2], [2.35, 0.003, -0.5, 1.1]].forEach(([r, t, rx, rz]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 160), ringMat);
      ring.rotation.set(rx, 0, rz);
      group.add(ring); rings.push(ring);
    });

    // ---- particles ----
    const N = isCoarse ? 140 : 260;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 2.6 + Math.random() * 2.4, a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(b) * Math.cos(a);
      pos[i * 3 + 1] = r * Math.sin(b) * Math.sin(a);
      pos[i * 3 + 2] = r * Math.cos(b);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: INK, size: 0.022, transparent: true, opacity: 0.5 }));
    scene.add(points);

    // ---- interaction: drag with inertia ----
    let velX = 0, velY = 0, dragging = false, px = 0, py = 0;
    let tiltX = 0, tiltY = 0, tTX = 0, tTY = 0;
    const hint = document.getElementById("dragHint");

    let tapX = 0, tapY = 0, tapT = 0;
    canvas.addEventListener("pointerdown", e => {
      dragging = true; px = e.clientX; py = e.clientY;
      tapX = e.clientX; tapY = e.clientY; tapT = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      if (hint) hint.style.opacity = 0;
    });
    canvas.addEventListener("pointerup", e => {
      dragging = false; canvas.style.cursor = "";
      // a clean tap (not a drag) = CLICK ME → shatter & enter the deck
      const d = Math.hypot(e.clientX - tapX, e.clientY - tapY);
      if (d < 8 && performance.now() - tapT < 420) window.__enterDeck && window.__enterDeck();
    });
    canvas.addEventListener("pointermove", e => {
      if (dragging) {
        velY = (e.clientX - px) * 0.006;
        velX = (e.clientY - py) * 0.006;
        px = e.clientX; py = e.clientY;
      } else {
        // subtle scene tilt following the pointer
        const r = canvas.getBoundingClientRect();
        tTX = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
        tTY = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
      }
    });

    // ---- layout (crystal sits right of the text) ----
    const fit = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = w > 900;
      group.position.x = 0;                      // the crystal IS the space backdrop - dead center
      group.position.y = 0;
      group.scale.setScalar(wide ? 1.18 : Math.min(0.84, camera.aspect * 1.3));   // tall phones: keep the whole crystal on screen
    };
    fit();
    addEventListener("resize", fit);

    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!active.home) return;
      if (broken) window.__restoreCrystal();       // crystal reforms every time you come home
      const t = clock.getElapsedTime();

      if (!dragging) {
        velX *= 0.95; velY *= 0.95;                 // inertia decay
        group.rotation.y += 0.0022;                  // idle auto-spin
      }
      group.rotation.x += velX; group.rotation.y += velY;
      tiltX += (tTX - tiltX) * 0.05; tiltY += (tTY - tiltY) * 0.05;
      group.rotation.x += tiltX * 0.02; group.rotation.z = tiltY * -0.06;

      group.position.y += Math.sin(t * 0.9) * 0.0016; // gentle hover bob
      core.rotation.x = t * 0.6; core.rotation.y = t * 0.8;
      rings[0].rotation.y = t * 0.35; rings[1].rotation.y = -t * 0.22;
      points.rotation.y = t * 0.03;

      // ---- shatter animation ----
      if (broken) { group.visible = false; }
      if (shatterStart >= 0) {
        const p = (t - shatterStart) / 1.05;
        if (p <= 0.14) group.scale.setScalar((wideScale) * (1 + p * 1.1));   // quick pop
        if (p >= 0.14) group.visible = false;
        if (p < 1) {
          const a = burst.geo.attributes.position.array, dt = 1 / 60;
          for (let i = 0; i < a.length; i += 3) {
            a[i] += burst.vel[i] * dt; a[i + 1] += burst.vel[i + 1] * dt; a[i + 2] += burst.vel[i + 2] * dt;
          }
          burst.geo.attributes.position.needsUpdate = true;
          burst.mesh.material.opacity = 1 - p;
          burst.mesh.material.size = 0.07 * (1 - p * 0.5);
          burst.mesh.rotation.copy(group.rotation);
        } else {
          scene.remove(burst.mesh); burst = null; shatterStart = -2;
          group.visible = false; broken = true; canvas.style.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    })();

    // ---- crystal shatter API (ENTER button) ----
    let shatterStart = -3, burst = null, broken = false;
    const wideScale = () => innerWidth > 900 ? 1 : 0.72;
    window.__shatterCrystal = () => {
      if (shatterStart !== -3 || broken) return;
      const pts = [];
      const addG = g => { const a = g.attributes.position; for (let i = 0; i < a.count; i++) pts.push(a.getX(i), a.getY(i), a.getZ(i)); };
      addG(crystal.geometry); addG(core.geometry);
      const bPos = new Float32Array(pts), bVel = new Float32Array(pts.length);
      const v = new THREE.Vector3();
      for (let i = 0; i < bPos.length; i += 3) {
        v.set(bPos[i], bPos[i + 1], bPos[i + 2]).normalize();
        const s = 1.7 + Math.random() * 2.4;
        bVel[i] = v.x * s + (Math.random() - .5) * .7;
        bVel[i + 1] = v.y * s + (Math.random() - .5) * .7;
        bVel[i + 2] = v.z * s + (Math.random() - .5) * .7;
      }
      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
      burst = { geo: bGeo, vel: bVel, mesh: new THREE.Points(bGeo, new THREE.PointsMaterial({ color: SKY, size: 0.07, transparent: true, opacity: 1 })) };
      burst.mesh.position.copy(group.position); burst.mesh.scale.copy(group.scale);
      scene.add(burst.mesh);
      shatterStart = clock.getElapsedTime();
    };
    window.__restoreCrystal = () => {
      if (hint) hint.style.opacity = "";                     // tap tag comes back with the crystal
      broken = false; shatterStart = -3; group.visible = true; canvas.style.opacity = 1;
    };
    window.__fitCrystal = fit;
  })();

  /* ============================================================
     SCENE B - PROJECT CAROUSEL (drag the ring, snap to card)
  ============================================================ */
  (() => {
    const canvas = document.getElementById("carouselCanvas");
    if (!canvas) return;

    const PROJECTS = window.PROJECTS || [];                     // js/projects.js
    if (!PROJECTS.length) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.15, 5.4);

    // ---- build card textures on a 2D canvas ----
    const makeTex = (p, i) => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 640;
      const x = c.getContext("2d");
      // glass card
      x.fillStyle = "rgba(255,255,255,0.045)"; 
      roundRect(x, 6, 6, 1012, 628, 40); x.fill();
      x.strokeStyle = "rgba(94,227,255,0.55)"; x.lineWidth = 3;
      roundRect(x, 6, 6, 1012, 628, 40); x.stroke();
      // number
      x.font = "500 60px 'IBM Plex Mono', monospace"; x.fillStyle = "rgba(94,227,255,0.9)";
      x.fillText("0" + (i + 1), 56, 108);
      x.strokeStyle = "rgba(130,190,255,0.25)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(56, 138); x.lineTo(968, 138); x.stroke();
      // title
      x.font = "600 62px 'Space Grotesk', sans-serif"; x.fillStyle = "#eaf4ff";
      const tEnd = wrapText(x, p.t, 56, 230, 912, 72);
      // desc
      x.font = "400 36px 'Space Grotesk', sans-serif"; x.fillStyle = "rgba(127,147,177,1)";
      wrapText(x, p.d, 56, tEnd + 92, 912, 50);
      // role tag
      x.font = "400 30px 'IBM Plex Mono', monospace"; x.fillStyle = "#5ee3ff";
      const roleTxt = "▸ " + p.role, tagTxt = p.tags.join(" · ");
      x.fillText(roleTxt, 56, 565);
      const crowded = x.measureText(roleTxt).width + x.measureText(tagTxt).width + 48 > 912;
      x.textAlign = "right"; x.fillStyle = "rgba(127,147,177,1)";
      x.fillText(tagTxt, 968, crowded ? 515 : 565); x.textAlign = "left";   // long stacks move up a line
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      return tex;
    };
    function roundRect(x, a, b, w, h, r) {
      x.beginPath(); x.moveTo(a + r, b);
      x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
      x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
    }
    function wrapText(x, text, px, py, maxW, lh) {
      const words = text.split(" "); let line = "", yy = py;
      for (const w of words) {
        const test = line + w + " ";
        if (x.measureText(test).width > maxW && line) { x.fillText(line, px, yy); line = w + " "; yy += lh; }
        else line = test;
      }
      x.fillText(line, px, yy);
      return yy;
    }

    const group = new THREE.Group();
    scene.add(group);
    const N = PROJECTS.length, step = (Math.PI * 2) / N;
    const radius = Math.max(2.05, 1.65 / Math.tan(step / 2) + 0.35);   // wide enough that 3.3-wide cards never touch
    const cards = PROJECTS.map((p, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(3.3, 2.05),
        new THREE.MeshBasicMaterial({ map: makeTex(p, i), transparent: true, side: THREE.DoubleSide })
      );
      const a = i * step;
      m.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      m.rotation.y = a;
      group.add(m);
      return m;
    });
    // ground reflection glow
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(radius + 1.15, 64),
      new THREE.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.05 })
    );
    glow.rotation.x = -Math.PI / 2; glow.position.y = -1.45;
    scene.add(glow);

    // ---- drag with inertia + snap ----
    let vel = 0, dragging = false, px = 0, downX = 0, targetRot = 0, focused = 0, pos = 0;   // pos = unbounded card index (no long spin when wrapping)
    const speed = 0.0045;
    const hint = document.getElementById("carouselHint");

    const info = {
      idx: document.getElementById("carIdx"),
      role: document.getElementById("carRole"),
      title: document.getElementById("carTitle"),
      desc: document.getElementById("carDesc"),
      tags: document.getElementById("carTags"),
    };
    const infoBox = document.getElementById("carInfo");
    const updateInfo = () => {
      const p = PROJECTS[focused];
      if (infoBox) infoBox.dataset.idx = focused;
      info.idx.textContent = `${String(focused + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}`;
      info.role.textContent = p.role;
      info.title.textContent = p.t;
      info.desc.textContent = p.d;
      info.tags.innerHTML = p.tags.map(t => `<span>${t}</span>`).join("");
    };

    // Front-facing card = where (i * step + rotation) ≈ 0  →  rotY = -focused * step
    const snap = () => {
      pos = -Math.round(group.rotation.y / step);
      focused = (pos % N + N) % N;
      targetRot = -pos * step;
      updateInfo();
    };
    const spinTo = (dir) => {
      pos += dir;                                 // button-driven: jump straight to target
      focused = (pos % N + N) % N;
      targetRot = -pos * step;
      vel = dir * 0.015;                          // small kick for momentum feel
      updateInfo();
    };
    document.getElementById("carPrev")?.addEventListener("click", () => spinTo(-1));
    document.getElementById("carNext")?.addEventListener("click", () => spinTo(1));

    canvas.addEventListener("pointerdown", e => {
      dragging = true; px = downX = e.clientX; vel = 0;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add("grabbing");
      if (hint) hint.style.opacity = 0;
    });
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    addEventListener("pointerup", e => {
      if (!dragging) return;
      dragging = false; canvas.classList.remove("grabbing");
      if (Math.abs(e.clientX - downX) < 6) {                     // a click, not a drag
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(cards)[0];
        if (hit) {
          const i = cards.indexOf(hit.object);
          if (i === focused) { window.__openCase && window.__openCase(i); return; }
          let d = i - focused; if (d > N / 2) d -= N; if (d < -N / 2) d += N;
          return spinTo(d);                                       // side card: bring it to the front
        }
      }
      snap();
    });
    canvas.addEventListener("pointermove", e => {
      if (dragging) { vel = (e.clientX - px) * speed; group.rotation.y += vel; px = e.clientX; }
    });

    const fit = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const fitD = 3.75 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);   // whole front card in view on narrow screens
      camera.position.z = radius + Math.max(3.35, fitD);
    };
    fit();
    addEventListener("resize", fit);
    window.__fitCarousel = fit;

    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!active.projects) return;
      const t = clock.getElapsedTime();
      if (!dragging) {
        vel *= 0.94;
        group.rotation.y += vel;
        // ease toward snapped target
        group.rotation.y += (targetRot - group.rotation.y) * 0.06;
      }
      cards.forEach((m, i) => {
        // face-forward emphasis + gentle float
        const behind = Math.cos((i * step) + group.rotation.y);
        m.position.y = Math.sin(t * 1.2 + i) * 0.05;
        m.material.opacity = 0.06 + Math.pow(Math.max(0, behind), 1.6) * 0.94;   // back of the ring fades out
        m.visible = behind > -0.2;
      });
      glow.material.opacity = 0.04 + Math.sin(t * 2) * 0.015;
      renderer.render(scene, camera);
    })();
    updateInfo();
  })();
})();
