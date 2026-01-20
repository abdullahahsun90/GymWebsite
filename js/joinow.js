/* =========================
   GymVerse — Join Now Page JS
   - Fill plan select
   - Save member in localStorage (append, not overwrite)
   - Validation + reset form
   ========================= */

(function () {
  "use strict";

  const { $, LS, KEYS, cryptoId, escapeHtml, escapeAttr, num } = window.GV;

  function fillPlanOptions() {
    const planSel = $("#planSelect");
    if (!planSel) return;

    const packages = LS.get(KEYS.PACKAGES, []);
    planSel.innerHTML =
      `<option value="">Select plan...</option>` +
      packages.map(p =>
        `<option value="${escapeAttr(p.name)}">${escapeHtml(p.name)} (PKR ${num(p.newPrice)})</option>`
      ).join("");
  }

  function validateJoin(d) {
    if (!d.fullName) return "Full Name is required.";
    if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email)) return "Valid Email is required.";
    if (!d.phone) return "Phone is required.";
    if (!d.plan) return "Please select a plan.";
    return "";
  }

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

      const err = validateJoin(data);
      if (err) {
        if (msg) { msg.style.color = "var(--danger)"; msg.textContent = err; }
        return;
      }

      const list = LS.get(KEYS.MEMBERS, []);
      list.push(data);                 // ✅ append (keeps old members)
      LS.set(KEYS.MEMBERS, list);

      form.reset();                    // ✅ clear inputs
      if (msg) { msg.style.color = "var(--ok)"; msg.textContent = "✅ Joined successfully! (Saved in localStorage)"; }
    });
  }

  fillPlanOptions();
  initJoinForm();

})();
