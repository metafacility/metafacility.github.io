// Interactive "car-configurator style" viewer for the XRD machine.
// Drag (or use the slider / buttons) to move: closed -> doors open -> close-up of the goniometer.
(function () {
  const root = document.getElementById("viewer");
  if (!root) return;

  /* ---------- Data: one entry per view ---------- */
  // Each view: image, aspect ratio (w/h) and hotspot positions in % of the image.
  // x,y = where the dot sits (on a plain surface); tx,ty = the actual part the arrow points at. All in % of the image.
  const VIEWS = [
    { src: "assets/img/machine-1.jpg", ratio: 2023 / 3105, alt: "Rigaku Ultima IV with doors closed",
      spots: [
        { x: 30, y: 3.5, tx: 13.8, ty: 3.5, t: "Status Beacon", d: "Red tower light that signals when the X-ray generator is on." },
        { x: 66, y: 44, tx: 53.5, ty: 51, t: "Door Lock", d: "Interlock — the doors stay locked while X-rays are being produced." },
        { x: 72, y: 65, tx: 87, ty: 73, t: "Main Power Switch", d: "Red/yellow rotary isolator for the X-ray unit." },
        { x: 32, y: 65, tx: 13, ty: 73, t: "Operate / Lamp Panel", d: "Indicates operating state of the instrument." },
      ] },
    { src: "assets/img/machine-2.jpg", ratio: 2462 / 2796, alt: "Rigaku Ultima IV with doors open",
      spots: [
        { x: 10, y: 38, tx: 28.5, ty: 43, t: "X-ray Tube", d: "Sealed Cu tube (Cu Kα, λ = 1.5406 Å) mounted on the goniometer." },
        { x: 40, y: 17, tx: 45, ty: 35.5, t: "Goniometer & Sample Stage", d: "Theta–theta goniometer; the sample sits flat at the centre." },
        { x: 55, y: 19, tx: 59.5, ty: 34, t: "Detector", d: "Receives the diffracted beam as the arm sweeps through 2θ." },
        { x: 85, y: 40, tx: 70, ty: 47, t: "Door Lock", d: "Interlock released only when the X-ray shutter is closed." },
      ] },
    { src: "assets/img/machine-3.jpg", ratio: 3278 / 2807, alt: "Close-up of the Rigaku Ultima IV goniometer",
      spots: [
        { x: 25, y: 94, tx: 13, ty: 82, t: "X-ray Tube Housing", d: "High-voltage tube housing — never open while powered." },
        { x: 10, y: 25, tx: 19.5, ty: 43, t: "CBO — Cross Beam Optics", d: "Switches between Bragg-Brentano and parallel-beam geometry." },
        { x: 38, y: 20, tx: 45, ty: 42, t: "Sample Holder", d: "Flat holder where powder or polished solid samples are mounted." },
        { x: 90, y: 25, tx: 89.5, ty: 40, t: "D/teX Ultra Detector", d: "High-speed silicon strip detector for fast, high-intensity scans." },
      ] },
  ];
  /* ---------- Element references and settings ---------- */
  const stage = root.querySelector(".v-stage");
  const rig = root.querySelector(".v-rig");
  const slider = root.querySelector("#vSlider");
  const tip = root.querySelector(".v-tip");
  const hint = root.querySelector(".v-hint");
  let active = null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Build layers, arrows and dots ---------- */
  const arrowOf = new WeakMap(); // dot button -> its arrow, used to highlight both together
  const layers = VIEWS.map((v, i) => {
    const layer = document.createElement("div");
    layer.className = "v-layer";
    const frame = document.createElement("div");
    frame.className = "v-frame";
    frame.style.setProperty("--r", v.ratio);
    const img = document.createElement("img");
    img.src = v.src; img.alt = v.alt; img.draggable = false;
    if (i > 0) img.loading = "lazy";
    frame.appendChild(img);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "v-arrows");
    svg.setAttribute("aria-hidden", "true");
    frame.appendChild(svg);
    const arrows = v.spots.map(() => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "v-arrow");
      ["halo", "line"].forEach((c) => {
        const ln = document.createElementNS(NS, "line");
        ln.setAttribute("class", c);
        g.appendChild(ln);
      });
      ["halo", "head"].forEach((c) => {
        const p = document.createElementNS(NS, "polygon");
        p.setAttribute("class", c);
        g.appendChild(p);
      });
      svg.appendChild(g);
      return g;
    });
    // Arrows are drawn in pixels so the arrowheads never get stretched
    function drawArrows() {
      const w = frame.clientWidth, h = frame.clientHeight;
      if (!w || !h) return;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      v.spots.forEach((s, k) => {
        const x1 = (s.x / 100) * w, y1 = (s.y / 100) * h, x2 = (s.tx / 100) * w, y2 = (s.ty / 100) * h;
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, hl = 11, hw = 5.5;
        const sx = x1 + ux * 8, sy = y1 + uy * 8;
        const bx = x2 - ux * hl, by = y2 - uy * hl;
        const pts = `${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`;
        arrows[k].querySelectorAll("line").forEach((ln) => {
          ln.setAttribute("x1", sx); ln.setAttribute("y1", sy); ln.setAttribute("x2", bx); ln.setAttribute("y2", by);
        });
        arrows[k].querySelectorAll("polygon").forEach((p) => p.setAttribute("points", pts));
      });
    }
    new ResizeObserver(drawArrows).observe(frame);
    const spots = v.spots.map((s, k) => {
      const b = document.createElement("button");
      arrowOf.set(b, arrows[k]);
      b.type = "button"; b.className = "v-spot";
      b.style.left = s.x + "%"; b.style.top = s.y + "%";
      b.setAttribute("aria-label", s.t);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (active === b) hideTip(); else showTip(s, b);
      });
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showTip(s, b); });
      b.addEventListener("pointerleave", () => hideTip());
      b.addEventListener("focus", () => showTip(s, b));
      b.addEventListener("blur", hideTip);
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      frame.appendChild(b);
      return b;
    });
    layer.appendChild(frame);
    rig.appendChild(layer);
    return { layer, frame, spots };
  });

  /* ---------- Popup text (placed so it never covers the dot or the part) ---------- */
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  let t = 0;

  function clearOn() {
    layers.forEach((l) => l.spots.forEach((b) => { b.classList.remove("on"); arrowOf.get(b).classList.remove("on"); }));
  }
  function hideTip() {
    tip.classList.remove("show");
    clearOn();
    active = null;
  }
  function showTip(s, btn) {
    clearOn();
    btn.classList.add("on");
    arrowOf.get(btn).classList.add("on");
    active = btn;
    tip.innerHTML = "<strong></strong><span></span>";
    tip.firstChild.textContent = s.t;
    tip.lastChild.textContent = s.d;
    tip.classList.add("show");
    const sr = stage.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const fr = btn.parentElement.getBoundingClientRect();
    // dot and target centres, relative to the stage
    const dx0 = br.left + br.width / 2 - sr.left, dy0 = br.top + br.height / 2 - sr.top;
    const tx0 = fr.left + (s.tx / 100) * fr.width - sr.left, ty0 = fr.top + (s.ty / 100) * fr.height - sr.top;
    const w = tip.offsetWidth, h = tip.offsetHeight, gap = 14, m = 6;
    // Try the side of the dot facing away from the target first so the popup never covers it
    const away = [Math.abs(dx0 - tx0) > Math.abs(dy0 - ty0)
      ? (dx0 > tx0 ? "right" : "left") : (dy0 > ty0 ? "below" : "above")];
    const order = away.concat(["above", "below", "right", "left"].filter((p) => p !== away[0]));
    const place = (p) => {
      let l, t;
      if (p === "above") { l = dx0 - w / 2; t = dy0 - gap - h; }
      else if (p === "below") { l = dx0 - w / 2; t = dy0 + gap; }
      else if (p === "right") { l = dx0 + gap; t = dy0 - h / 2; }
      else { l = dx0 - gap - w; t = dy0 - h / 2; }
      return { l: clamp(l, m, sr.width - w - m), t: clamp(t, m, sr.height - h - m) };
    };
    const covers = (r) => tx0 > r.l - 12 && tx0 < r.l + w + 12 && ty0 > r.t - 12 && ty0 < r.t + h + 12;
    const covered = (r) => covers(r) || (dx0 > r.l - 6 && dx0 < r.l + w + 6 && dy0 > r.t - 6 && dy0 < r.t + h + 6);
    let pos = null;
    for (const p of order) { const r = place(p); if (!covered(r)) { pos = r; break; } }
    if (!pos) pos = place(order[0]);
    tip.style.left = pos.l + "px";
    tip.style.top = pos.t + "px";
  }

  /* ---------- Crossfade + zoom between the 3 views ---------- */
  // t: 0 = closed, 0.5 = open, 1 = close-up
  let idleTimer;
  function apply(val) {
    hideTip();
    // GPU hint only while moving, to save memory on phones
    stage.classList.add("moving");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => stage.classList.remove("moving"), 300);
    t = clamp(val, 0, 1);
    slider.value = Math.round(t * 100);
    const a = clamp(t / 0.5, 0, 1);
    const b = clamp((t - 0.5) / 0.5, 0, 1);
    const op = [1 - a, a * (1 - clamp((b - 0.35) / 0.5, 0, 1)), clamp((b - 0.35) / 0.65, 0, 1)];
    const sc = [1 + a * 0.06, 1 + b * 1.1, 0.8 + 0.2 * b];
    const origin = ["50% 50%", "46% 37%", "50% 50%"];
    layers.forEach((l, i) => {
      l.layer.style.opacity = op[i];
      l.layer.style.transform = `scale(${sc[i]})`;
      l.layer.style.transformOrigin = origin[i];
      const live = op[i] > 0.6;
      l.layer.style.pointerEvents = live ? "auto" : "none";
      l.spots.forEach((s) => { s.style.opacity = live ? 1 : 0; s.tabIndex = live ? 0 : -1; });
    });
    root.querySelectorAll(".v-btn[data-t]").forEach((btn) => {
      btn.classList.toggle("active", Math.abs(parseFloat(btn.dataset.t) - t) < 0.25);
    });
  }

  /* ---------- Animation, drag, slider and button controls ---------- */
  let raf;
  function hideHint() { if (hint) hint.style.opacity = 0; }
  function animateTo(target) {
    hideHint();
    cancelAnimationFrame(raf);
    if (reduce) return apply(target);
    const from = t, start = performance.now(), dur = 900;
    const step = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      apply(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // Drag to scrub
  let dragging = false, startX = 0, startT = 0;
  stage.addEventListener("pointerdown", (e) => {
    hideTip();
    dragging = true; startX = e.clientX; startT = t;
    cancelAnimationFrame(raf);
    stage.setPointerCapture(e.pointerId);
    stage.classList.add("grabbing");
    hideHint();
  });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    if (dragging) {
      apply(startT + ((e.clientX - startX) / r.width) * 1.4);
    } else if (e.pointerType === "mouse" && !reduce) {
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rig.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 7}deg)`;
      stage.style.setProperty("--sx", (px + 0.5) * 100 + "%");
      stage.style.setProperty("--sy", (py + 0.5) * 100 + "%");
    }
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("grabbing");
    // Snap to nearest view
    animateTo(t < 0.25 ? 0 : t < 0.75 ? 0.5 : 1);
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", () => { if (!dragging) rig.style.transform = ""; });

  slider.addEventListener("input", () => { hideHint(); cancelAnimationFrame(raf); apply(slider.value / 100); });
  slider.addEventListener("change", () => animateTo(t < 0.25 ? 0 : t < 0.75 ? 0.5 : 1));
  root.querySelectorAll(".v-btn[data-t]").forEach((btn) =>
    btn.addEventListener("click", () => animateTo(parseFloat(btn.dataset.t))));
  // Show / hide the dots
  const dotsBtn = root.querySelector("#vDots");
  dotsBtn.addEventListener("click", () => {
    const off = stage.classList.toggle("no-dots");
    dotsBtn.textContent = off ? "Show dots" : "Hide dots";
    dotsBtn.setAttribute("aria-pressed", off);
    hideTip();
  });

  apply(0);
})();
