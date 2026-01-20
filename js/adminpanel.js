
/* =========================
   GymVerse Admin Panel (LocalStorage)
   - Login persists across refresh and tabs.
   - CRUD: Packages, Trainers
   - View: Members, Appointments
   - Offers + Stats + Charts
   ========================= */

(() => {
  "use strict";

  // ---------- Storage keys (match your website) ----------
  const KEYS = {
    PACKAGES: "gv_packages",
    TRAINERS: "gv_trainers",
    MEMBERS: "gv_members",
    APPTS: "gv_appointments",
    OFFERS: "gv_offers",

    // auth
    CREDS: "gv_admin_creds",
    AUTH: "gv_admin_auth"
  };

  // Legacy keys (your older admin panel)
  const LEGACY = {
    PKG: "gym_packages",
    TR: "gym_trainers",
    USERS: "gym_users",
    APPTS: "gym_appts",
    OFFERS: "gym_offers"
  };

  // ---------- DOM helpers ----------
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ---------- Safe localStorage ----------
  const LS = {
    get(k, fallback){
      try{
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : fallback;
      }catch{ return fallback; }
    },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };

  // ---------- UI ----------
  const authView = $("#authView");
  const appView = $("#appView");
  const loginForm = $("#loginForm");
  const loginMsg = $("#loginMsg");

  const logoutBtn = $("#logoutBtn");
  const sideNav = $("#sideNav");
  const globalSearch = $("#globalSearch");
  const whoami = $("#whoami");

  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.style.display="none", 2600);
  }

  // ---------- Crypto (password hash) ----------
  async function sha256Hex(str){
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function uuid(){
    try{ return crypto.randomUUID(); }catch{ return "id-" + Math.random().toString(16).slice(2); }
  }

  function num(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function toTags(str){
    return String(str ?? "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  }

  function formatDT(iso){
    try{ return new Date(iso).toLocaleString(); }catch{ return iso ?? ""; }
  }

  // ---------- Normalize (support both your older and newer data shapes) ----------
  function normalizePackage(p){
    // New shape target:
    // { id, name, category, oldPrice, newPrice, desc, features[] }
    if(!p) return null;
    const id = p.id || uuid();

    const name = p.name ?? p.pName ?? "";
    const category = p.category ?? p.cat ?? p.pCat ?? "";

    // legacy had "final" only
    const oldPrice = (p.oldPrice ?? p.old ?? p.price ?? p.final ?? p.pPrice);
    const newPrice = (p.newPrice ?? p.new ?? p.final ?? p.offerPrice ?? p.pPrice);

    const desc = p.desc ?? p.description ?? p.offerDesc ?? "";
    const features = Array.isArray(p.features) ? p.features : toTags(p.features);

    return { id, name, category, oldPrice: Number(oldPrice)||0, newPrice: Number(newPrice)||0, desc, features };
  }

  function normalizeTrainer(t){
    // {id,name,specialty,tags[]}
    if(!t) return null;
    const id = t.id || uuid();
    const name = t.name ?? "";
    const specialty = t.specialty ?? t.spec ?? "";
    const tags = Array.isArray(t.tags) ? t.tags : toTags(t.tags);
    return { id, name, specialty, tags };
  }

  function normalizeMember(m){
    // New joinnow.html saved as: { fullName,email,phone,plan,notes,createdAt,id... }
    // Legacy admin used: { memberName, email, phone, package, message, createdAt }
    if(!m) return null;
    const id = m.id || uuid();
    const createdAt = m.createdAt || new Date().toISOString();

    const fullName = m.fullName ?? m.memberName ?? "";
    const email = m.email ?? "";
    const phone = m.phone ?? "";
    const plan = m.plan ?? m.package ?? "";
    const notes = m.notes ?? m.message ?? "";

    return { id, createdAt, fullName, email, phone, plan, notes };
  }

  function normalizeAppt(a){
    // New appointment.html saved as:
    // { memberName,email,phone,date,time,trainer,purpose,message,status,createdAt,id }
    // Legacy admin used same mostly.
    if(!a) return null;
    const id = a.id || uuid();
    const createdAt = a.createdAt || new Date().toISOString();

    const memberName = a.memberName ?? a.name ?? "";
    const email = a.email ?? "";
    const phone = a.phone ?? "";
    const date = a.date ?? "";
    const time = a.time ?? "";
    const trainer = a.trainer ?? "";
    const purpose = a.purpose ?? "";
    const message = a.message ?? "";
    const status = a.status ?? "Pending";

    return { id, createdAt, memberName, email, phone, date, time, trainer, purpose, message, status };
  }

  // ---------- Migration from old keys to new keys ----------
  function migrateLegacy(){
    const newPkgs = LS.get(KEYS.PACKAGES, []);
    const newTrs  = LS.get(KEYS.TRAINERS, []);
    const newMems = LS.get(KEYS.MEMBERS, []);
    const newAppt = LS.get(KEYS.APPTS, []);
    const newOff  = LS.get(KEYS.OFFERS, []);

    // If already have new data, keep it.
    // Only migrate if new is empty AND legacy has data.
    const legacyPkgs = LS.get(LEGACY.PKG, []);
    const legacyTrs  = LS.get(LEGACY.TR, []);
    const legacyUsers= LS.get(LEGACY.USERS, []);
    const legacyAppt = LS.get(LEGACY.APPTS, []);
    const legacyOff  = LS.get(LEGACY.OFFERS, []);

    if((!newPkgs || newPkgs.length===0) && legacyPkgs.length){
      LS.set(KEYS.PACKAGES, legacyPkgs.map(normalizePackage).filter(Boolean));
    }
    if((!newTrs || newTrs.length===0) && legacyTrs.length){
      LS.set(KEYS.TRAINERS, legacyTrs.map(normalizeTrainer).filter(Boolean));
    }
    if((!newMems || newMems.length===0) && legacyUsers.length){
      LS.set(KEYS.MEMBERS, legacyUsers.map(normalizeMember).filter(Boolean));
    }
    if((!newAppt || newAppt.length===0) && legacyAppt.length){
      LS.set(KEYS.APPTS, legacyAppt.map(normalizeAppt).filter(Boolean));
    }
    if((!newOff || newOff.length===0) && legacyOff.length){
      LS.set(KEYS.OFFERS, legacyOff);
    }
  }

  // ---------- Seed defaults (if missing) ----------
  function seedDefaults(){
    const pkgs = LS.get(KEYS.PACKAGES, []);
    const trs  = LS.get(KEYS.TRAINERS, []);
    const offs = LS.get(KEYS.OFFERS, []);

    if(!Array.isArray(pkgs) || pkgs.length===0){
      LS.set(KEYS.PACKAGES, [
        normalizePackage({
          name:"Starter", category:"Monthly", oldPrice:12000, newPrice:8999,
          desc:"Perfect for beginners who want a clean start.",
          features:["Full gym access","Basic diet guidance","2 group classes/week"]
        }),
        normalizePackage({
          name:"Pro", category:"Monthly", oldPrice:18000, newPrice:13999,
          desc:"Best value for serious training and progress.",
          features:["Full gym access","4 group classes/week","Monthly body scan","Trainer check-in"]
        }),
        normalizePackage({
          name:"Elite", category:"Monthly", oldPrice:25000, newPrice:19999,
          desc:"Premium coaching + best results support.",
          features:["Full gym access","Unlimited classes","1:1 coaching session/week","Custom meal plan"]
        })
      ]);
    }

    if(!Array.isArray(trs) || trs.length===0){
      LS.set(KEYS.TRAINERS, [
        normalizeTrainer({ name:"Ayesha Khan", specialty:"Strength & Conditioning", tags:["Power","Hypertrophy","Form"]}),
        normalizeTrainer({ name:"Hamza Ali", specialty:"Fat Loss Coach", tags:["HIIT","Cutting","Cardio"]}),
        normalizeTrainer({ name:"Sara Noor", specialty:"Yoga & Mobility", tags:["Flexibility","Recovery","Posture"]})
      ]);
    }

    if(!Array.isArray(offs)) LS.set(KEYS.OFFERS, []);
  }

  // ---------- Admin credentials ----------
  async function ensureCreds(){
    const creds = LS.get(KEYS.CREDS, null);
    if(creds && creds.user && creds.hash && creds.salt) return;

    // Default credentials
    const user = "Abdullah";
    const pass = "2410";
    const salt = uuid();
    const hash = await sha256Hex(pass + "|" + salt);

    LS.set(KEYS.CREDS, { user, salt, hash, updatedAt: new Date().toISOString() });
  }

  function getAuth(){
    const auth = LS.get(KEYS.AUTH, null);
    if(!auth || !auth.token || !auth.expiresAt) return null;
    const now = Date.now();
    if(now > auth.expiresAt){
      localStorage.removeItem(KEYS.AUTH);
      return null;
    }
    return auth;
  }

  function setAuth(user, days){
    const now = Date.now();
    const expiresAt = now + (days * 24 * 60 * 60 * 1000);
    const token = uuid();
    LS.set(KEYS.AUTH, { user, token, issuedAt: now, expiresAt });
  }

  function logout(){
    localStorage.removeItem(KEYS.AUTH);
    showAuth();
  }

  // ---------- View switching ----------
  function showAuth(){
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    $("#loginUser").focus();
  }
  function showApp(){
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    const auth = getAuth();
    whoami.textContent = auth?.user ? ("Admin: " + auth.user) : "Admin";
    switchView("dashboard");
  }

  function switchView(name){
    $$(".view").forEach(v => v.classList.add("hidden"));
    $("#view-" + name)?.classList.remove("hidden");

    $$("#sideNav button").forEach(b => b.classList.toggle("active", b.dataset.view === name));

    // reset search
    globalSearch.value = "";
    renderAll();
  }

  // ---------- Data loads ----------
  function loadPackages(){
    const pkgs = LS.get(KEYS.PACKAGES, []).map(normalizePackage).filter(Boolean);
    // keep normalized on disk
    LS.set(KEYS.PACKAGES, pkgs);
    return pkgs;
  }
  function loadTrainers(){
    const trs = LS.get(KEYS.TRAINERS, []).map(normalizeTrainer).filter(Boolean);
    LS.set(KEYS.TRAINERS, trs);
    return trs;
  }
  function loadMembers(){
    const mems = LS.get(KEYS.MEMBERS, []).map(normalizeMember).filter(Boolean);
    LS.set(KEYS.MEMBERS, mems);
    return mems;
  }
  function loadAppts(){
    const appts = LS.get(KEYS.APPTS, []).map(normalizeAppt).filter(Boolean);
    LS.set(KEYS.APPTS, appts);
    return appts;
  }
  function loadOffers(){
    const off = LS.get(KEYS.OFFERS, []);
    if(!Array.isArray(off)) return [];
    return off;
  }

  // ---------- Render (Dashboard) ----------
  let joinsChart=null, apptChart=null, plansChart=null;

  function renderDashboard(filter=""){
    const pkgs = loadPackages();
    const trs  = loadTrainers();
    const mems = loadMembers();
    const appts= loadAppts();

    const now = Date.now();
    const d7 = now - 7*24*60*60*1000;

    const new7 = mems.filter(m => new Date(m.createdAt).getTime() >= d7).length;

    const statusCount = { Pending:0, Confirmed:0, Done:0, Cancelled:0 };
    appts.forEach(a => {
      const s = (a.status || "Pending").trim();
      if(statusCount[s] == null) statusCount[s]=0;
      statusCount[s]++;
    });

    // Revenue estimate: sum package newPrice by member plan
    const pkgMap = new Map(pkgs.map(p => [p.name, p]));
    let revenue = 0;
    mems.forEach(m => {
      const p = pkgMap.get(m.plan);
      if(p) revenue += (Number(p.newPrice)||0);
    });

    const kpis = [
      { title:"Total Members", value: mems.length, tag: `+${new7} last 7d` },
      { title:"Packages", value: pkgs.length, tag: "Active" },
      { title:"Trainers", value: trs.length, tag: "Profiles" },
      { title:"Appointments", value: appts.length, tag: `${statusCount.Pending} pending` },
      { title:"Confirmed", value: statusCount.Confirmed, tag: "Booked" },
      { title:"Done", value: statusCount.Done, tag: "Completed" },
      { title:"Cancelled", value: statusCount.Cancelled, tag: "Closed" },
      { title:"Revenue (est.)", value: "PKR " + revenue.toLocaleString("en-PK"), tag: "From joins" }
    ];

    const kpiGrid = $("#kpiGrid");
    kpiGrid.innerHTML = kpis.map(k => `
      <div class="card">
        <div class="kpi">
          <div>
            <div class="t">${esc(k.title)}</div>
            <div class="v">${esc(k.value)}</div>
          </div>
          <div class="tag">${esc(k.tag)}</div>
        </div>
      </div>
    `).join("");

    // Upcoming appointments (next 10 by date/time)
    const upcoming = appts
      .filter(a => a.date)
      .slice()
      .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))
      .slice(0,10);

    const upRows = $("#upcomingRows");
    upRows.innerHTML = upcoming.length ? upcoming.map(a => `
      <tr>
        <td class="left">${esc(a.memberName)}</td>
        <td>${esc(a.date||"-")}</td>
        <td>${esc(a.time||"-")}</td>
        <td class="left">${esc(a.trainer||"-")}</td>
        <td>${statusBadge(a.status)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5">No upcoming appointments</td></tr>`;

    // Charts data
    renderCharts(mems, appts, pkgs);
  }

  function statusBadge(s){
    const st = (s || "Pending").trim();
    const cls =
      st==="Pending" ? "bPending" :
      st==="Confirmed" ? "bConfirmed" :
      st==="Done" ? "bDone" :
      st==="Cancelled" ? "bCancelled" : "";
    return `<span class="badge ${cls}">${esc(st)}</span>`;
  }

  function buildLastNDays(n){
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    for(let i=n-1;i>=0;i--){
      const d = new Date(today.getTime() - i*24*60*60*1000);
      const key = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString(undefined, { month:"short", day:"numeric" });
      days.push({ key, label });
    }
    return days;
  }

  function renderCharts(mems, appts, pkgs){
    // Joins last 14 days
    const days = buildLastNDays(14);
    const joinCounts = days.map(d => mems.filter(m => (m.createdAt||"").slice(0,10) === d.key).length);

    // Appt status
    const st = { Pending:0, Confirmed:0, Done:0, Cancelled:0 };
    appts.forEach(a => {
      const s = (a.status || "Pending").trim();
      if(st[s]==null) st[s]=0;
      st[s]++;
    });

    // Members by plan
    const byPlan = {};
    mems.forEach(m => {
      const k = m.plan || "(No plan)";
      byPlan[k] = (byPlan[k]||0) + 1;
    });
    const planLabels = Object.keys(byPlan);
    const planVals = planLabels.map(k => byPlan[k]);

    // Destroy previous charts to avoid duplication
    if(joinsChart) joinsChart.destroy();
    if(apptChart) apptChart.destroy();
    if(plansChart) plansChart.destroy();

    joinsChart = new Chart($("#chartJoins"), {
      type: "line",
      data: {
        labels: days.map(d => d.label),
        datasets: [{ label: "Joins", data: joinCounts, tension: 0.35 }]
      },
      options: {
        responsive:true,
        plugins: { legend: { labels: { color: "#eaf0ff" } } },
        scales: {
          x: { ticks: { color: "rgba(234,240,255,.75)" }, grid: { color: "rgba(255,255,255,.06)" } },
          y: { ticks: { color: "rgba(234,240,255,.75)" }, grid: { color: "rgba(255,255,255,.06)" }, beginAtZero:true }
        }
      }
    });

    apptChart = new Chart($("#chartAppts"), {
      type: "doughnut",
      data: {
        labels: ["Pending","Confirmed","Done","Cancelled"],
        datasets: [{ data: [st.Pending, st.Confirmed, st.Done, st.Cancelled] }]
      },
      options: {
        responsive:true,
        plugins: { legend: { labels: { color: "#eaf0ff" } } }
      }
    });

    plansChart = new Chart($("#chartPlans"), {
      type: "bar",
      data: {
        labels: planLabels,
        datasets: [{ label: "Members", data: planVals }]
      },
      options: {
        responsive:true,
        plugins: { legend: { labels: { color: "#eaf0ff" } } },
        scales: {
          x: { ticks: { color: "rgba(234,240,255,.75)" }, grid: { color: "rgba(255,255,255,.06)" } },
          y: { ticks: { color: "rgba(234,240,255,.75)" }, grid: { color: "rgba(255,255,255,.06)" }, beginAtZero:true }
        }
      }
    });
  }

  // ---------- Render (Packages) ----------
  function renderPackages(filter=""){
    const pkgs = loadPackages();
    const rows = $("#pkgRows");

    const f = (filter||"").toLowerCase();

    const list = pkgs.filter(p => {
      if(!f) return true;
      return (
        (p.name||"").toLowerCase().includes(f) ||
        (p.category||"").toLowerCase().includes(f) ||
        (p.desc||"").toLowerCase().includes(f) ||
        (p.features||[]).join(",").toLowerCase().includes(f)
      );
    });

    rows.innerHTML = list.length ? list.map(p => `
      <tr>
        <td class="left"><b>${esc(p.name)}</b></td>
        <td>${esc(p.category||"-")}</td>
        <td>PKR ${(p.oldPrice||0).toLocaleString("en-PK")}</td>
        <td>PKR ${(p.newPrice||0).toLocaleString("en-PK")}</td>
        <td class="left">${esc(p.desc||"")}</td>
        <td class="left">${esc((p.features||[]).join(", "))}</td>
        <td>
          <button class="miniBtn miniPrimary" onclick="__editPkg('${p.id}')">Edit</button>
          <button class="miniBtn miniDanger" onclick="__delPkg('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7">No packages</td></tr>`;

    // update offer dropdown
    const offerSel = $("#offerPkg");
    offerSel.innerHTML = `<option value="">Select package...</option>` +
      pkgs.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");

    // small note
    $("#pkgNote").textContent = `Total packages: ${pkgs.length}`;
  }

  // ---------- Render (Offers) ----------
  function renderOffers(filter=""){
    const offers = loadOffers();
    const f = (filter||"").toLowerCase();
    const rows = $("#offerRows");

    const list = offers.filter(o => {
      if(!f) return true;
      return (
        (o.packageName||"").toLowerCase().includes(f) ||
        (o.description||"").toLowerCase().includes(f)
      );
    });

    rows.innerHTML = list.length ? list.slice().reverse().map(o => `
      <tr>
        <td class="left"><b>${esc(o.packageName||"-")}</b></td>
        <td class="left">${esc(o.description||"")}</td>
        <td>PKR ${(Number(o.oldPrice)||0).toLocaleString("en-PK")}</td>
        <td>PKR ${(Number(o.newPrice)||0).toLocaleString("en-PK")}</td>
        <td>${formatDT(o.createdAt)}</td>
      </tr>
    `).join("") : `<tr><td colspan="5">No offers yet</td></tr>`;
  }

  // ---------- Render (Trainers) ----------
  function renderTrainers(filter=""){
    const trs = loadTrainers();
    const f = (filter||"").toLowerCase();
    const rows = $("#tRows");

    const list = trs.filter(t => {
      if(!f) return true;
      return (
        (t.name||"").toLowerCase().includes(f) ||
        (t.specialty||"").toLowerCase().includes(f) ||
        (t.tags||[]).join(",").toLowerCase().includes(f)
      );
    });

    rows.innerHTML = list.length ? list.map(t => `
      <tr>
        <td class="left"><b>${esc(t.name)}</b></td>
        <td class="left">${esc(t.specialty||"-")}</td>
        <td class="left">${esc((t.tags||[]).join(", "))}</td>
        <td>
          <button class="miniBtn miniPrimary" onclick="__editTrainer('${t.id}')">Edit</button>
          <button class="miniBtn miniDanger" onclick="__delTrainer('${t.id}')">Delete</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="4">No trainers</td></tr>`;
  }

  // ---------- Render (Members) ----------
  function renderMembers(filter=""){
    const mems = loadMembers();
    const f = (filter||"").toLowerCase();
    const rows = $("#memberRows");

    const list = mems.filter(m => {
      if(!f) return true;
      return (
        (m.fullName||"").toLowerCase().includes(f) ||
        (m.email||"").toLowerCase().includes(f) ||
        (m.phone||"").toLowerCase().includes(f) ||
        (m.plan||"").toLowerCase().includes(f) ||
        (m.notes||"").toLowerCase().includes(f)
      );
    });

    rows.innerHTML = list.length ? list.slice().reverse().map(m => `
      <tr>
        <td class="left"><b>${esc(m.fullName)}</b></td>
        <td>${esc(m.phone||"-")}</td>
        <td class="left">${esc(m.email||"-")}</td>
        <td>${esc(m.plan||"-")}</td>
        <td class="left">${esc(m.notes||"")}</td>
        <td>${formatDT(m.createdAt)}</td>
      </tr>
    `).join("") : `<tr><td colspan="6">No members yet</td></tr>`;
  }

  // ---------- Render (Appointments) ----------
  function renderAppointments(filter=""){
    const appts = loadAppts();
    const f = (filter||"").toLowerCase();
    const rows = $("#apptRows");

    const counts = appts.reduce((acc,a)=>{
      const s = (a.status||"Pending").trim();
      acc[s] = (acc[s]||0)+1;
      return acc;
    }, {});
    $("#apptSummary").textContent = `Total: ${appts.length} | Pending: ${counts.Pending||0} | Confirmed: ${counts.Confirmed||0} | Done: ${counts.Done||0} | Cancelled: ${counts.Cancelled||0}`;

    const list = appts.filter(a => {
      if(!f) return true;
      return (
        (a.memberName||"").toLowerCase().includes(f) ||
        (a.email||"").toLowerCase().includes(f) ||
        (a.trainer||"").toLowerCase().includes(f) ||
        (a.purpose||"").toLowerCase().includes(f) ||
        (a.status||"").toLowerCase().includes(f)
      );
    });

    rows.innerHTML = list.length ? list.slice().reverse().map(a => {
      const canConfirm = (a.status||"Pending") === "Pending";
      const canDone = (a.status||"") === "Confirmed";
      const canCancel = (a.status||"") !== "Cancelled" && (a.status||"") !== "Done";

      return `
        <tr>
          <td class="left"><b>${esc(a.memberName)}</b><div style="opacity:.7;font-weight:900">${esc(a.phone||"")}</div></td>
          <td class="left">${esc(a.email||"-")}</td>
          <td>${esc(a.date||"-")}</td>
          <td>${esc(a.time||"-")}</td>
          <td class="left">${esc(a.trainer||"-")}</td>
          <td class="left">${esc(a.purpose||"-")}</td>
          <td>${statusBadge(a.status)}</td>
          <td>
            ${canConfirm ? `<button class="miniBtn miniPrimary" onclick="__confirmAppt('${a.id}')">Confirm</button>` : ``}
            ${canDone ? `<button class="miniBtn" onclick="__doneAppt('${a.id}')">Mark Done</button>` : ``}
            ${canCancel ? `<button class="miniBtn miniDanger" onclick="__cancelAppt('${a.id}')">Cancel</button>` : ``}
            <button class="miniBtn" onclick="__delAppt('${a.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="8">No appointments</td></tr>`;
  }

  // ---------- Search routing ----------
  function currentViewName(){
    const btn = $$("#sideNav button").find(b => b.classList.contains("active"));
    return btn ? btn.dataset.view : "dashboard";
  }

  function renderAll(){
    const f = globalSearch.value.trim();
    const view = currentViewName();

    if(view==="dashboard") renderDashboard(f);
    if(view==="packages") renderPackages(f);
    if(view==="offers") renderOffers(f);
    if(view==="trainers") renderTrainers(f);
    if(view==="members") renderMembers(f);
    if(view==="appointments") renderAppointments(f);
    if(view==="settings"){
      // no table filtering needed
      renderDashboard(""); // keep charts in memory if user returns
    }
  }

  // ---------- CRUD handlers (Packages) ----------
  const pkgForm = $("#pkgForm");
  const pkgResetBtn = $("#pkgResetBtn");

  window.__editPkg = (id) => {
    const pkgs = loadPackages();
    const p = pkgs.find(x => x.id === id);
    if(!p) return;

    $("#pkgId").value = p.id;
    $("#pkgName").value = p.name || "";
    $("#pkgCat").value = p.category || "";
    $("#pkgOld").value = p.oldPrice || "";
    $("#pkgNew").value = p.newPrice || "";
    $("#pkgDesc").value = p.desc || "";
    $("#pkgFeatures").value = (p.features||[]).join(", ");

    toast("Package loaded for edit.");
    switchView("packages");
  };

  window.__delPkg = (id) => {
    if(!confirm("Delete this package?")) return;
    const pkgs = loadPackages().filter(x => x.id !== id);
    LS.set(KEYS.PACKAGES, pkgs);
    toast("Package deleted.");
    renderAll();
  };

  function clearPkgForm(){
    $("#pkgId").value = "";
    $("#pkgName").value = "";
    $("#pkgCat").value = "";
    $("#pkgOld").value = "";
    $("#pkgNew").value = "";
    $("#pkgDesc").value = "";
    $("#pkgFeatures").value = "";
  }

  pkgResetBtn.addEventListener("click", clearPkgForm);

  pkgForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = $("#pkgId").value || uuid();
    const name = $("#pkgName").value.trim();
    const category = $("#pkgCat").value.trim();
    const oldPrice = num($("#pkgOld").value.trim());
    const newPrice = num($("#pkgNew").value.trim());
    const desc = $("#pkgDesc").value.trim();
    const features = toTags($("#pkgFeatures").value);

    if(!name) return toast("Package name required.");
    if(!category) return toast("Category required.");
    if(!Number.isFinite(oldPrice) || oldPrice <= 0) return toast("Valid old price required.");
    if(!Number.isFinite(newPrice) || newPrice <= 0) return toast("Valid new price required.");
    if(newPrice >= oldPrice) return toast("Rule: new price must be LESS than old price.");

    const pkgs = loadPackages();
    const idx = pkgs.findIndex(x => x.id === id);

    const item = normalizePackage({ id, name, category, oldPrice, newPrice, desc, features });

    // Unique name check (prevent duplicates)
    const dup = pkgs.find(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== id);
    if(dup) return toast("A package with same name already exists.");

    if(idx >= 0) pkgs[idx] = item;
    else pkgs.push(item);

    LS.set(KEYS.PACKAGES, pkgs);
    clearPkgForm();
    toast("Package saved.");
    renderAll();
  });

  // ---------- Offers ----------
  $("#offerForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const pkgId = $("#offerPkg").value;
    const desc = $("#offerDesc").value.trim();
    const newP = num($("#offerPrice").value.trim());

    if(!pkgId) return toast("Select a package.");
    if(!desc) return toast("Offer description required.");
    if(!Number.isFinite(newP) || newP <= 0) return toast("Valid discounted price required.");

    const pkgs = loadPackages();
    const p = pkgs.find(x => x.id === pkgId);
    if(!p) return toast("Package not found.");

    const oldPrice = Number(p.oldPrice)||0;
    const currentNew = Number(p.newPrice)||0;

    if(newP >= oldPrice) return toast(`Discount must be less than old price (${oldPrice}).`);
    if(newP >= currentNew) return toast(`Discount must be less than current new price (${currentNew}).`);

    const before = p.newPrice;
    p.newPrice = newP;

    LS.set(KEYS.PACKAGES, pkgs);

    const offers = loadOffers();
    offers.push({
      id: uuid(),
      packageId: pkgId,
      packageName: p.name,
      oldPrice: oldPrice,
      prevNewPrice: before,
      newPrice: newP,
      description: desc,
      createdAt: new Date().toISOString()
    });
    LS.set(KEYS.OFFERS, offers);

    $("#offerPkg").value = "";
    $("#offerDesc").value = "";
    $("#offerPrice").value = "";

    toast("Offer applied and saved.");
    renderAll();
  });

  // ---------- CRUD handlers (Trainers) ----------
  const trainerForm = $("#trainerForm");
  const tResetBtn = $("#tResetBtn");

  window.__editTrainer = (id) => {
    const trs = loadTrainers();
    const t = trs.find(x => x.id === id);
    if(!t) return;

    $("#tId").value = t.id;
    $("#tName").value = t.name || "";
    $("#tSpec").value = t.specialty || "";
    $("#tTags").value = (t.tags||[]).join(", ");

    toast("Trainer loaded for edit.");
    switchView("trainers");
  };

  window.__delTrainer = (id) => {
    if(!confirm("Delete this trainer?")) return;
    const trs = loadTrainers().filter(x => x.id !== id);
    LS.set(KEYS.TRAINERS, trs);
    toast("Trainer deleted.");
    renderAll();
  };

  function clearTrainerForm(){
    $("#tId").value = "";
    $("#tName").value = "";
    $("#tSpec").value = "";
    $("#tTags").value = "";
  }
  tResetBtn.addEventListener("click", clearTrainerForm);

  trainerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = $("#tId").value || uuid();
    const name = $("#tName").value.trim();
    const specialty = $("#tSpec").value.trim();
    const tags = toTags($("#tTags").value);

    if(!name) return toast("Trainer name required.");
    if(!specialty) return toast("Trainer specialty required.");

    const trs = loadTrainers();
    const idx = trs.findIndex(x => x.id === id);

    const dup = trs.find(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== id);
    if(dup) return toast("A trainer with same name already exists.");

    const item = normalizeTrainer({ id, name, specialty, tags });

    if(idx >= 0) trs[idx] = item;
    else trs.push(item);

    LS.set(KEYS.TRAINERS, trs);
    clearTrainerForm();
    toast("Trainer saved.");
    renderAll();
  });

  // ---------- Appointments actions ----------
  window.__confirmAppt = (id) => {
    const appts = loadAppts();
    const a = appts.find(x => x.id === id);
    if(!a) return;
    a.status = "Confirmed";
    LS.set(KEYS.APPTS, appts);
    alert(`Confirmation email simulated:\nSent to ${a.email}\nAppointment confirmed for ${a.date} ${a.time}.`);
    toast("Appointment confirmed.");
    renderAll();
  };

  window.__doneAppt = (id) => {
    const appts = loadAppts();
    const a = appts.find(x => x.id === id);
    if(!a) return;
    a.status = "Done";
    LS.set(KEYS.APPTS, appts);
    toast("Marked as Done.");
    renderAll();
  };

  window.__cancelAppt = (id) => {
    const appts = loadAppts();
    const a = appts.find(x => x.id === id);
    if(!a) return;
    if(!confirm("Cancel this appointment?")) return;
    a.status = "Cancelled";
    LS.set(KEYS.APPTS, appts);
    toast("Appointment cancelled.");
    renderAll();
  };

  window.__delAppt = (id) => {
    if(!confirm("Delete this appointment permanently?")) return;
    const appts = loadAppts().filter(x => x.id !== id);
    LS.set(KEYS.APPTS, appts);
    toast("Appointment deleted.");
    renderAll();
  };

  $("#seedDoneBtn").addEventListener("click", () => {
    const appts = loadAppts();
    if(appts.some(x => x.status === "Done")) return toast("Done appointment already exists.");
    appts.push(normalizeAppt({
      memberName:"Ali", email:"ali@mail.com", phone:"+92-300-0000000",
      trainer:"Ayesha Khan", purpose:"Fitness Plan",
      date:"2026-01-15", time:"10:00",
      status:"Done", createdAt: new Date().toISOString()
    }));
    LS.set(KEYS.APPTS, appts);
    toast("Dummy Done appointment added.");
    renderAll();
  });

  $("#clearApptsBtn").addEventListener("click", () => {
    if(!confirm("Clear ALL appointments?")) return;
    LS.set(KEYS.APPTS, []);
    toast("All appointments cleared.");
    renderAll();
  });

  // ---------- Export / Import ----------
  $("#exportBtn").addEventListener("click", async () => {
    const payload = {
      [KEYS.PACKAGES]: loadPackages(),
      [KEYS.TRAINERS]: loadTrainers(),
      [KEYS.MEMBERS]: loadMembers(),
      [KEYS.APPTS]: loadAppts(),
      [KEYS.OFFERS]: loadOffers()
    };
    const txt = JSON.stringify(payload, null, 2);
    await navigator.clipboard.writeText(txt);
    toast("Export JSON copied to clipboard.");
  });

  $("#importBtn").addEventListener("click", () => {
    const box = $("#importBox");
    const msg = $("#importMsg");
    msg.textContent = "";

    let obj;
    try{ obj = JSON.parse(box.value.trim()); }
    catch{ msg.textContent = "Invalid JSON."; msg.style.color = "var(--danger)"; return; }

    const pkgs = (obj[KEYS.PACKAGES] || []).map(normalizePackage).filter(Boolean);
    const trs  = (obj[KEYS.TRAINERS] || []).map(normalizeTrainer).filter(Boolean);
    const mems = (obj[KEYS.MEMBERS] || []).map(normalizeMember).filter(Boolean);
    const appts= (obj[KEYS.APPTS] || []).map(normalizeAppt).filter(Boolean);
    const offers = Array.isArray(obj[KEYS.OFFERS]) ? obj[KEYS.OFFERS] : [];

    LS.set(KEYS.PACKAGES, pkgs);
    LS.set(KEYS.TRAINERS, trs);
    LS.set(KEYS.MEMBERS, mems);
    LS.set(KEYS.APPTS, appts);
    LS.set(KEYS.OFFERS, offers);

    msg.textContent = "✅ Imported successfully.";
    msg.style.color = "var(--ok)";
    toast("Data imported.");
    renderAll();
  });

  $("#wipeAllBtn").addEventListener("click", () => {
    if(!confirm("Wipe ALL gym data? (packages/trainers/members/appointments/offers)")) return;
    localStorage.removeItem(KEYS.PACKAGES);
    localStorage.removeItem(KEYS.TRAINERS);
    localStorage.removeItem(KEYS.MEMBERS);
    localStorage.removeItem(KEYS.APPTS);
    localStorage.removeItem(KEYS.OFFERS);
    toast("All gym data wiped.");
    seedDefaults();
    renderAll();
  });

  // ---------- Change password ----------
  $("#pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#pwMsg");
    msg.textContent = "";

    const current = $("#pwCurrent").value;
    const n1 = $("#pwNew").value;
    const n2 = $("#pwNew2").value;

    if(!current || !n1 || !n2) { msg.textContent="All fields required."; msg.style.color="var(--danger)"; return; }
    if(n1.length < 3) { msg.textContent="New password must be at least 4 chars."; msg.style.color="var(--danger)"; return; }
    if(n1 !== n2) { msg.textContent="New passwords do not match."; msg.style.color="var(--danger)"; return; }

    const creds = LS.get(KEYS.CREDS, null);
    if(!creds) { msg.textContent="Credentials missing."; msg.style.color="var(--danger)"; return; }

    const curHash = await sha256Hex(current + "|" + creds.salt);
    if(curHash !== creds.hash){
      msg.textContent = "Current password is incorrect.";
      msg.style.color = "var(--danger)";
      return;
    }

    const newSalt = uuid();
    const newHash = await sha256Hex(n1 + "|" + newSalt);
    LS.set(KEYS.CREDS, { user: creds.user, salt: newSalt, hash: newHash, updatedAt: new Date().toISOString() });

    msg.textContent = "✅ Password updated. You will be logged out now.";
    msg.style.color = "var(--ok)";
    toast("Password updated. Logging out...");
    setTimeout(logout, 700);
  });

  // ---------- Login ----------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";

    const user = $("#loginUser").value.trim();
    const pass = $("#loginPass").value;
    const remember = $("#rememberMe").checked;

    if(!user || !pass){
      loginMsg.textContent = "Enter username and password.";
      loginMsg.style.color = "var(--danger)";
      return;
    }

    const creds = LS.get(KEYS.CREDS, null);
    if(!creds){
      loginMsg.textContent = "Credentials not found. Reload page.";
      loginMsg.style.color = "var(--danger)";
      return;
    }

    if(user !== creds.user){
      loginMsg.textContent = "Invalid username.";
      loginMsg.style.color = "var(--danger)";
      return;
    }

    const h = await sha256Hex(pass + "|" + creds.salt);
    if(h !== creds.hash){
      loginMsg.textContent = "Invalid password.";
      loginMsg.style.color = "var(--danger)";
      return;
    }

    // Persist across refresh & tabs
    setAuth(user, remember ? 30 : 1);

    $("#loginPass").value = "";
    toast("Welcome, Abdullah!");
    showApp();
  });

  // ---------- Navigation ----------
  sideNav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if(!btn) return;
    switchView(btn.dataset.view);
  });

  globalSearch.addEventListener("input", () => renderAll());

  logoutBtn.addEventListener("click", () => {
    if(!confirm("Logout from admin panel?")) return;
    logout();
  });

  // ---------- Public boot ----------
  async function boot(){
    migrateLegacy();
    seedDefaults();
    await ensureCreds();

    // show correct view based on auth
    const auth = getAuth();
    if(auth) showApp();
    else showAuth();

    // initial renders (safe)
    renderAll();
  }

  boot();

})();