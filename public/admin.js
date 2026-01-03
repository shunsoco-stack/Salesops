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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const elTherapists = document.getElementById("therapists");
const elTherapistNameJa = document.getElementById("therapistNameJa");
const elTherapistNameTh = document.getElementById("therapistNameTh");
const elAddTherapistBtn = document.getElementById("addTherapistBtn");

const elMenus = document.getElementById("menus");
const elMenuNameJa = document.getElementById("menuNameJa");
const elMenuNameTh = document.getElementById("menuNameTh");
const elMenuPrice = document.getElementById("menuPrice");
const elMenuShare = document.getElementById("menuShare");
const elAddMenuBtn = document.getElementById("addMenuBtn");

let THERAPISTS = [];
let MENUS = [];

function renderTherapists() {
  elTherapists.innerHTML = "";
  for (const t of THERAPISTS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.id}</td>
      <td><input data-t-nameja="${t.id}" value="${escapeHtml(t.name_ja)}" /></td>
      <td><input data-t-nameth="${t.id}" value="${escapeHtml(t.name_th || "")}" /></td>
      <td class="right">
        <input data-t-active="${t.id}" type="checkbox" ${t.active ? "checked" : ""} />
      </td>
      <td class="actions right">
        <button class="btn btn-ghost" style="padding:8px 10px; font-size:16px;" data-t-save="${t.id}" type="button">保存</button>
      </td>
    `;
    elTherapists.appendChild(tr);
  }
}

function renderMenus() {
  elMenus.innerHTML = "";
  for (const m of MENUS) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.id}</td>
      <td><input data-m-nameja="${m.id}" value="${escapeHtml(m.name_ja)}" /></td>
      <td><input data-m-nameth="${m.id}" value="${escapeHtml(m.name_th || "")}" /></td>
      <td class="right"><input data-m-price="${m.id}" type="number" min="0" step="1" value="${Number(m.price_yen)}" /></td>
      <td class="right"><input data-m-share="${m.id}" type="number" min="0" max="100" step="1" value="${Number(m.share_percent)}" /></td>
      <td class="right"><input data-m-active="${m.id}" type="checkbox" ${m.active ? "checked" : ""} /></td>
      <td class="actions right">
        <button class="btn btn-ghost" style="padding:8px 10px; font-size:16px;" data-m-save="${m.id}" type="button">保存</button>
      </td>
    `;
    elMenus.appendChild(tr);
  }
}

async function loadAll() {
  const [therapists, menus] = await Promise.all([api("/api/therapists?all=1"), api("/api/menus?all=1")]);
  THERAPISTS = therapists.items || [];
  MENUS = menus.items || [];
  renderTherapists();
  renderMenus();
}

async function addTherapist() {
  const name_ja = (elTherapistNameJa.value || "").trim();
  const name_th = (elTherapistNameTh.value || "").trim();
  if (!name_ja) return alert("名前（日本語）を入力してください");
  await api("/api/therapists", { method: "POST", body: JSON.stringify({ name_ja, name_th }) });
  elTherapistNameJa.value = "";
  elTherapistNameTh.value = "";
  await loadAll();
}

async function addMenu() {
  const name_ja = (elMenuNameJa.value || "").trim();
  const name_th = (elMenuNameTh.value || "").trim();
  const price_yen = Number(elMenuPrice.value);
  const share_percent = Number(elMenuShare.value || 50);
  if (!name_ja) return alert("メニュー名（日本語）を入力してください");
  if (!Number.isFinite(price_yen) || price_yen < 0) return alert("施術料(円)を正しく入力してください");
  if (!Number.isFinite(share_percent) || share_percent < 0 || share_percent > 100) return alert("取り分(%)を0〜100で入力してください");
  await api("/api/menus", { method: "POST", body: JSON.stringify({ name_ja, name_th, price_yen, share_percent }) });
  elMenuNameJa.value = "";
  elMenuNameTh.value = "";
  elMenuPrice.value = "";
  elMenuShare.value = "50";
  await loadAll();
}

async function saveTherapist(id) {
  const name_ja = document.querySelector(`[data-t-nameja="${CSS.escape(String(id))}"]`).value.trim();
  const name_th = document.querySelector(`[data-t-nameth="${CSS.escape(String(id))}"]`).value.trim();
  const active = document.querySelector(`[data-t-active="${CSS.escape(String(id))}"]`).checked;
  if (!name_ja) return alert("名前（日本語）は必須です");
  await api(`/api/therapists/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name_ja, name_th, active }),
  });
  await loadAll();
}

async function saveMenu(id) {
  const name_ja = document.querySelector(`[data-m-nameja="${CSS.escape(String(id))}"]`).value.trim();
  const name_th = document.querySelector(`[data-m-nameth="${CSS.escape(String(id))}"]`).value.trim();
  const price_yen = Number(document.querySelector(`[data-m-price="${CSS.escape(String(id))}"]`).value);
  const share_percent = Number(document.querySelector(`[data-m-share="${CSS.escape(String(id))}"]`).value);
  const active = document.querySelector(`[data-m-active="${CSS.escape(String(id))}"]`).checked;
  if (!name_ja) return alert("メニュー名（日本語）は必須です");
  if (!Number.isFinite(price_yen) || price_yen < 0) return alert("施術料(円)を正しく入力してください");
  if (!Number.isFinite(share_percent) || share_percent < 0 || share_percent > 100) return alert("取り分(%)を0〜100で入力してください");
  await api(`/api/menus/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name_ja, name_th, price_yen, share_percent, active }),
  });
  await loadAll();
}

elAddTherapistBtn.addEventListener("click", () => addTherapist().catch((e) => alert(String(e.message || e))));
elAddMenuBtn.addEventListener("click", () => addMenu().catch((e) => alert(String(e.message || e))));

elTherapists.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-t-save]");
  if (!btn) return;
  saveTherapist(btn.getAttribute("data-t-save")).catch((e) => alert(String(e.message || e)));
});
elMenus.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-m-save]");
  if (!btn) return;
  saveMenu(btn.getAttribute("data-m-save")).catch((e) => alert(String(e.message || e)));
});

loadAll().catch((e) => alert(String(e.message || e)));

