/* =========================
   GymVerse — Appointment Page JS
   - Fill trainers select
   - Save appointment in localStorage
   - Validation + reset form
   ========================= */

(function () {
  "use strict";

  const { $, LS, KEYS, cryptoId, escapeHtml, escapeAttr } = window.GV;

  function fillTrainerOptions() {
    const trainerSel = $("#trainerSelect");
    if (!trainerSel) return;

    const trainers = LS.get(KEYS.TRAINERS, []);
    trainerSel.innerHTML =
      `<option value="">Select trainer...</option>` +
      trainers.map(t =>
        `<option value="${escapeAttr(t.name)}">${escapeHtml(t.name)} — ${escapeHtml(t.specialty || "")}</option>`
      ).join("");
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

  fillTrainerOptions();
  initAppointmentForm();

})();
