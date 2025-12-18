// ===== 常數與狀態 =====
const STORAGE_KEY_EXPENSES = "simple-expense-tracker:expenses";
const STORAGE_KEY_THEME = "simple-expense-tracker:theme";
const STORAGE_KEY_BUDGET = "simple-expense-tracker:budget";

let expenses = [];
let currentMonthTotal = 0;

// ===== DOM 取得 =====
const form = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");

const monthTotalEl = document.getElementById("month-total");
const todayTotalEl = document.getElementById("today-total");
const recordCountEl = document.getElementById("record-count");
const expenseListEl = document.getElementById("expense-list");
const emptyStateEl = document.getElementById("empty-state");

const themeSelect = document.getElementById("theme-select");

// 篩選相關
const filterStartInput = document.getElementById("filter-start-date");
const filterEndInput = document.getElementById("filter-end-date");
const filterCategorySelect = document.getElementById("filter-category");
const clearFiltersBtn = document.getElementById("clear-filters");

let currentFilters = {
  startDate: "",
  endDate: "",
  category: "all",
};

// 匯出 / 匯入相關
const exportCsvBtn = document.getElementById("export-csv-btn");
const exportJsonBtn = document.getElementById("export-json-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file");

// 類別統計相關
const filteredTotalEl = document.getElementById("filtered-total");
const categoryCanvas = document.getElementById("category-chart");
const categoryCtx = categoryCanvas ? categoryCanvas.getContext("2d") : null;

// 預算相關
const budgetInput = document.getElementById("budget-amount");
const budgetStatusEl = document.getElementById("budget-status");
const saveBudgetBtn = document.getElementById("save-budget");

// ===== 工具函式 =====
function formatDateLabel(dateStr) {
  // dateStr: yyyy-mm-dd
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month} / ${day}`;
}

function getTodayDateStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getYearMonthStr(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("載入支出資料失敗:", err);
    return [];
  }
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.error("儲存支出資料失敗:", err);
  }
}

function calculateStats() {
  const today = getTodayDateStr();
  const todayYM = getYearMonthStr(today);

  let monthTotal = 0;
  let todayTotal = 0;

  expenses.forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (!item.date) return;
    const ym = getYearMonthStr(item.date);
    if (ym === todayYM) {
      monthTotal += amount;
    }
    if (item.date === today) {
      todayTotal += amount;
    }
  });

  currentMonthTotal = monthTotal;
  monthTotalEl.textContent = monthTotal.toLocaleString("zh-TW");
  todayTotalEl.textContent = todayTotal.toLocaleString("zh-TW");

  updateBudgetStatus();
}

function applyFilters(list) {
  return list.filter((item) => {
    if (!item.date) return false;
    const d = item.date;

    if (currentFilters.startDate && d < currentFilters.startDate) {
      return false;
    }
    if (currentFilters.endDate && d > currentFilters.endDate) {
      return false;
    }
    if (
      currentFilters.category &&
      currentFilters.category !== "all" &&
      item.category !== currentFilters.category
    ) {
      return false;
    }
    return true;
  });
}

function getFilteredExpenses() {
  return applyFilters(expenses);
}

function calculateCategoryTotals(list) {
  const totals = {
    food: 0,
    transport: 0,
    entertainment: 0,
    shopping: 0,
    other: 0,
  };

  list.forEach((item) => {
    const amount = Number(item.amount) || 0;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!totals[item.category]) {
      totals[item.category] = 0;
    }
    totals[item.category] += amount;
  });

  return totals;
}

function drawCategoryChart(list) {
  if (!categoryCtx || !categoryCanvas) return;

  const totals = calculateCategoryTotals(list);
  const labels = ["食物", "交通", "娛樂", "購物", "其他"];
  const keys = ["food", "transport", "entertainment", "shopping", "other"];
  const values = keys.map((k) => totals[k] || 0);

  const max = Math.max(...values);

  const ctx = categoryCtx;
  const { width, height } = categoryCanvas;

  ctx.clearRect(0, 0, width, height);

  if (!list.length || max === 0) {
    ctx.fillStyle = "#999";
    ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("目前篩選條件下沒有分類統計資料", width / 2, height / 2);
    return;
  }

  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2 - 10;
  const barWidth = chartWidth / keys.length / 1.4;
  const gap = (chartWidth - barWidth * keys.length) / (keys.length - 1 || 1);

  const colors = ["#f78fb3", "#34c7a0", "#4e9bff", "#a66bff", "#ffaf40"];

  values.forEach((val, index) => {
    const x =
      padding +
      index * (barWidth + (gap > 0 ? gap : 0));
    const barHeight = (val / max) * chartHeight;
    const y = height - padding - barHeight;

    ctx.fillStyle = colors[index] || "#ccc";
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight || 2, 4);
    ctx.fill();

    // 數字
    ctx.fillStyle = "#555";
    ctx.font =
      "10px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      val ? Math.round(val).toString() : "",
      x + barWidth / 2,
      y - 2
    );

    // 標籤
    ctx.textBaseline = "top";
    ctx.fillStyle = "#666";
    ctx.fillText(labels[index], x + barWidth / 2, height - padding + 4);
  });
}

function updateCategoryStats() {
  const filtered = getFilteredExpenses();
  const total = filtered.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  if (filteredTotalEl) {
    filteredTotalEl.textContent = total.toLocaleString("zh-TW");
  }
  drawCategoryChart(filtered);
}

function translateCategory(code) {
  switch (code) {
    case "food":
      return "食物";
    case "transport":
      return "交通";
    case "entertainment":
      return "娛樂";
    case "shopping":
      return "購物";
    default:
      return "其他";
  }
}

function renderList() {
  expenseListEl.innerHTML = "";

  const filtered = getFilteredExpenses();

  if (!filtered.length) {
    emptyStateEl.style.display = "block";
    recordCountEl.textContent = "0 筆（符合篩選）";
    return;
  }

  emptyStateEl.style.display = "none";
  recordCountEl.textContent = `${filtered.length} 筆`;

  // 依日期由新到舊排序，再依建立時間排序
  const sorted = [...filtered].sort((a, b) => {
    if (a.date === b.date) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    return a.date < b.date ? 1 : -1;
  });

  sorted.forEach((item) => {
    const li = document.createElement("li");
    li.className = "expense-item";
    li.dataset.id = item.id;

    const main = document.createElement("div");
    main.className = "expense-main";

    const amountEl = document.createElement("div");
    amountEl.className = "expense-amount";
    amountEl.textContent = `${Number(item.amount).toLocaleString("zh-TW")} 元`;
    main.appendChild(amountEl);

    if (item.note) {
      const noteEl = document.createElement("div");
      noteEl.className = "expense-note";
      noteEl.textContent = item.note;
      main.appendChild(noteEl);
    }

    const meta = document.createElement("div");
    meta.className = "expense-meta";

    const dateEl = document.createElement("div");
    dateEl.className = "expense-date";
    dateEl.textContent = formatDateLabel(item.date);

    const catEl = document.createElement("div");
    catEl.className = "expense-category";
    catEl.textContent = translateCategory(item.category);

    meta.appendChild(dateEl);
    meta.appendChild(catEl);

    const actions = document.createElement("div");
    actions.className = "expense-actions";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-btn";
    delBtn.innerHTML =
      '<span class="delete-icon">✕</span><span class="delete-text">刪除</span>';
    delBtn.addEventListener("click", () => {
      deleteExpense(item.id);
    });

    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(meta);
    li.appendChild(actions);

    expenseListEl.appendChild(li);
  });

  updateCategoryStats();
}

function deleteExpense(id) {
  expenses = expenses.filter((item) => item.id !== id);
  saveExpenses();
  calculateStats();
  renderList();
}

function handleFormSubmit(event) {
  event.preventDefault();
  const amount = Number(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;
  const note = noteInput.value.trim();

  if (!amount || amount <= 0 || !Number.isFinite(amount)) {
    alert("請輸入正確的金額。");
    amountInput.focus();
    return;
  }

  if (!date) {
    alert("請選擇日期。");
    dateInput.focus();
    return;
  }

  const newItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amount,
    category,
    date,
    note,
    createdAt: Date.now(),
  };

  expenses.push(newItem);
  saveExpenses();
  calculateStats();
  renderList();

  // 重設表單（保留日期與分類，方便連續輸入）
  amountInput.value = "";
  noteInput.value = "";
  amountInput.focus();
}

// ===== 預算相關 =====
function loadBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET);
    if (!raw) return 0;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
  } catch (err) {
    console.error("載入預算失敗:", err);
    return 0;
  }
}

function saveBudget(value) {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGET, String(value));
  } catch (err) {
    console.error("儲存預算失敗:", err);
  }
}

function updateBudgetStatus() {
  if (!budgetStatusEl || !budgetInput) return;

  const raw = budgetInput.value;
  const budget = Number(raw);

  budgetStatusEl.classList.remove("over");

  if (!raw || !Number.isFinite(budget) || budget <= 0) {
    budgetStatusEl.textContent = "尚未設定本月預算";
    return;
  }

  const diff = budget - currentMonthTotal;
  if (diff >= 0) {
    const percent = budget
      ? Math.round((currentMonthTotal / budget) * 100)
      : 0;
    budgetStatusEl.textContent = `本月已花 ${currentMonthTotal.toLocaleString(
      "zh-TW"
    )} 元，剩餘 ${diff.toLocaleString(
      "zh-TW"
    )} 元（使用率約 ${percent}%）`;
  } else {
    budgetStatusEl.classList.add("over");
    budgetStatusEl.textContent = `已超出本月預算 ${Math.abs(
      diff
    ).toLocaleString("zh-TW")} 元！`;
  }
}

// ===== 匯出 / 匯入相關 =====
function exportAsCsv() {
  if (!expenses.length) {
    alert("目前沒有可匯出的資料。");
    return;
  }

  const header = ["amount", "category", "date", "note"];
  const lines = [header.join(",")];

  expenses.forEach((item) => {
    const row = [
      Number(item.amount) || 0,
      item.category || "",
      item.date || "",
      (item.note || "").replace(/,/g, "，"),
    ];
    lines.push(row.join(","));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const name =
    "expenses-" +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    ".csv";
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsJson() {
  if (!expenses.length) {
    alert("目前沒有可匯出的資料。");
    return;
  }

  const blob = new Blob([JSON.stringify(expenses, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date();
  const name =
    "expenses-" +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    ".json";
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseImportedJson(text) {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => ({
        amount: Number(item.amount),
        category: item.category || "other",
        date: item.date || "",
        note: item.note || "",
      }))
      .filter(
        (item) =>
          item.date &&
          Number.isFinite(item.amount) &&
          item.amount > 0 &&
          typeof item.category === "string"
      );
  } catch {
    return [];
  }
}

function parseImportedCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l);
  if (!lines.length) return [];

  let startIndex = 0;
  const header = lines[0].toLowerCase();
  if (
    header.includes("amount") ||
    header.includes("category") ||
    header.includes("date")
  ) {
    startIndex = 1;
  }

  const result = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    if (cols.length < 3) continue;
    const amount = Number(cols[0]);
    const category = cols[1] || "other";
    const date = cols[2] || "";
    const note = cols.slice(3).join(",") || "";

    if (!date || !Number.isFinite(amount) || amount <= 0) continue;

    result.push({
      amount,
      category,
      date,
      note,
    });
  }

  return result;
}

function handleImportedItems(items) {
  if (!items.length) {
    alert("匯入檔案中沒有可用的支出資料。");
    return;
  }

  const mapped = items.map((item) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    amount: item.amount,
    category: item.category || "other",
    date: item.date,
    note: item.note || "",
    createdAt: Date.now(),
  }));

  expenses = expenses.concat(mapped);
  saveExpenses();
  calculateStats();
  renderList();
  alert(`已成功匯入 ${mapped.length} 筆支出資料（已加入現有資料）。`);
}

function importFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = String(e.target.result || "");
    let items = [];
    const trimmed = text.trim();
    if (!trimmed) {
      alert("匯入檔案為空白。");
      return;
    }

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      items = parseImportedJson(trimmed);
    } else {
      items = parseImportedCsv(trimmed);
    }

    handleImportedItems(items);
  };
  reader.onerror = () => {
    alert("讀取匯入檔案時發生錯誤。");
  };
  reader.readAsText(file, "utf-8");
}

// ===== 主題相關 =====
const THEME_MAP = {
  sakura: "", // 預設（不加 class）
  mint: "theme-mint",
  sky: "theme-sky",
  lavender: "theme-lavender",
};

function applyTheme(themeKey) {
  const root = document.documentElement;
  // 移除所有主題 class
  Object.values(THEME_MAP).forEach((cls) => {
    if (cls) root.classList.remove(cls);
  });

  const cls = THEME_MAP[themeKey] || "";
  if (cls) {
    root.classList.add(cls);
  }
}

function loadTheme() {
  try {
    const theme = localStorage.getItem(STORAGE_KEY_THEME) || "sakura";
    if (!THEME_MAP[theme]) {
      return "sakura";
    }
    return theme;
  } catch (err) {
    console.error("載入主題失敗:", err);
    return "sakura";
  }
}

function saveTheme(themeKey) {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, themeKey);
  } catch (err) {
    console.error("儲存主題失敗:", err);
  }
}

// ===== 初始化 =====
function init() {
  // 預設今天日期
  dateInput.value = getTodayDateStr();

  // 載入資料
  expenses = loadExpenses();
  calculateStats();
  renderList();

  // 載入主題
  const themeKey = loadTheme();
  applyTheme(themeKey);
  themeSelect.value = themeKey;

  // 載入預算
  const budget = loadBudget();
  if (budgetInput && budget > 0) {
    budgetInput.value = String(budget);
  }
  updateBudgetStatus();

  // 綁定事件
  form.addEventListener("submit", handleFormSubmit);

  themeSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    applyTheme(value);
    saveTheme(value);
  });

  // 篩選事件
  function updateFilters() {
    currentFilters = {
      startDate: filterStartInput.value || "",
      endDate: filterEndInput.value || "",
      category: filterCategorySelect.value || "all",
    };
    renderList();
  }

  filterStartInput.addEventListener("change", updateFilters);
  filterEndInput.addEventListener("change", updateFilters);
  filterCategorySelect.addEventListener("change", updateFilters);

  clearFiltersBtn.addEventListener("click", () => {
    filterStartInput.value = "";
    filterEndInput.value = "";
    filterCategorySelect.value = "all";
    currentFilters = {
      startDate: "",
      endDate: "",
      category: "all",
    };
    renderList();
  });

  // 預算事件
  if (saveBudgetBtn && budgetInput) {
    saveBudgetBtn.addEventListener("click", () => {
      const value = Number(budgetInput.value);
      if (!budgetInput.value || !Number.isFinite(value) || value <= 0) {
        if (
          confirm(
            "預算金額為空或不正確，是否清除本月預算設定？"
          )
        ) {
          budgetInput.value = "";
          saveBudget(0);
          updateBudgetStatus();
        }
        return;
      }
      saveBudget(value);
      updateBudgetStatus();
      alert("已儲存本月預算。");
    });
  }

  // 匯出 / 匯入事件
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportAsCsv);
  }
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", exportAsJson);
  }
  if (importBtn && importFileInput) {
    importBtn.addEventListener("click", () => {
      importFileInput.value = "";
      importFileInput.click();
    });

    importFileInput.addEventListener("change", () => {
      const file = importFileInput.files && importFileInput.files[0];
      if (!file) return;
      importFromFile(file);
    });
  }
}

document.addEventListener("DOMContentLoaded", init);


