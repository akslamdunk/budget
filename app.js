const STORAGE_KEY = "ak-budget-pwa-transactions-v1";
const THEME_KEY = "ak-budget-pwa-theme-v1";

const categories = {
  expense: ["Food", "Travel", "Rent", "Shopping", "Bills", "Subscriptions", "Health", "Other"],
  income: ["Salary", "Freelance", "Gift", "Refund", "Interest", "Other"]
};

const icons = {
  Food: "🍽️", Travel: "🚕", Rent: "🏠", Shopping: "🛍️", Bills: "🧾", Subscriptions: "🔁",
  Health: "💊", Salary: "💼", Freelance: "💻", Gift: "🎁", Refund: "↩️", Interest: "📈", Other: "✨"
};

let transactions = loadTransactions();
let editingId = null;

const els = {
  form: document.getElementById("transactionForm"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  date: document.getElementById("date"),
  note: document.getElementById("note"),
  balance: document.getElementById("balanceAmount"),
  income: document.getElementById("incomeAmount"),
  expense: document.getElementById("expenseAmount"),
  list: document.getElementById("transactionList"),
  bars: document.getElementById("categoryBars"),
  topCategory: document.getElementById("topCategory"),
  monthFilter: document.getElementById("monthFilter"),
  monthLabel: document.getElementById("monthLabel"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEdit: document.getElementById("cancelEdit"),
  editHint: document.getElementById("editHint"),
  toast: document.getElementById("toast"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  clearMonth: document.getElementById("clearMonth"),
  themeToggle: document.getElementById("themeToggle")
};

init();

function init() {
  applySavedTheme();
  els.date.valueAsDate = new Date();
  populateCategories("expense");
  buildMonthFilter();
  render();
  registerEvents();
  registerServiceWorker();
}

function registerEvents() {
  document.querySelectorAll('input[name="type"]').forEach(input => {
    input.addEventListener("change", () => populateCategories(input.value));
  });

  els.form.addEventListener("submit", event => {
    event.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = Number(els.amount.value);
    if (!amount || amount <= 0) return showToast("Enter a valid amount");

    const payload = {
      id: editingId || crypto.randomUUID(),
      type,
      amount,
      category: els.category.value,
      date: els.date.value,
      note: els.note.value.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      transactions = transactions.map(tx => tx.id === editingId ? payload : tx);
      showToast("Transaction updated");
    } else {
      transactions.unshift(payload);
      showToast("Transaction added");
    }

    saveTransactions();
    resetForm();
    buildMonthFilter();
    render();
  });

  els.cancelEdit.addEventListener("click", resetForm);
  els.monthFilter.addEventListener("change", render);

  els.exportBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", importData);

  els.clearMonth.addEventListener("click", () => {
    const month = els.monthFilter.value;
    const filtered = getFilteredTransactions();
    if (!filtered.length) return showToast("No transactions to clear");
    if (!confirm(`Delete ${filtered.length} transaction(s) for ${formatMonth(month)}?`)) return;
    const idsToDelete = new Set(filtered.map(tx => tx.id));
    transactions = transactions.filter(tx => !idsToDelete.has(tx.id));
    saveTransactions();
    buildMonthFilter();
    render();
    showToast("Month cleared");
  });

  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    els.themeToggle.textContent = next === "dark" ? "☀" : "☾";
  });
}

function populateCategories(type) {
  els.category.innerHTML = categories[type].map(cat => `<option value="${cat}">${cat}</option>`).join("");
}

function render() {
  const visible = getFilteredTransactions();
  const income = visible.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expense = visible.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const balance = income - expense;

  els.income.textContent = money(income);
  els.expense.textContent = money(expense);
  els.balance.textContent = money(balance);
  els.monthLabel.textContent = formatMonth(els.monthFilter.value);

  renderTransactions(visible);
  renderCategoryBars(visible);
}

function renderTransactions(items) {
  if (!items.length) {
    els.list.innerHTML = `<p class="empty-state">No transactions for this month.</p>`;
    return;
  }

  els.list.innerHTML = items
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(tx => `
      <article class="transaction-item">
        <div class="tx-icon">${icons[tx.category] || "✨"}</div>
        <div class="tx-main">
          <strong>${escapeHtml(tx.note || tx.category)}</strong>
          <span>${tx.category} • ${formatDate(tx.date)}</span>
        </div>
        <div>
          <div class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "-"}${money(tx.amount)}</div>
          <div class="tx-actions">
            <button class="mini-btn" onclick="editTransaction('${tx.id}')">Edit</button>
            <button class="mini-btn" onclick="deleteTransaction('${tx.id}')">Delete</button>
          </div>
        </div>
      </article>
    `).join("");
}

function renderCategoryBars(items) {
  const expenses = items.filter(tx => tx.type === "expense");
  if (!expenses.length) {
    els.bars.innerHTML = `<p class="empty-state">Add expenses to see category insights.</p>`;
    els.topCategory.textContent = "No expenses yet";
    return;
  }

  const totals = expenses.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = rows[0][1];
  els.topCategory.textContent = `Top: ${rows[0][0]}`;

  els.bars.innerHTML = rows.map(([cat, total]) => `
    <div class="bar-row">
      <div class="bar-meta"><span>${icons[cat] || "✨"} ${cat}</span><strong>${money(total)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width: ${(total / max) * 100}%"></div></div>
    </div>
  `).join("");
}

window.editTransaction = function(id) {
  const tx = transactions.find(item => item.id === id);
  if (!tx) return;
  editingId = id;
  document.getElementById(tx.type).checked = true;
  populateCategories(tx.type);
  els.amount.value = tx.amount;
  els.category.value = tx.category;
  els.date.value = tx.date;
  els.note.value = tx.note || "";
  els.submitBtn.textContent = "Save changes";
  els.cancelEdit.hidden = false;
  els.editHint.textContent = "Editing";
  window.scrollTo({ top: 180, behavior: "smooth" });
};

window.deleteTransaction = function(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  buildMonthFilter();
  render();
  showToast("Transaction deleted");
};

function resetForm() {
  editingId = null;
  els.form.reset();
  document.getElementById("expense").checked = true;
  populateCategories("expense");
  els.date.valueAsDate = new Date();
  els.submitBtn.textContent = "Add transaction";
  els.cancelEdit.hidden = true;
  els.editHint.textContent = "New entry";
}

function buildMonthFilter() {
  const currentMonth = monthKey(new Date());
  const months = Array.from(new Set([currentMonth, ...transactions.map(tx => tx.date.slice(0, 7))])).sort().reverse();
  const previous = els.monthFilter.value || currentMonth;
  els.monthFilter.innerHTML = months.map(month => `<option value="${month}">${formatMonth(month)}</option>`).join("");
  els.monthFilter.value = months.includes(previous) ? previous : currentMonth;
}

function getFilteredTransactions() {
  const month = els.monthFilter.value || monthKey(new Date());
  return transactions.filter(tx => tx.date.startsWith(month));
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), transactions }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exported");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = Array.isArray(parsed) ? parsed : parsed.transactions;
      if (!Array.isArray(imported)) throw new Error("Invalid backup");
      transactions = imported.filter(isValidTransaction);
      saveTransactions();
      buildMonthFilter();
      render();
      showToast("Backup imported");
    } catch {
      showToast("Invalid backup file");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function isValidTransaction(tx) {
  return tx && tx.id && ["income", "expense"].includes(tx.type) && Number(tx.amount) > 0 && tx.category && /^\d{4}-\d{2}-\d{2}$/.test(tx.date);
}

function loadTransactions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === "dark" ? "☀" : "☾";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function formatMonth(month) {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatDate(date) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
  }
}
