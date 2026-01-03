function yen(n) {
  const v = Number(n || 0);
  return "¥" + v.toLocaleString("ja-JP");
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let MENUS = [];
let THERAPISTS = [];

const elDate = document.getElementById("date");
const elTherapist = document.getElementById("therapist");
const elTherapistHint = document.getElementById("therapistHint");
const elMenu = document.getElementById("menu");
const elPrice = document.getElementById("price");
const elPayout = document.getElementById("payout");
const elAdd = document.getElementById("addBtn");
const elRefresh = document.getElementById("refreshBtn");
const elEntries = document.getElementById("entries");
const elTotalSales = document.getElementById("totalSales");
const elTotalPayout = document.getElementById("totalPayout");

function renderTherapists() {
  elTherapist.innerHTML = "";
  if (!THERAPISTS.length) {
    elTherapistHint.style.display = "block";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "（未登録）/ (ยังไม่มี)";
    elTherapist.appendChild(opt);
    return;
  }
  elTherapistHint.style.display = "none";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "選択 / เลือก";
  elTherapist.appendChild(placeholder);

  for (const t of THERAPISTS) {
    const opt = document.createElement("option");
    opt.value = String(t.id);
    opt.textContent = t.name_th ? `${t.name_ja} / ${t.name_th}` : t.name_ja;
    elTherapist.appendChild(opt);
  }

  const last = localStorage.getItem("lastTherapistId");
  if (last && THERAPISTS.some((t) => String(t.id) === last)) {
    elTherapist.value = last;
  }
}

function renderMenus() {
  elMenu.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "選択 / เลือก";
  elMenu.appendChild(placeholder);
  for (const m of MENUS) {
    const opt = document.createElement("option");
    opt.value = String(m.id);
    opt.textContent = m.name_th ? `${m.name_ja} / ${m.name_th}` : m.name_ja;
    elMenu.appendChild(opt);
  }
  const last = localStorage.getItem("lastMenuId");
  if (last && MENUS.some((m) => String(m.id) === last)) {
    elMenu.value = last;
  }
  updatePreview();
}

function updatePreview() {
  const id = elMenu.value;
  const m = MENUS.find((x) => String(x.id) === String(id));
  if (!m) {
    elPrice.value = "";
    elPayout.value = "";
    return;
  }
  const price = Number(m.price_yen);
  const payout = Math.floor((price * Number(m.share_percent)) / 100);
  elPrice.value = yen(price);
  elPayout.value = yen(payout);
}

async function loadLists() {
  const [menus, therapists] = await Promise.all([api("/api/menus"), api("/api/therapists")]);
  MENUS = (menus.items || []).filter((m) => m.active);
  THERAPISTS = (therapists.items || []).filter((t) => t.active);
  renderMenus();
  renderTherapists();
}

async function loadDay() {
  const date = elDate.value;
  const therapistId = elTherapist.value;
  if (!date || !therapistId) {
    elEntries.innerHTML = "";
    elTotalSales.textContent = yen(0);
    elTotalPayout.textContent = yen(0);
    return;
  }
  const data = await api(`/api/day?date=${encodeURIComponent(date)}&therapist_id=${encodeURIComponent(therapistId)}`);

  elTotalSales.textContent = yen(data.totals.sales_yen);
  elTotalPayout.textContent = yen(data.totals.payout_yen);

  elEntries.innerHTML = "";
  for (const e of data.entries) {
    const tr = document.createElement("tr");
    const name = e.menu_name_th_snapshot
      ? `${e.menu_name_ja_snapshot} / ${e.menu_name_th_snapshot}`
      : e.menu_name_ja_snapshot;
    tr.innerHTML = `
      <td>${escapeHtml(name)}</td>
      <td class="right">${yen(e.price_yen_snapshot)}</td>
      <td class="right">${yen(e.payout_yen_snapshot)}</td>
      <td class="actions right">
        <button class="btn btn-danger" style="padding:8px 10px; font-size:16px;" data-del="${e.id}" type="button">削除 / ลบ</button>
      </td>
    `;
    elEntries.appendChild(tr);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function addEntry() {
  const date = elDate.value;
  const therapistId = elTherapist.value;
  const menuId = elMenu.value;
  if (!date) return alert("日付を選択してください / กรุณาเลือกวันที่");
  if (!therapistId) return alert("セラピストを選択してください / กรุณาเลือกหมอนวด");
  if (!menuId) return alert("メニューを選択してください / กรุณาเลือกรายการ");

  elAdd.disabled = true;
  try {
    localStorage.setItem("lastTherapistId", therapistId);
    localStorage.setItem("lastMenuId", menuId);
    await api("/api/entries", {
      method: "POST",
      body: JSON.stringify({ date, therapist_id: Number(therapistId), menu_id: Number(menuId) }),
    });
    await loadDay();
  } catch (e) {
    alert(String(e.message || e));
  } finally {
    elAdd.disabled = false;
  }
}

async function deleteEntry(id) {
  if (!confirm("削除しますか？ / ลบใช่ไหม")) return;
  await api(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
  await loadDay();
}

elMenu.addEventListener("change", () => {
  updatePreview();
  if (elMenu.value) localStorage.setItem("lastMenuId", elMenu.value);
});
elTherapist.addEventListener("change", () => {
  if (elTherapist.value) localStorage.setItem("lastTherapistId", elTherapist.value);
  loadDay().catch(() => {});
});
elDate.addEventListener("change", () => loadDay().catch(() => {}));
elAdd.addEventListener("click", () => addEntry().catch(() => {}));
elRefresh.addEventListener("click", () => {
  loadLists()
    .then(loadDay)
    .catch((e) => alert(String(e.message || e)));
});
elEntries.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-del]");
  if (!btn) return;
  deleteEntry(btn.getAttribute("data-del")).catch((e) => alert(String(e.message || e)));
});

(async () => {
  elDate.value = todayISO();
  try {
    await loadLists();
    await loadDay();
  } catch (e) {
    alert(String(e.message || e));
  }
})();

