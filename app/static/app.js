function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n) {
  if (!Number.isFinite(n)) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
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

document.addEventListener("DOMContentLoaded", () => {
  updateUnitPrice();
  updateOutsourcingCostFromBreakdown();
  updateDerivedFields();
});

