function clampInt(n, min, max) {
  if (!Number.isFinite(n)) return NaN;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

function formatMoney(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 6,
  }).format(n);
}

function renderErrors(errorsEl, messages) {
  if (!messages.length) {
    errorsEl.hidden = true;
    errorsEl.innerHTML = "";
    return;
  }

  errorsEl.hidden = false;
  errorsEl.innerHTML = `<ul>${messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function computeRequiredSellPrice({ avgCost, quantity, freeShares }) {
  const sharesToSell = quantity - freeShares;
  const totalCostBasis = avgCost * quantity;
  const requiredPrice = totalCostBasis / sharesToSell;
  return { sharesToSell, requiredPrice };
}

function main() {
  const form = document.getElementById("calcForm");

  const stockEl = document.getElementById("stock");
  const avgCostEl = document.getElementById("avgCost");
  const quantityEl = document.getElementById("quantity");
  const freeSharesEl = document.getElementById("freeShares");
  const maxSellHint = document.getElementById("maxSellHint");

  const errorsEl = document.getElementById("errors");
  const emptyState = document.getElementById("emptyState");
  const resultBody = document.getElementById("resultBody");
  const resultTicker = document.getElementById("resultTicker");
  const sharesToSellEl = document.getElementById("sharesToSell");
  const requiredPriceEl = document.getElementById("requiredPrice");
  const xFreeSharesEl = document.getElementById("xFreeShares");
  const ySharesToSellEl = document.getElementById("ySharesToSell");
  const zRequiredPriceEl = document.getElementById("zRequiredPrice");

  function updateMaxHint() {
    const q = Number(quantityEl.value);
    if (!Number.isFinite(q) || q < 1) {
      maxSellHint.textContent = "quantity − 1";
      return;
    }
    maxSellHint.textContent = String(Math.max(0, Math.trunc(q) - 1));
  }

  quantityEl.addEventListener("input", updateMaxHint);
  updateMaxHint();

  const inputOrder = [stockEl, avgCostEl, quantityEl, freeSharesEl];
  for (const el of inputOrder) {
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;

      e.preventDefault();

      const idx = inputOrder.indexOf(e.currentTarget);
      if (idx === -1) return;

      const next = inputOrder[idx + 1];
      if (next) {
        next.focus();
        if (typeof next.select === "function") next.select();
        return;
      }

      // Last input: just blur (live-calc already ran).
      if (typeof e.currentTarget.blur === "function") e.currentTarget.blur();
    });
  }

  function showResult({ stock, freeShares, sharesToSell, requiredPrice }) {
    emptyState.hidden = true;
    resultBody.hidden = false;

    if (stock) {
      resultTicker.hidden = false;
      resultTicker.textContent = stock.toUpperCase();
    } else {
      resultTicker.hidden = true;
      resultTicker.textContent = "";
    }

    sharesToSellEl.textContent = String(sharesToSell);
    requiredPriceEl.textContent = formatMoney(requiredPrice);

    xFreeSharesEl.textContent = String(freeShares);
    ySharesToSellEl.textContent = String(sharesToSell);
    zRequiredPriceEl.textContent = formatMoney(requiredPrice);
  }

  function clearResult() {
    renderErrors(errorsEl, []);
    resultBody.hidden = true;
    emptyState.hidden = false;
    sharesToSellEl.textContent = "—";
    requiredPriceEl.textContent = "—";
    xFreeSharesEl.textContent = "—";
    ySharesToSellEl.textContent = "—";
    zRequiredPriceEl.textContent = "—";
    resultTicker.hidden = true;
    resultTicker.textContent = "";
  }

  function validateAndCompute({ showEmptyStateWhenIncomplete }) {
    const stock = stockEl.value.trim();
    const avgCost = Number(avgCostEl.value);
    const quantityRaw = Number(quantityEl.value);
    const freeRaw = Number(freeSharesEl.value);

    const errors = [];

    const hasAvg = String(avgCostEl.value ?? "").trim() !== "";
    const hasQty = String(quantityEl.value ?? "").trim() !== "";
    const hasFree = String(freeSharesEl.value ?? "").trim() !== "";

    // If required numeric inputs aren't all present, hide results (no errors).
    if (!hasAvg || !hasQty || !hasFree) {
      renderErrors(errorsEl, []);
      resultBody.hidden = true;
      emptyState.hidden = !showEmptyStateWhenIncomplete;
      return;
    }

    if (!Number.isFinite(avgCost) || avgCost < 0) errors.push("Average cost must be a number ≥ 0.");

    if (!Number.isFinite(quantityRaw) || quantityRaw < 1) errors.push("Quantity must be an integer ≥ 1.");
    const quantity = clampInt(quantityRaw, 1, Number.MAX_SAFE_INTEGER);
    if (Number.isFinite(quantityRaw) && quantityRaw !== quantity) errors.push("Quantity must be a whole number.");

    const maxFree = Math.max(0, quantity - 1);
    if (!Number.isFinite(freeRaw) || freeRaw < 1) errors.push("Free shares must be an integer ≥ 1.");
    const freeShares = clampInt(freeRaw, 1, Number.MAX_SAFE_INTEGER);
    if (Number.isFinite(freeRaw) && freeRaw !== freeShares) errors.push("Free shares must be a whole number.");

    if (quantity <= 1) errors.push("Quantity must be at least 2 to sell shares and keep at least 1 share.");
    if (quantity > 1 && freeShares > maxFree)
      errors.push(`Free shares must be between 1 and ${maxFree} (so you sell at most quantity − 1).`);

    renderErrors(errorsEl, errors);
    if (errors.length) {
      resultBody.hidden = true;
      emptyState.hidden = !showEmptyStateWhenIncomplete;
      return;
    }

    const { sharesToSell, requiredPrice } = computeRequiredSellPrice({ avgCost, quantity, freeShares });
    showResult({ stock, freeShares, sharesToSell, requiredPrice });
  }

  // Keep submit handler to prevent accidental reloads if the browser submits the form.
  form.addEventListener("submit", (e) => e.preventDefault());

  for (const el of [stockEl, avgCostEl, quantityEl, freeSharesEl]) {
    el.addEventListener("input", () => {
      updateMaxHint();
      validateAndCompute({ showEmptyStateWhenIncomplete: true });
    });
    el.addEventListener("blur", () => {
      updateMaxHint();
      validateAndCompute({ showEmptyStateWhenIncomplete: false });
    });
  }

  // Initial state
  validateAndCompute({ showEmptyStateWhenIncomplete: true });
}

main();

