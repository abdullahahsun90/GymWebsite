/* =========================
   GymVerse — Core (Shared)
   - LocalStorage helpers
   - Keys
   - Seed data
   - goTo() for navbar/footer hash links
   - Common utils (escape, id, num)
   ========================= */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  };

  const KEYS = {
    PACKAGES: "gv_packages",
    TRAINERS: "gv_trainers",
    MEMBERS: "gv_members",
    APPTS: "gv_appointments"
  };

  function num(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return v ?? "";
    return n.toLocaleString("en-PK");
  }

  function cryptoId() {
    try {
      return (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : "id-" + Math.random().toString(16).slice(2);
    } catch {
      return "id-" + Math.random().toString(16).slice(2);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  // ---------- Seed data (only if missing) ----------
  function seedIfMissing() {
    const pkgs = LS.get(KEYS.PACKAGES, null);
    const trs = LS.get(KEYS.TRAINERS, null);

    if (!Array.isArray(pkgs) || pkgs.length === 0) {
      LS.set(KEYS.PACKAGES, [
        {
          name: "Starter",
          oldPrice: 12000,
          newPrice: 8999,
          desc: "Perfect for beginners who want a clean start.",
          features: ["Full gym access", "Basic diet guidance", "2 group classes/week"]
        },
        {
          name: "Pro",
          oldPrice: 18000,
          newPrice: 13999,
          desc: "Best value for serious training and progress.",
          features: ["Full gym access", "4 group classes/week", "Monthly body scan", "Trainer check-in"]
        },
        {
          name: "Elite",
          oldPrice: 25000,
          newPrice: 19999,
          desc: "Premium coaching + best results support.",
          features: ["Full gym access", "Unlimited classes", "1:1 coaching session/week", "Custom meal plan"]
        }
      ]);
    }

    if (!Array.isArray(trs) || trs.length === 0) {
      LS.set(KEYS.TRAINERS, [
        { name: "Ayesha Khan", specialty: "Strength & Conditioning", tags: ["Power", "Hypertrophy", "Form"] },
        { name: "Hamza Ali", specialty: "Fat Loss Coach", tags: ["HIIT", "Cutting", "Cardio"] },
        { name: "Sara Noor", specialty: "Yoga & Mobility", tags: ["Flexibility", "Recovery", "Posture"] }
      ]);
    }
  }

  // ---------- Navigation helper (footer hash links fix) ----------
  window.goTo = function (ref) {
    if (!ref) return;

    if (ref.startsWith("#")) {
      const isIndex =
        location.pathname.endsWith("index.html") ||
        location.pathname === "/" ||
        location.pathname.endsWith("/");

      if (isIndex) {
        const el = document.querySelector(ref);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        location.href = "index.html" + ref;
      }
      return;
    }

    location.href = ref;
  };

  // expose to other JS files
  window.GV = {
    $, $$, LS, KEYS,
    num, cryptoId, escapeHtml, escapeAttr,
    seedIfMissing
  };

  // run seed on every page safely
  seedIfMissing();

})();





/* =========================
   GymVerse — Home Page JS
   - Mobile menu
   - Slider
   - Trainers rendering
   ========================= */

(function () {
  "use strict";

  const { $, $$, LS, KEYS, escapeHtml } = window.GV;

  // ---------- Mobile menu ----------
  function initMobileMenu() {
    const btn = $("#gvMenuBtn");
    const dd = $("#gvMobileMenu");
    if (!btn || !dd) return;

    btn.addEventListener("click", () => dd.classList.toggle("open"));
    $$("#gvMobileMenu a").forEach(a => {
      a.addEventListener("click", () => dd.classList.remove("open"));
    });
  }

  // ---------- Slider ----------
  function initSlider() {
    const slider = $("#gvSlider");
    const track = $("#gvTrack");
    const prev = $("#gvPrev");
    const next = $("#gvNext");
    const dotsWrap = $("#gvDots");
    if (!slider || !track || !prev || !next || !dotsWrap) return;

    const slides = $$(".gv-slide", track);
    let idx = 0;
    let timer = null;
    const AUTOPLAY = 3500;

    // Build dots
    const dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Go to slide ${i + 1}`);
      b.addEventListener("click", () => goToSlide(i, true));
      dotsWrap.appendChild(b);
      return b;
    });

    function setActive() {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      dots.forEach((d, i) => d.setAttribute("aria-current", i === idx ? "true" : "false"));
    }

    function goToSlide(i, userAction = false) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = `translateX(${-idx * 100}%)`;
      setActive();
      if (userAction) restart();
    }

    function nextSlide() { goToSlide(idx + 1, true); }
    function prevSlide() { goToSlide(idx - 1, true); }

    prev.addEventListener("click", prevSlide);
    next.addEventListener("click", nextSlide);

    function start() {
      stop();
      timer = setInterval(() => goToSlide(idx + 1), AUTOPLAY);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function restart() { start(); }

    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", start);
    slider.addEventListener("focusin", stop);
    slider.addEventListener("focusout", start);

    // swipe
    let down = false, sx = 0, cx = 0;

    function onDown(x) {
      down = true; sx = x; cx = x;
      stop();
      track.style.transition = "none";
    }
    function onMove(x) {
      if (!down) return;
      cx = x;
      const dx = cx - sx;
      const pct = (dx / slider.clientWidth) * 100;
      track.style.transform = `translateX(${(-idx * 100) + pct}%)`;
    }
    function onUp() {
      if (!down) return;
      down = false;
      track.style.transition = "";
      const dx = cx - sx;
      const th = slider.clientWidth * 0.18;
      if (dx > th) prevSlide();
      else if (dx < -th) nextSlide();
      else goToSlide(idx);
      start();
    }

    slider.addEventListener("touchstart", (e) => onDown(e.touches[0].clientX), { passive: true });
    slider.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX), { passive: true });
    slider.addEventListener("touchend", onUp);

    slider.addEventListener("mousedown", (e) => onDown(e.clientX));
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", onUp);

    goToSlide(0);
    start();
  }

  // ---------- Render trainers on index ----------
  function renderTrainers() {
    const wrap = $("#trainersList");
    if (!wrap) return;

    const trainers = LS.get(KEYS.TRAINERS, []);
    wrap.innerHTML = trainers.map(t => {
      const initials = (t.name || "T")
        .split(" ")
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();

      const tags = Array.isArray(t.tags) ? t.tags : [];
      return `
        <div class="gv-trainer">
          <div class="gv-thead">
            <div class="gv-avatar">${initials}</div>
            <div>
              <p class="gv-tname">${escapeHtml(t.name)}</p>
              <p class="gv-tspec">${escapeHtml(t.specialty || "")}</p>
            </div>
          </div>
          <div class="gv-tmeta">
            ${tags.map(x => `<span class="gv-pill">${escapeHtml(x)}</span>`).join("")}
          </div>
        </div>
      `;
    }).join("");
  }

  // ---------- Boot ----------
  initMobileMenu();
  initSlider();
  renderTrainers();

})();
