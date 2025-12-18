// ===== 常數與狀態 =====
const STORAGE_KEY_EXPENSES = "simple-expense-tracker:expenses";
const STORAGE_KEY_THEME = "simple-expense-tracker:theme";

let expenses = [];

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

  monthTotalEl.textContent = monthTotal.toLocaleString("zh-TW");
  todayTotalEl.textContent = todayTotal.toLocaleString("zh-TW");
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

  if (!expenses.length) {
    emptyStateEl.style.display = "block";
    recordCountEl.textContent = "0 筆";
    return;
  }

  emptyStateEl.style.display = "none";
  recordCountEl.textContent = `${expenses.length} 筆`;

  // 依日期由新到舊排序，再依建立時間排序
  const sorted = [...expenses].sort((a, b) => {
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

  // 綁定事件
  form.addEventListener("submit", handleFormSubmit);

  themeSelect.addEventListener("change", (e) => {
    const value = e.target.value;
    applyTheme(value);
    saveTheme(value);
  });
}

document.addEventListener("DOMContentLoaded", init);


