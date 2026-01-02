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
  const lines = String(text || "").split(/\r?\n/);
  let sum = 0;
  let hasAny = false;
  for (const raw of lines) {
    const ln = raw.trim();
    if (!ln) continue;
    // take last number-like chunk (supports commas)
    const matches = ln.match(/-?\d[\d,]*(?:\.\d+)?/g);
    if (!matches || matches.length === 0) continue;
    const num = matches[matches.length - 1].replace(/,/g, "");
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

document.addEventListener("input", (e) => {
  const id = e.target && e.target.id;
  if (id === "sales" || id === "customers") {
    updateUnitPrice();
  }
  if (id === "outsourcing_breakdown") {
    updateOutsourcingCostFromBreakdown();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  updateUnitPrice();
  updateOutsourcingCostFromBreakdown();
});

