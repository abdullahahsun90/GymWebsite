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
