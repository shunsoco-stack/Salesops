function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n) {
  if (!Number.isFinite(n)) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function formatDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDateInput(days) {
  const dateEl = document.getElementById("happened_on");
  if (!dateEl) return;
  const base = dateEl.value ? new Date(`${dateEl.value}T00:00:00`) : new Date();
  if (!Number.isFinite(base.getTime())) return;
  base.setDate(base.getDate() + days);
  dateEl.value = formatDateInputValue(base);
}

function updateUnitPrice() {
  const salesEl = document.getElementById("sales");
  const customersEl = document.getElementById("customers");
  const unitEl = document.getElementById("unit_price");
  if (!salesEl || !customersEl || !unitEl) return;

  const sales = toNumber(salesEl.value);
  const customers = Math.max(0, Math.trunc(toNumber(customersEl.value)));

  if (customers <= 0) {
    unitEl.value = "";
    return;
  }
  unitEl.value = formatMoney(sales / customers);
}

function parseBreakdownSum(text) {
  const src = String(text || "");
  let sum = 0;
  let hasAny = false;
  // find all numbers (supports commas) anywhere, including "10000+5000"
  const matches = src.match(/-?\d[\d,]*(?:\.\d+)?/g) || [];
  for (const m of matches) {
    const num = String(m).replace(/,/g, "");
    const v = Number(num);
    if (!Number.isFinite(v)) continue;
    hasAny = true;
    sum += v;
  }
  return { hasAny, sum };
}

function updateOutsourcingCostFromBreakdown() {
  const breakdownEl = document.getElementById("outsourcing_breakdown");
  const costEl = document.getElementById("outsourcing_cost");
  if (!breakdownEl || !costEl) return;
  const { hasAny, sum } = parseBreakdownSum(breakdownEl.value);
  if (!hasAny) return;
  costEl.value = formatMoney(sum);
}

function updateDerivedFields() {
  const salesEl = document.getElementById("sales");
  const pointsEl = document.getElementById("used_points");
  const outsourcingEl = document.getElementById("outsourcing_cost");
  const cardEl = document.getElementById("card_payment");
  const qrEl = document.getElementById("qr_payment");
  const storeSalesEl = document.getElementById("store_sales");
  const cashEl = document.getElementById("cash_payment");
  if (!salesEl || !pointsEl || !outsourcingEl || !cardEl || !qrEl || !storeSalesEl || !cashEl) return;

  const sales = toNumber(salesEl.value);
  const points = toNumber(pointsEl.value);
  const outsourcing = toNumber(outsourcingEl.value);
  const card = toNumber(cardEl.value);
  const qr = toNumber(qrEl.value);

  storeSalesEl.value = formatMoney(sales - outsourcing);
  cashEl.value = formatMoney(sales - points - card - qr);
}

function setupSalesSearchFilter() {
  const input = document.getElementById("sales_search");
  const rows = Array.from(document.querySelectorAll("[data-sales-row]"));
  const noResult = document.getElementById("sales_no_result");
  if (!input || rows.length === 0) return;

  const apply = () => {
    const q = String(input.value || "").trim().toLowerCase();
    let visible = 0;
    rows.forEach((row) => {
      const text = String(row.getAttribute("data-search-text") || "").toLowerCase();
      const show = !q || text.includes(q);
      row.style.display = show ? "" : "none";
      if (show) visible += 1;
    });
    if (noResult) {
      noResult.style.display = visible === 0 ? "" : "none";
    }
  };

  input.addEventListener("input", apply);
  apply();
}

function setupUiSettingsLocalStorage() {
  const form = document.getElementById("ui_settings_form");
  if (!form) return;
  const fields = [
    { id: "ui_company_name", key: "ui.company_name" },
    { id: "ui_contact_name", key: "ui.contact_name" },
    { id: "ui_notify_email", key: "ui.notify_email" },
    { id: "ui_notify_push", key: "ui.notify_push" },
  ];
  const msg = document.getElementById("ui_settings_msg");

  fields.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const saved = window.localStorage.getItem(key);
    if (saved !== null) {
      el.value = saved;
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    fields.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (!el) return;
      window.localStorage.setItem(key, String(el.value || ""));
    });
    if (msg) {
      msg.textContent = "設定を保存しました。";
      window.setTimeout(() => {
        msg.textContent = "";
      }, 2500);
    }
  });
}

document.addEventListener("input", (e) => {
  const id = e.target && e.target.id;
  if (id === "sales" || id === "customers") {
    updateUnitPrice();
  }
  if (id === "outsourcing_breakdown") {
    updateOutsourcingCostFromBreakdown();
  }
  if (id === "sales" || id === "used_points" || id === "outsourcing_cost" || id === "card_payment" || id === "qr_payment") {
    updateDerivedFields();
  }
});

document.addEventListener("click", (e) => {
  const button = e.target && e.target.closest("[data-day-shift]");
  if (!button) return;
  e.preventDefault();
  const shift = Number(button.dataset.dayShift);
  if (!Number.isFinite(shift) || shift === 0) return;
  shiftDateInput(shift);
});

document.addEventListener("DOMContentLoaded", () => {
  updateUnitPrice();
  updateOutsourcingCostFromBreakdown();
  updateDerivedFields();
  setupSalesSearchFilter();
  setupUiSettingsLocalStorage();
});

