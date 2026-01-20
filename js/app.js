/* =========================
   GymVerse — Shared JS
   (Slider + Mobile Menu + LocalStorage Forms)
   ========================= */

(function () {
  "use strict";

  // ---------- Helpers ----------
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

  // ---------- Keys ----------
  const KEYS = {
    PACKAGES: "gv_packages",
    TRAINERS: "gv_trainers",
    MEMBERS: "gv_members",
    APPTS: "gv_appointments"
  };

  // ---------- Seed Data (only if not exists) ----------
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

  // ---------- Navigation helper (fix footer hash links issue) ----------
  window.goTo = function (ref) {
    if (!ref) return;

    // If anchor
    if (ref.startsWith("#")) {
      const isIndex = location.pathname.endsWith("index.html") || location.pathname === "/" || location.pathname.endsWith("/");
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

  // ---------- Mobile menu ----------
  function initMobileMenu() {
    const btn = $("#gvMenuBtn");
    const dd = $("#gvMobileMenu");
    if (!btn || !dd) return;

    btn.addEventListener("click", () => dd.classList.toggle("open"));
    // close on click
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

    // autoplay
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

    // init
    goToSlide(0);
    start();
  }

  // ---------- Render trainers on index ----------
  function renderTrainers() {
    const wrap = $("#trainersList");
    if (!wrap) return;

    const trainers = LS.get(KEYS.TRAINERS, []);
    wrap.innerHTML = trainers.map(t => {
      const initials = (t.name || "T").split(" ").slice(0,2).map(x => x[0]).join("").toUpperCase();
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

  // ---------- Render packages on packages page ----------
  function renderPackages() {
    const wrap = $("#packagesList");
    if (!wrap) return;

    const packages = LS.get(KEYS.PACKAGES, []);
    wrap.innerHTML = packages.map(p => `
      <div class="gv-package">
        <h3 style="margin:0;font-weight:1000;">${escapeHtml(p.name)}</h3>
        <div class="gv-price">
          <span class="gv-old">PKR ${num(p.oldPrice)}</span>
          <span class="gv-new">PKR ${num(p.newPrice)}</span>
        </div>
        <p class="gv-pack-desc">${escapeHtml(p.desc || "")}</p>
        <ul class="gv-ul">
          ${(p.features || []).map(f => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <button class="gv-btn gv-btn-primary" onclick="goTo('joinnow.html')">Join Now</button>
          <button class="gv-btn" onclick="goTo('appointment.html')">Book Appointment</button>
        </div>
      </div>
    `).join("");
  }

  // ---------- Populate selects (trainers/packages) ----------
  function fillSelectOptions() {
    const trainerSel = $("#trainerSelect");
    if (trainerSel) {
      const trainers = LS.get(KEYS.TRAINERS, []);
      trainerSel.innerHTML = `<option value="">Select trainer...</option>` +
        trainers.map(t => `<option value="${escapeAttr(t.name)}">${escapeHtml(t.name)} — ${escapeHtml(t.specialty || "")}</option>`).join("");
    }

    const planSel = $("#planSelect");
    if (planSel) {
      const packages = LS.get(KEYS.PACKAGES, []);
      planSel.innerHTML = `<option value="">Select plan...</option>` +
        packages.map(p => `<option value="${escapeAttr(p.name)}">${escapeHtml(p.name)} (PKR ${num(p.newPrice)})</option>`).join("");
    }
  }

  // ---------- Join Now form ----------
  function initJoinForm() {
    const form = $("#joinForm");
    if (!form) return;

    const msg = $("#joinMsg");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (msg) msg.textContent = "";

      const data = {
        id: cryptoId(),
        createdAt: new Date().toISOString(),
        fullName: $("#fullName")?.value.trim(),
        email: $("#email")?.value.trim(),
        phone: $("#phone")?.value.trim(),
        gender: $("#gender")?.value,
        age: $("#age")?.value.trim(),
        plan: $("#planSelect")?.value,
        notes: $("#notes")?.value.trim()
      };

      // basic validation
      const err = validateJoin(data);
      if (err) {
        if (msg) { msg.style.color = "var(--danger)"; msg.textContent = err; }
        return;
      }

      const list = LS.get(KEYS.MEMBERS, []);
      list.push(data);                 // IMPORTANT: push (does not replace old)
      LS.set(KEYS.MEMBERS, list);

      form.reset();
      if (msg) { msg.style.color = "var(--ok)"; msg.textContent = "✅ Joined successfully! (Saved in localStorage)"; }
    });
  }

  function validateJoin(d) {
    if (!d.fullName) return "Full Name is required.";
    if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email)) return "Valid Email is required.";
    if (!d.phone) return "Phone is required.";
    if (!d.plan) return "Please select a plan.";
    return "";
  }

  // ---------- Appointment form ----------
  function initAppointmentForm() {
    const form = $("#apptForm");
    if (!form) return;

    const msg = $("#apptMsg");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (msg) msg.textContent = "";

      const data = {
        id: cryptoId(),
        createdAt: new Date().toISOString(),
        memberName: $("#aName")?.value.trim(),
        email: $("#aEmail")?.value.trim(),
        phone: $("#aPhone")?.value.trim(),
        date: $("#aDate")?.value,
        time: $("#aTime")?.value,
        trainer: $("#trainerSelect")?.value,
        purpose: $("#aPurpose")?.value,
        message: $("#aMessage")?.value.trim(),
        status: "Pending"
      };

      const err = validateAppt(data);
      if (err) {
        if (msg) { msg.style.color = "var(--danger)"; msg.textContent = err; }
        return;
      }

      const list = LS.get(KEYS.APPTS, []);
      list.push(data);
      LS.set(KEYS.APPTS, list);

      form.reset();
      if (msg) { msg.style.color = "var(--ok)"; msg.textContent = "✅ Appointment booked! Status: Pending (Saved in localStorage)"; }
    });
  }

  function validateAppt(d) {
    if (!d.memberName) return "Name is required.";
    if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email)) return "Valid Email is required.";
    if (!d.phone) return "Phone is required.";
    if (!d.date) return "Date is required.";
    if (!d.time) return "Time is required.";
    if (!d.trainer) return "Please select a trainer.";
    if (!d.purpose) return "Purpose is required.";
    return "";
  }

  // ---------- Utils ----------
  function num(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return v ?? "";
    return n.toLocaleString("en-PK");
  }

  function cryptoId() {
    try {
      return (crypto && crypto.randomUUID) ? crypto.randomUUID() : ("id-" + Math.random().toString(16).slice(2));
    } catch {
      return "id-" + Math.random().toString(16).slice(2);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  // ---------- Boot ----------
  seedIfMissing();
  initMobileMenu();
  initSlider();
  renderTrainers();
  renderPackages();
  fillSelectOptions();
  initJoinForm();
  initAppointmentForm();

})();
