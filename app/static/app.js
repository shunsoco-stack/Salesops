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

document.addEventListener("input", (e) => {
  const id = e.target && e.target.id;
  if (id === "sales" || id === "customers") {
    updateUnitPrice();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  updateUnitPrice();
});

