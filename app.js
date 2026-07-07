const STORAGE_KEY = "ak-budget-pwa-transactions-v1";
const THEME_KEY = "ak-budget-pwa-theme-v1";
const CATEGORY_KEY = "ak-budget-pwa-categories-v2";

const defaultCategories = {
  expense: {
    Food: ["Zomato", "Swiggy", "Groceries", "Dining out", "Other"],
    Travel: ["Cab", "Metro", "Fuel", "Parking", "Other"],
    Rent: ["House rent", "Maintenance", "Other"],
    Shopping: ["Clothes", "Electronics", "Personal care", "Other"],
    Bills: ["Electricity", "Water", "Gas", "Internet", "Mobile", "Other"],
    Subscriptions: ["Netflix", "Spotify", "iCloud", "Other"],
    Health: ["Doctor", "Medicine", "Tests", "Other"],
    Other: ["Miscellaneous"]
  },
  income: {
    Salary: ["Monthly salary", "Bonus", "Other"],
    Freelance: ["Project", "Consulting", "Other"],
    Gift: ["Family", "Friend", "Other"],
    Refund: ["Shopping refund", "Travel refund", "Other"],
    Interest: ["Savings", "FD", "Other"],
    Other: ["Miscellaneous"]
  }
};

const icons = {
  Food: "🍽️", Zomato: "🍲", Swiggy: "🛵", Groceries: "🛒", "Dining out": "🍜",
  Travel: "🚕", Cab: "🚖", Metro: "🚇", Fuel: "⛽", Parking: "🅿️",
  Rent: "🏠", "House rent": "🏡", Maintenance: "🛠️",
  Shopping: "🛍️", Clothes: "👕", Electronics: "📱", "Personal care": "🧴",
  Bills: "🧾", Electricity: "💡", Water: "🚰", Gas: "🔥", Internet: "🌐", Mobile: "📞",
  Subscriptions: "🔁", Netflix: "🎬", Spotify: "🎧", iCloud: "☁️",
  Health: "💊", Doctor: "🩺", Medicine: "💊", Tests: "🧪",
  Salary: "💼", Bonus: "🎉", Freelance: "💻", Project: "📁", Consulting: "🧠",
  Gift: "🎁", Family: "👨‍👩‍👧", Friend: "🤝", Refund: "↩️", Interest: "📈", Other: "✨", Miscellaneous: "✨"
};

let transactions = loadTransactions();
let categories = loadCategories();
let editingId = null;

const els = {
  form: document.getElementById("transactionForm"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  subcategory: document.getElementById("subcategory"),
  date: document.getElementById("date"),
  note: document.getElementById("note"),
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
  themeToggle: document.getElementById("themeToggle"),
  categoryForm: document.getElementById("categoryForm"),
  newCategoryType: document.getElementById("newCategoryType"),
  newCategoryName: document.getElementById("newCategoryName"),
  newSubcategories: document.getElementById("newSubcategories"),
  categoryList: document.getElementById("categoryList")
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

  els.category.addEventListener("change", () => populateSubcategories(getSelectedType(), els.category.value));

  els.form.addEventListener("submit", event => {
    event.preventDefault();
    const type = getSelectedType();
    const amount = Number(els.amount.value);
    if (!amount || amount <= 0) return showToast("Enter a valid amount");

    const payload = {
      id: editingId || crypto.randomUUID(),
      type,
      amount,
      category: els.category.value,
      subcategory: els.subcategory.value,
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

  els.categoryForm.addEventListener("submit", event => {
    event.preventDefault();
    const type = els.newCategoryType.value;
    const name = cleanName(els.newCategoryName.value);
    const subcats = els.newSubcategories.value
      .split(",")
      .map(cleanName)
      .filter(Boolean);

    if (!name) return showToast("Enter a category name");
    if (!categories[type]) categories[type] = {};
    if (categories[type][name]) return showToast("Category already exists");

    categories[type][name] = subcats.length ? uniqueList(subcats) : ["General"];
    saveCategories();
    els.categoryForm.reset();
    els.newCategoryType.value = type;
    populateCategories(getSelectedType());
    renderCategoryManager();
    showToast("Category added");
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

function getSelectedType() {
  return document.querySelector('input[name="type"]:checked').value;
}

function populateCategories(type, selectedCategory = "") {
  const names = Object.keys(categories[type] || {});
  els.category.innerHTML = names.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`).join("");
  if (selectedCategory && names.includes(selectedCategory)) els.category.value = selectedCategory;
  populateSubcategories(type, els.category.value);
}

function populateSubcategories(type, category, selectedSubcategory = "") {
  const values = categories[type]?.[category] || ["General"];
  els.subcategory.innerHTML = values.map(sub => `<option value="${escapeAttr(sub)}">${escapeHtml(sub)}</option>`).join("");
  if (selectedSubcategory && values.includes(selectedSubcategory)) els.subcategory.value = selectedSubcategory;
}

function render() {
  const visible = getFilteredTransactions();
  const income = visible.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expense = visible.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);

  els.income.textContent = money(income);
  els.expense.textContent = money(expense);
  els.monthLabel.textContent = formatMonth(els.monthFilter.value);

  renderTransactions(visible);
  renderCategoryBars(visible);
  renderCategoryManager();
}

function renderTransactions(items) {
  if (!items.length) {
    els.list.innerHTML = `<p class="empty-state">No transactions for this month.</p>`;
    return;
  }

  els.list.innerHTML = [...items]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(tx => {
      const sub = tx.subcategory || "General";
      const title = tx.note || sub || tx.category;
      return `
        <article class="transaction-item">
          <div class="tx-icon">${icons[sub] || icons[tx.category] || "✨"}</div>
          <div class="tx-main">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(tx.category)} • ${escapeHtml(sub)} • ${formatDate(tx.date)}</span>
          </div>
          <div>
            <div class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "-"}${money(tx.amount)}</div>
            <div class="tx-actions">
              <button class="mini-btn" onclick="editTransaction('${tx.id}')">Edit</button>
              <button class="mini-btn" onclick="deleteTransaction('${tx.id}')">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
}

function renderCategoryBars(items) {
  const expenses = items.filter(tx => tx.type === "expense");
  if (!expenses.length) {
    els.bars.innerHTML = `<p class="empty-state">Add expenses to see category insights.</p>`;
    els.topCategory.textContent = "No expenses yet";
    return;
  }

  const totals = expenses.reduce((acc, tx) => {
    const key = tx.subcategory || tx.category;
    acc[key] = (acc[key] || 0) + tx.amount;
    return acc;
  }, {});

  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = rows[0][1];
  els.topCategory.textContent = `Top: ${rows[0][0]}`;

  els.bars.innerHTML = rows.map(([cat, total]) => `
    <div class="bar-row">
      <div class="bar-meta"><span>${icons[cat] || "✨"} ${escapeHtml(cat)}</span><strong>${money(total)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width: ${(total / max) * 100}%"></div></div>
    </div>
  `).join("");
}

function renderCategoryManager() {
  const expenseCount = Object.keys(categories.expense || {}).length;
  const incomeCount = Object.keys(categories.income || {}).length;
  els.categoryList.innerHTML = `
    <div class="category-chip">Expense categories: <strong>${expenseCount}</strong></div>
    <div class="category-chip">Income categories: <strong>${incomeCount}</strong></div>
    <div class="category-chip">Food: <strong>Zomato, Swiggy</strong></div>
    <div class="category-chip">Bills: <strong>Electricity</strong></div>
  `;
}

window.editTransaction = function(id) {
  const tx = transactions.find(item => item.id === id);
  if (!tx) return;
  editingId = id;
  document.getElementById(tx.type).checked = true;
  populateCategories(tx.type, tx.category);
  populateSubcategories(tx.type, tx.category, tx.subcategory || "");
  els.amount.value = tx.amount;
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
  const backup = { exportedAt: new Date().toISOString(), transactions, categories };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
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
      transactions = imported.filter(isValidTransaction).map(tx => ({ ...tx, subcategory: tx.subcategory || "General" }));
      if (parsed.categories) categories = mergeCategories(defaultCategories, parsed.categories);
      saveTransactions();
      saveCategories();
      buildMonthFilter();
      populateCategories(getSelectedType());
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
  try { return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(tx => ({ ...tx, subcategory: tx.subcategory || "General" })); }
  catch { return []; }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_KEY));
    return mergeCategories(defaultCategories, saved || {});
  } catch {
    return structuredClone(defaultCategories);
  }
}

function saveCategories() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

function mergeCategories(base, extra) {
  const merged = structuredClone(base);
  ["expense", "income"].forEach(type => {
    Object.entries(extra?.[type] || {}).forEach(([category, subcats]) => {
      const cleanCategory = cleanName(category);
      if (!cleanCategory) return;
      const values = Array.isArray(subcats) ? subcats.map(cleanName).filter(Boolean) : ["General"];
      merged[type][cleanCategory] = uniqueList([...(merged[type][cleanCategory] || []), ...(values.length ? values : ["General"])]);
    });
  });
  return merged;
}

function cleanName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function uniqueList(values) {
  return Array.from(new Set(values));
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

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
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
