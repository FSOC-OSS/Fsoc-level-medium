// --- Toast Notification System ---
class ToastNotification {
  constructor(options = {}) {
    this.position = options.position || 'top-right';
    this.defaultDuration = options.defaultDuration || 5000;
    this.maxToasts = options.maxToasts || 5;
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
    this.container.className = `toast-container ${this.position}`;
  }

  show(type, title, message, duration) {
    // Remove oldest toast if limit reached
    if (this.toasts.length >= this.maxToasts) {
      this.remove(this.toasts[0].element);
    }

    const toast = this.createToast(type, title, message, duration);
    this.container.appendChild(toast.element);
    this.toasts.push(toast);

    // Auto dismiss
    if (toast.duration > 0) {
      toast.timeout = setTimeout(() => {
        this.remove(toast.element);
      }, toast.duration);
    }

    return toast;
  }

  createToast(type, title, message, duration) {
    const toastDuration = duration !== undefined ? duration : this.defaultDuration;
    
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    };

    const icon = icons[type] || 'ℹ';
    const toastTitle = title || titles[type] || 'Notification';

    toastElement.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${toastTitle}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
      ${toastDuration > 0 ? `<div class="toast-progress" style="animation-duration: ${toastDuration}ms;"></div>` : ''}
    `;

    const closeBtn = toastElement.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.remove(toastElement);
    });

    return {
      element: toastElement,
      duration: toastDuration,
      timeout: null
    };
  }

  remove(toastElement) {
    const index = this.toasts.findIndex(t => t.element === toastElement);
    if (index === -1) return;

    const toast = this.toasts[index];
    
    // Clear timeout if exists
    if (toast.timeout) {
      clearTimeout(toast.timeout);
    }

    // Add removing animation
    toastElement.classList.add('removing');
    
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
      this.toasts.splice(index, 1);
    }, 300); // Match animation duration
  }

  success(message, title, duration) {
    return this.show('success', title, message, duration);
  }

  error(message, title, duration) {
    return this.show('error', title, message, duration);
  }

  warning(message, title, duration) {
    return this.show('warning', title, message, duration);
  }

  info(message, title, duration) {
    return this.show('info', title, message, duration);
  }

  setPosition(position) {
    this.position = position;
    this.container.className = `toast-container ${position}`;
  }

  clearAll() {
    this.toasts.forEach(toast => {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
      }
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
    });
    this.toasts = [];
  }
}

// Initialize global toast instance
const toast = new ToastNotification({
  position: 'top-right',
  defaultDuration: 5000,
  maxToasts: 5
});

document.addEventListener("DOMContentLoaded", () => {
  //Fix recent changes
  // --- Task Manager Setup ---
  const taskInput = document.getElementById("task-input");
  const dueDateInput = document.getElementById("due-date-input");
  const prioritySelect = document.getElementById("priority-select");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const sortTasksBtn = document.getElementById("sort-tasks-btn");
  const sortPriorityBtn = document.getElementById("sort-priority-btn");
  const sortDateBtn = document.getElementById("sort-date-btn");
  const taskSearch = document.getElementById("task-search");
  const searchBtn = document.getElementById("search-btn");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const searchCount = document.getElementById("search-count");

  // --- Export/Import Setup ---
  const exportBtn = document.getElementById("export-data-btn");
  const importBtn = document.getElementById("import-data-btn");
  const importFileInput = document.getElementById("import-file-input");

  // --- Weather Widget Setup ---
  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const getLocationBtn = document.getElementById("get-location-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const yearSpan = document.getElementById("year");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let tagRegistry = JSON.parse(localStorage.getItem("tags")) || {};
  let activeTagFilter = null;
  let currentFilter = "all";
  let sortType = "none";
  let currentWeatherController = null;

  // --- Sorting State ---
  let sortState = JSON.parse(localStorage.getItem("sortState")) || {
    key: "title",
    direction: "asc"
  };

  // --- Weather API Key ---
  const weatherApiKey = "4b1ee5452a2e3f68205153f28bf93927";
  const DEBOUNCE_DELAY = 500;
  const WEATHER_TIMEOUT_MS = 8000;
  const MAX_RETRIES = 3;

    // Hamburger Functionality
    const hamburger = document.getElementById("hamburger");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("close-btn");
const hamburgertabs = document.getElementById("hamburger-tabs")

hamburger.addEventListener("click", () => {
  sidebar.classList.add("active");
});

hamburgertabs.addEventListener("click",()=>{
  sidebar.classList.remove("active");
})


closeBtn.addEventListener("click", () => {
  sidebar.classList.remove("active");
});

  // --- Validation State ---
  let taskInputError = taskInput.parentNode.querySelector(".input-error");
  if (!taskInputError) {
    taskInputError = document.createElement("span");
    taskInputError.className = "input-error";
    taskInputError.setAttribute("aria-live", "polite");
    taskInputError.style.display = "none";
    taskInput.parentNode.insertBefore(taskInputError, taskInput.nextSibling);
  }

  let dueDateInputError = dueDateInput.parentNode.querySelector(".input-error");
  if (!dueDateInputError) {
    dueDateInputError = document.createElement("span");
    dueDateInputError.className = "input-error";
    dueDateInputError.setAttribute("aria-live", "polite");
    dueDateInputError.style.display = "none";
    dueDateInput.parentNode.insertBefore(dueDateInputError, dueDateInput.nextSibling);
  }

  // --- Utility Functions ---
  function debounce(func, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function escRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const r = new RegExp(`(${escRegex(query)})`, "gi");
    return text.replace(r, "<mark>$1</mark>");
  }

  function levenshtein(a, b) {
    const al = a.length, bl = b.length;
    if (!al) return bl;
    if (!bl) return al;
    const v0 = Array.from({ length: bl + 1 }, (_, i) => i);
    const v1 = new Array(bl + 1);
    for (let i = 1; i <= al; i++) {
      v1[0] = i;
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
        v1[j] = Math.min(v1[j - 1] + 1, v0[j] + 1, v0[j - 1] + cost);
      }
      for (let j = 0; j <= bl; j++) v0[j] = v1[j];
    }
    return v1[bl];
  }

  function fuzzyMatch(text, query) {
    if (!query) return false;
    const t = (text || "").toLowerCase();
    const q = query.toLowerCase();
    if (q.length <= 1) return t.includes(q);
    if (t.includes(q)) return true;
    const threshold = Math.max(1, Math.floor(q.length * 0.28));
    return levenshtein(t, q) <= threshold;
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function saveSortState() {
    localStorage.setItem("sortState", JSON.stringify(sortState));
  }

  function saveTags() {
    localStorage.setItem("tags", JSON.stringify(tagRegistry));
  }

  function normalizeTask(t) {
    return {
      id: t.id || (t.created ? String(t.created) : (Date.now() + Math.random()).toString(36)),
      text: t.text || "",
      description: t.description || "",
      tags: Array.isArray(t.tags) ? t.tags : [],
      completed: !!t.completed,
      created: t.created || Date.now(),
      priority: typeof t.priority === 'number' ? t.priority : 2,
      dueDate: t.dueDate || null
    };
  }

  tasks = tasks.map(normalizeTask);
  saveTasks();

  // --- Validation Functions ---
  function validateTaskInput() {
    const value = taskInput.value.trim();
    if (!value) {
      taskInput.classList.add("input-invalid");
      taskInput.classList.remove("input-valid");
      taskInputError.textContent = "Task title is required.";
      taskInputError.style.display = "block";
      return false;
    }
    if (value.length < 3) {
      taskInput.classList.add("input-invalid");
      taskInput.classList.remove("input-valid");
      taskInputError.textContent = "Task title must be at least 3 characters.";
      taskInputError.style.display = "block";
      return false;
    }
    taskInput.classList.remove("input-invalid");
    taskInput.classList.add("input-valid");
    taskInputError.textContent = "";
    taskInputError.style.display = "none";
    return true;
  }

  function validateDueDateInput() {
    const value = dueDateInput.value;
    if (value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (selectedDate < today) {
        dueDateInput.classList.add("input-invalid");
        dueDateInput.classList.remove("input-valid");
        dueDateInputError.textContent = "Due date cannot be in the past.";
        dueDateInputError.style.display = "block";
        return false;
      }
    }
    dueDateInput.classList.remove("input-invalid");
    if (value) dueDateInput.classList.add("input-valid");
    dueDateInputError.textContent = "";
    dueDateInputError.style.display = "none";
    return true;
  }

  function validateForm() {
    const validTask = validateTaskInput();
    const validDate = validateDueDateInput();
    return validTask && validDate;
  }

  function updateTaskProgressBar() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    const bar = document.getElementById("task-progress-bar");
    if (bar) {
      bar.style.width = percent + "%";
      if (percent < 30) {
        bar.style.background = "linear-gradient(90deg,#e94560 0%,#f9d423 100%)";
      } else if (percent < 70) {
        bar.style.background = "linear-gradient(90deg,#f9d423 0%,#4f8cff 100%)";
      } else {
        bar.style.background = "linear-gradient(90deg,#28a745 0%,#4f8cff 100%)";
      }
    }

    const percentLabel = document.getElementById("task-progress-percent");
    if (percentLabel) percentLabel.textContent = percent + "%";

    const summary = document.getElementById("task-progress-summary");
    if (summary) summary.textContent = `${completed} of ${total} tasks completed`;

    const ring = document.getElementById("task-progress-ring");
    const ringLabel = document.getElementById("task-progress-ring-label");
    if (ring && ringLabel) {
      const radius = 26;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - percent / 100);
      ring.setAttribute("stroke-dasharray", `${circumference}`);
      ring.setAttribute("stroke-dashoffset", `${offset}`);
      if (percent < 30) {
        ring.setAttribute("stroke", "#e94560");
      } else if (percent < 70) {
        ring.setAttribute("stroke", "#f9d423");
      } else {
        ring.setAttribute("stroke", "#28a745");
      }
      ringLabel.textContent = percent + "%";
    }
  }

  // --- Task Data Model ---
  function addTask() {
    if (!validateForm()) return;
    const text = taskInput.value.trim();
    const dueDate = dueDateInput.value ? dueDateInput.value : null;
    const priority = prioritySelect ? parseInt(prioritySelect.value) : 2;
    const rawTags = document.getElementById('task-tags') ? document.getElementById('task-tags').value : '';
    const cleaned = sanitizeTagInputValue(rawTags);
    const tags = cleaned.split(/\s+/).filter(Boolean);
    tags.forEach(tag => { tagRegistry[tag] = (tagRegistry[tag] || 0) + 1; });
    saveTags();
    
    const newTask = {
      text,
      description: '',
      tags,
      completed: false,
      created: Date.now(),
      priority,
      dueDate
    };
    tasks.push(newTask);
    saveTasks();
    
    if (activeTagFilter) {
      const matchesFilter = Array.isArray(newTask.tags) && newTask.tags.includes(activeTagFilter);
      if (!matchesFilter) {
        activeTagFilter = null;
        const sel = document.getElementById('tag-filter-select');
        if (sel) sel.value = '';
      }
    }
    
    taskInput.value = "";
    dueDateInput.value = "";
    if (prioritySelect) prioritySelect.value = "2";
    if (document.getElementById('task-tags')) document.getElementById('task-tags').value = '';
    taskInput.classList.remove("input-valid");
    dueDateInput.classList.remove("input-valid");
    renderPopularTags();
    renderTasks();
    updateTaskProgressBar();
  }

  function deleteTask(index) {
    const t = tasks[index];
    if (t && Array.isArray(t.tags)) {
      t.tags.forEach(tag => {
        if (tagRegistry[tag]) {
          tagRegistry[tag] = Math.max(0, tagRegistry[tag] - 1);
          if (tagRegistry[tag] === 0) delete tagRegistry[tag];
        }
      });
      saveTags();
    }
    tasks.splice(index, 1);
    saveTasks();
    rebuildTagRegistryFromTasks();
    renderPopularTags();
    renderTasks();
    updateTaskProgressBar();
  }

  function clearAllTasks() {
    if (!confirm("Are you sure you want to delete ALL tasks? This cannot be undone.")) return;
    tasks = [];
    tagRegistry = {};
    saveTags();
    saveTasks();
    renderPopularTags();
    renderTasks();
    updateTaskProgressBar();
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
    updateTaskProgressBar();
  }

  function changePriority(index, newPriority) {
    tasks[index].priority = parseInt(newPriority);
    saveTasks();
    renderTasks();
  }

  function getPriorityBadge(priority) {
    const badges = {
      1: '<span class="priority-badge priority-high">High</span>',
      2: '<span class="priority-badge priority-medium">Medium</span>',
      3: '<span class="priority-badge priority-low">Low</span>'
    };
    return badges[priority] || badges[2];
  }

  function enableInlineEdit(index, spanEl) {
    if (spanEl.parentElement.querySelector(".task-edit-input")) return;
    const originalText = tasks[index].text;
    const input = document.createElement("input");
    input.type = "text";
    input.value = originalText;
    input.className = "task-edit-input";
    spanEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const saveChanges = () => {
      const newText = input.value.trim();
      if (newText.length < 3) {
        input.classList.add("input-invalid");
        input.classList.remove("input-valid");
        return;
      }
      tasks[index].text = newText || originalText;
      saveTasks();
      renderTasks();
    };

    input.addEventListener("blur", saveChanges);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      else if (e.key === "Escape") {
        input.value = originalText;
        input.blur();
      }
    });
  }
  let selectedTaskIndex = -1;

function focusTaskInput() {
    document.getElementById('task-input').focus();
}

function showShortcutModal() {
    document.getElementById('shortcut-modal').style.display = 'flex';
}

function hideShortcutModal() {
    document.getElementById('shortcut-modal').style.display = 'none';
}

function selectTask(index) {
    const tasks = document.querySelectorAll('#task-list li');
    tasks.forEach((task, i) => {
        task.classList.toggle('selected', i === index);
    });
    selectedTaskIndex = index;
}

function moveSelection(offset) {
    const tasks = document.querySelectorAll('#task-list li');
    if (tasks.length === 0) return;
    let newIndex = selectedTaskIndex + offset;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= tasks.length) newIndex = tasks.length - 1;
    selectTask(newIndex);
    tasks[newIndex].scrollIntoView({ block: 'nearest' });
}

document.addEventListener('keydown', function(e) {
    // Ignore shortcuts if modal is open
    if (document.getElementById('shortcut-modal').style.display === 'flex') {
        if (e.key === 'Escape') hideShortcutModal();
        return;
    }

    // Show shortcut modal
    if (e.key === '?') {
        showShortcutModal();
        e.preventDefault();
        return;
    }

    // Focus task input
    if (e.key === '/') {
        focusTaskInput();
        e.preventDefault();
        return;
    }

    // Add task
    if ((e.ctrlKey && e.key === 'n') || 
        (document.activeElement.id === 'task-input' && e.key === 'Enter')) {
        document.getElementById('add-task-btn').click();
        e.preventDefault();
        return;
    }

    // Sort tasks
    if (e.ctrlKey && e.key === 's') {
        document.getElementById('sort-tasks-btn').click();
        e.preventDefault();
        return;
    }

    // Clear all tasks
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        document.getElementById('clear-all-btn').click();
        e.preventDefault();
        return;
    }

    // Navigate tasks
    if (e.key === 'ArrowDown') {
        moveSelection(1);
        e.preventDefault();
        return;
    }
    if (e.key === 'ArrowUp') {
        moveSelection(-1);
        e.preventDefault();
        return;
    }

    // Complete selected task
    if (e.ctrlKey && e.key === 'Enter' && selectedTaskIndex !== -1) {
        const tasks = document.querySelectorAll('#task-list li');
        const completeBtn = tasks[selectedTaskIndex]?.querySelector('.complete-btn');
        completeBtn?.click();
        e.preventDefault();
        return;
    }

    // Delete selected task
    if (e.key === 'Delete' && selectedTaskIndex !== -1) {
        const tasks = document.querySelectorAll('#task-list li');
        const deleteBtn = tasks[selectedTaskIndex]?.querySelector('.delete-btn');
        deleteBtn?.click();
        e.preventDefault();
        return;
    }
});

document.getElementById('close-shortcut-modal').addEventListener('click', hideShortcutModal);

// Add sele

  // --- Sorting ---
  function sortTasksByType(tasksArr) {
    let sorted = [...tasksArr];
    
    if (sortType === "priority") {
      sorted.sort((a, b) => a.priority - b.priority);
    } else if (sortType === "date") {
      sorted.sort((a, b) => b.created - a.created);
    } else if (sortType === "title") {
      sorted.sort((a, b) => 
        sortState.direction === "asc"
          ? a.text.localeCompare(b.text)
          : b.text.localeCompare(a.text)
      );
    }
    
    return sorted;
  }

  function sortTasksByColumn(tasksArr) {
    let sorted = [...tasksArr];
    switch (sortState.key) {
      case "title":
        sorted.sort((a, b) =>
          sortState.direction === "asc"
            ? a.text.localeCompare(b.text)
            : b.text.localeCompare(a.text)
        );
        break;
      case "date":
        sorted.sort((a, b) =>
          sortState.direction === "asc"
            ? a.created - b.created
            : b.created - a.created
        );
        break;
      case "priority":
        sorted.sort((a, b) =>
          sortState.direction === "asc"
            ? a.priority - b.priority
            : b.priority - a.priority
        );
        break;
      case "status":
        sorted.sort((a, b) =>
          sortState.direction === "asc"
            ? Number(a.completed) - Number(b.completed)
            : Number(b.completed) - Number(a.completed)
        );
        break;
      case "dueDate":
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return sortState.direction === "asc"
            ? new Date(a.dueDate) - new Date(b.dueDate)
            : new Date(b.dueDate) - new Date(a.dueDate);
        });
        break;
      default:
        break;
    }
    return sorted;
  }

  function renderTasks() {
    let incompleteTasks = [];
    let completedTasks = [];
    tasks.forEach((task) => {
      if (task.completed) completedTasks.push(task);
      else incompleteTasks.push(task);
    });

    // Filtering
    let filteredTasks = tasks.filter((task) => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      if (currentFilter === "priority-1") return task.priority === 1;
      if (currentFilter === "priority-2") return task.priority === 2;
      if (currentFilter === "priority-3") return task.priority === 3;
      if (activeTagFilter) return task.tags && task.tags.includes(activeTagFilter);
      return true;
    });

    const q = taskSearch ? taskSearch.value.trim() : "";
    const matches = q
      ? filteredTasks.filter((t) =>
          fuzzyMatch(t.text, q) || fuzzyMatch(t.description || "", q) || (Array.isArray(t.tags) && t.tags.some(tag => fuzzyMatch(tag, q)))
        )
      : [];
    if (searchCount) searchCount.textContent = q ? `${matches.length} match(es)` : "";
    if (q && searchBtn && searchBtn.dataset.active === "true") filteredTasks = matches;

    // Sorting
    // Sorting: user-driven sortType takes precedence; otherwise only sort by column when a key is explicitly set
    if (sortType !== "none") {
      filteredTasks = sortTasksByType(filteredTasks);
    } else if (sortState && sortState.key) {
      filteredTasks = sortTasksByColumn(filteredTasks);
    }

    taskList.innerHTML = "";
    const filterActiveBtn = document.querySelector("#filter-active");
    const filterCompletedBtn = document.querySelector("#filter-completed");
    if (filterActiveBtn) filterActiveBtn.innerHTML = `Active [${incompleteTasks.length}]`;
    if (filterCompletedBtn) filterCompletedBtn.innerHTML = `Completed [${completedTasks.length}]`;

    if (filteredTasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-empty-state";
      empty.setAttribute("aria-live", "polite");
      empty.textContent = "No tasks here. Add a new one or change your filter!";
      taskList.appendChild(empty);
      return;
    }

    // Table header for sorting
    const header = document.createElement("li");
    header.className = "task-header";
    header.innerHTML = `
      <span class="sortable" data-sort="title">Title ${sortState.key === "title" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="date">Date Added ${sortState.key === "date" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="dueDate">Due Date ${sortState.key === "dueDate" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="priority">Priority ${sortState.key === "priority" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="status">Status ${sortState.key === "status" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span></span>
    `;
    header.style.fontWeight = "bold";
    header.style.background = "rgba(0,0,0,0.03)";
    header.style.borderBottom = "1px solid var(--border-color)";
    header.style.display = "grid";
    header.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr 0.5fr";
    header.style.alignItems = "center";
    header.style.padding = "0.5rem 0.5rem";
    taskList.appendChild(header);

    filteredTasks.forEach((task) => {
      const originalIndex = tasks.findIndex((t) => t.id === task.id);
      const li = document.createElement("li");
      li.className = "task-item";
      // mark as draggable-enabled for pointer-based DnD
      li.classList.add('draggable-task');
      li.dataset.id = task.id;
      li.dataset.index = originalIndex;
      li.style.display = "grid";
      li.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr 0.5fr";
      li.style.alignItems = "center";
      li.style.padding = "0.5rem 0.5rem";
      li.style.transition = "background 0.2s";

      // Highlight overdue tasks
      let isOverdue = false;
      if (task.dueDate && !task.completed) {
        const now = new Date();
        const due = new Date(task.dueDate);
        now.setHours(0,0,0,0);
        if (due < now) {
          li.classList.add("overdue-task");
          isOverdue = true;
        }
      }

      // Title with checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.dataset.action = "toggle";
      checkbox.style.marginRight = "0.5rem";

      const taskText = document.createElement("span");
      const qval = taskSearch ? taskSearch.value.trim() : "";
      taskText.innerHTML = qval ? highlightMatch(task.text, qval) : task.text;
      if (task.completed) taskText.classList.add("completed");
      taskText.dataset.action = "edit";

      const titleCell = document.createElement("span");
      titleCell.appendChild(checkbox);
      titleCell.appendChild(taskText);
      titleCell.innerHTML += getPriorityBadge(task.priority);

      // Date Added
      const dateCell = document.createElement("span");
      const dateObj = new Date(task.created);
      dateCell.textContent = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Due Date
      const dueDateCell = document.createElement("span");
      dueDateCell.textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-";
      if (isOverdue) dueDateCell.classList.add("overdue-date");

      // Priority Dropdown
      const priorityDropdown = document.createElement("select");
      priorityDropdown.className = "priority-dropdown";
      priorityDropdown.innerHTML = `
        <option value="1" ${task.priority === 1 ? "selected" : ""}>🔴 High</option>
        <option value="2" ${task.priority === 2 ? "selected" : ""}>🟡 Medium</option>
        <option value="3" ${task.priority === 3 ? "selected" : ""}>🟢 Low</option>
      `;
      priorityDropdown.addEventListener("change", (e) => {
        changePriority(originalIndex, e.target.value);
      });

      // Status
      const statusCell = document.createElement("span");
      statusCell.textContent = task.completed ? "Done" : "Active";
      statusCell.style.color = task.completed ? "var(--completed-color)" : "var(--primary-color)";

      // Delete
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "🗑️";
      deleteBtn.dataset.action = "delete";

      // Tags badges
      const tagsCell = document.createElement('span');
      if (Array.isArray(task.tags)) {
        task.tags.forEach(tg => {
          const badge = document.createElement('span');
          badge.className = 'tag-badge';
          const tc = getTagColors(tg);
          badge.style.background = tc.bg;
          badge.style.color = tc.color;
          badge.textContent = tg;
          badge.title = `Filter by ${tg}`;
          badge.addEventListener('click', () => {
            activeTagFilter = tg;
            renderTasks();
          });
          tagsCell.appendChild(badge);
          tagsCell.appendChild(document.createTextNode(' '));
        });
      }

      if (task.description) {
        const descSpan = document.createElement("span");
        descSpan.className = "task-desc";
        descSpan.innerHTML = qval ? highlightMatch(`(${task.description})`, qval) : `(${task.description})`;
        titleCell.appendChild(descSpan);
      }

      if (tagsCell && tagsCell.childElementCount > 0) {
        titleCell.appendChild(tagsCell);
      }

      li.appendChild(titleCell);
      li.appendChild(dateCell);
      li.appendChild(dueDateCell);
      li.appendChild(priorityDropdown);
      li.appendChild(statusCell);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);

      // Pointer-based drag handlers (works with mouse and touch via Pointer Events)
      li.addEventListener('pointerdown', onTaskPointerDown);
    });

    // Add sorting event listeners to column headers
    taskList.querySelectorAll(".sortable").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const key = el.dataset.sort;
        if (sortState.key === key) {
          sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
        } else {
          sortState.key = key;
          sortState.direction = "asc";
        }
        sortType = "none";
        saveSortState();
        renderTasks();
      });
    });
  }

  // --- Drag & Drop (pointer-based) ---
  let dragState = {};

  function onTaskPointerDown(e) {
    // only start on primary button / primary pointer
    if (e.button && e.button !== 0) return;
    const li = e.currentTarget;
    // avoid starting drag when interacting with interactive controls
    if (e.target.closest('input,select,button,a,textarea,option')) return;

    e.preventDefault();
    li.setPointerCapture(e.pointerId);

    dragState = {
      originLi: li,
      pointerId: e.pointerId,
      startY: e.clientY,
      dragging: false
    };

    document.addEventListener('pointermove', onTaskPointerMove);
    document.addEventListener('pointerup', onTaskPointerUp);
    document.addEventListener('pointercancel', onTaskPointerUp);
  }

  function onTaskPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    const dy = e.clientY - dragState.startY;
    // require small threshold before starting drag to avoid accidental drags
    if (!dragState.dragging && Math.abs(dy) < 6) return;

    if (!dragState.dragging) {
      // initialize drag visuals
      const li = dragState.originLi;
      const rect = li.getBoundingClientRect();

      // placeholder
      const placeholder = document.createElement('li');
      placeholder.className = 'drag-placeholder';
      placeholder.style.height = rect.height + 'px';

      li.parentNode.insertBefore(placeholder, li.nextSibling);

      // clone shown under pointer
      const clone = li.cloneNode(true);
      clone.classList.add('drag-clone');
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = 9999;

      document.body.appendChild(clone);

      li.style.visibility = 'hidden';

      dragState.dragging = true;
      dragState.clone = clone;
      dragState.placeholder = placeholder;
      dragState.offsetY = e.clientY - rect.top;
    }

    // move clone
    if (dragState.clone) {
      dragState.clone.style.top = (e.clientY - dragState.offsetY) + 'px';
    }

    // determine where to move placeholder
    const children = Array.from(taskList.querySelectorAll('li.task-item'));
    let insertBeforeEl = null;
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el === dragState.originLi) continue;
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (e.clientY < mid) {
        insertBeforeEl = el;
        break;
      }
    }

    if (insertBeforeEl) taskList.insertBefore(dragState.placeholder, insertBeforeEl);
    else taskList.appendChild(dragState.placeholder);
  }

  function onTaskPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    document.removeEventListener('pointermove', onTaskPointerMove);
    document.removeEventListener('pointerup', onTaskPointerUp);
    document.removeEventListener('pointercancel', onTaskPointerUp);

    if (dragState.dragging) {
      const placeholder = dragState.placeholder;
      const originLi = dragState.originLi;

      // place the original li where the placeholder is
      placeholder.parentNode.insertBefore(originLi, placeholder);
      originLi.style.visibility = '';

      // clean up clone and placeholder
      if (dragState.clone && dragState.clone.parentNode) dragState.clone.parentNode.removeChild(dragState.clone);
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);

      // rebuild tasks order while preserving tasks not currently visible (filters/search)
      const orderedLis = Array.from(taskList.querySelectorAll('li.task-item'));
      const visibleIds = orderedLis.map((it) => String(it.dataset.id));
      const idToTask = new Map(tasks.map(t => [String(t.id), t]));
      const visibleIdSet = new Set(visibleIds);
      const reorderedVisibleTasks = visibleIds.map(id => idToTask.get(id)).filter(Boolean);

      // find first original index among visible items to decide insertion point
      const firstVisibleId = visibleIds[0];
      const firstVisibleOldIndex = tasks.findIndex(t => String(t.id) === firstVisibleId);

      const newTasksArr = [];
      let inserted = false;
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if (visibleIdSet.has(String(t.id))) {
          // skip visible tasks; they'll be inserted at the insertion point
          continue;
        }
        if (!inserted && i === firstVisibleOldIndex) {
          newTasksArr.push(...reorderedVisibleTasks);
          inserted = true;
        }
        newTasksArr.push(t);
      }
      if (!inserted) newTasksArr.push(...reorderedVisibleTasks);

      tasks = newTasksArr.map(normalizeTask);
      // Clear sorting so manual order persists
      sortType = 'none';
      if (sortState) { sortState.key = null; }
      saveSortState();
      saveTasks();
      renderTasksWithSkeleton();
      updateTaskProgressBar();
    } else {
      // if drag never started, release pointer capture
      try { dragState.originLi.releasePointerCapture(dragState.pointerId); } catch (e) {}
    }

    dragState = {};
  }

  // Tag helpers
  function getTagColors(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    let sat = 70;
    let light = 50;
    if (hue >= 30 && hue <= 70) {
      sat = 78;
      light = 62;
    }
    if (hue <= 15 || hue >= 345) {
      sat = 72;
      light = 56;
    }
    if ((hue > 70 && hue < 160) || (hue > 200 && hue < 280)) {
      sat = 65;
      light = 52;
    }
    const bg = `hsl(${hue} ${sat}% ${light}%)`;
    const textColor = light > 58 ? '#222' : '#fff';
    return { bg, color: textColor };
  }

  function renderPopularTags() {
    const popular = document.getElementById('popular-tags');
    if (!popular) return;
    popular.innerHTML = '';
    const entries = Object.entries(tagRegistry).sort((a,b) => b[1]-a[1]).slice(0,8);
    entries.forEach(([tag, count]) => {
      const el = document.createElement('span');
      el.className = 'tag-badge';
      const tcolors = getTagColors(tag);
      el.style.background = tcolors.bg;
      el.style.color = tcolors.color;
      el.textContent = `${tag} (${count})`;
      el.addEventListener('click', () => { activeTagFilter = tag; renderTasks(); });
      popular.appendChild(el);
    });
    const activeWrap = document.getElementById('active-tag-filter');
    if (activeWrap) activeWrap.textContent = activeTagFilter ? `Filtering: ${activeTagFilter}` : '';
    updateTagFilterOptions();
  }

  function updateTagFilterOptions() {
    const sel = document.getElementById('tag-filter-select');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '-- Filter by tag --';
    sel.appendChild(noneOpt);
    Object.entries(tagRegistry).sort((a,b)=> b[1]-a[1]).forEach(([tag,count]) => {
      const o = document.createElement('option');
      o.value = tag;
      o.textContent = `${tag} (${count})`;
      sel.appendChild(o);
    });
    if (prev && Array.from(sel.options).some(o=>o.value===prev)) sel.value = prev;
  }

  function renderTagSuggestions(prefix) {
    const wrap = document.getElementById('tag-suggestions');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!prefix) return;
    const lower = prefix.toLowerCase();
    const matches = Object.keys(tagRegistry).filter(t => t.startsWith(lower)).slice(0,8);
    matches.forEach(m => {
      const el = document.createElement('span');
      el.className = 'tag-suggestion-item';
      el.textContent = m;
      el.addEventListener('click', () => {
        const input = document.getElementById('task-tags');
        if (!input) return;
        const parts = input.value.split(/[\s,]+/).map(s=>s.trim()).filter(Boolean);
        if (!parts.includes(m)) parts.push(m);
        input.value = parts.join(' ');
        renderTagSuggestions('');
      });
      wrap.appendChild(el);
    });
  }

  function getCurrentTagPrefix() {
    const input = document.getElementById('task-tags');
    if (!input) return '';
    const raw = input.value || '';
    const parts = raw.split(/[\s,]+/).map(s=>s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length-1].toLowerCase() : '';
  }

  function sanitizeTagInputValue(val) {
    const parts = val.split(/[\s,]+/).map(s => s.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()).filter(Boolean);
    return parts.join(' ');
  }

  function renameTag(oldTag, newTag) {
    if (!oldTag || !newTag) return;
    oldTag = oldTag.toLowerCase();
    newTag = newTag.toLowerCase();
    if (oldTag === newTag) return;
    tasks.forEach(t => {
      if (!Array.isArray(t.tags)) return;
      if (t.tags.includes(oldTag)) {
        t.tags = t.tags.filter(x => x !== oldTag);
        if (!t.tags.includes(newTag)) t.tags.push(newTag);
      }
    });
    const oldCount = tagRegistry[oldTag] || 0;
    const newCount = tagRegistry[newTag] || 0;
    const merged = oldCount + newCount;
    if (merged > 0) tagRegistry[newTag] = merged;
    delete tagRegistry[oldTag];
    saveTags();
    saveTasks();
    renderPopularTags();
    renderTagSuggestions(document.getElementById('task-tags') ? document.getElementById('task-tags').value : '');
    renderTasks();
  }

  function deleteTag(tag) {
    if (!tag) return;
    tag = tag.toLowerCase();
    if (!confirm(`Delete tag '${tag}' from all tasks? This cannot be undone.`)) return;
    delete tagRegistry[tag];
    tasks.forEach(t => {
      if (!Array.isArray(t.tags)) return;
      t.tags = t.tags.filter(x => x !== tag);
    });
    saveTags();
    saveTasks();
    rebuildTagRegistryFromTasks();
    renderPopularTags();
    renderTagSuggestions(document.getElementById('task-tags') ? document.getElementById('task-tags').value : '');
    renderTasks();
  }

  function rebuildTagRegistryFromTasks() {
    tagRegistry = {};
    tasks.forEach(t => {
      if (!Array.isArray(t.tags)) return;
      t.tags.forEach(tag => {
        const k = (typeof tag === 'string') ? tag.toLowerCase() : tag;
        if (!k) return;
        tagRegistry[k] = (tagRegistry[k] || 0) + 1;
      });
    });
    saveTags();
  }

  function renderTagManager() {
    const mgr = document.getElementById('tag-manager');
    if (!mgr) return;
    mgr.innerHTML = '';
    const entries = Object.entries(tagRegistry).sort((a,b)=> b[1]-a[1]);
    if (entries.length === 0) {
      mgr.textContent = 'No tags created yet.';
      return;
    }
    entries.forEach(([tag,count]) => {
      const item = document.createElement('span');
      item.className = 'tag-item';
      const tcolors = getTagColors(tag);
      item.style.background = tcolors.bg;
      item.style.color = tcolors.color;

      const label = document.createElement('input');
      label.type = 'text';
      label.value = tag;
      label.title = `${count} tasks`;

      const saveBtn = document.createElement('button');
      saveBtn.className = 'tag-action-btn';
      saveBtn.textContent = '✎';
      saveBtn.title = 'Rename tag';
      saveBtn.addEventListener('click', () => {
        const newName = label.value.trim();
        if (!newName) { 
          toast.warning('Tag name cannot be empty', 'Invalid Tag Name'); 
          label.value = tag; 
          return; 
        }
        if (newName.toLowerCase() === tag) return;
        renameTag(tag, newName);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'tag-action-btn';
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete tag';
      delBtn.addEventListener('click', () => deleteTag(tag));

      const countSpan = document.createElement('span');
      countSpan.style.marginLeft = '0.4rem';
      countSpan.style.fontWeight = '700';
      countSpan.textContent = `(${count})`;

      item.appendChild(label);
      item.appendChild(countSpan);
      item.appendChild(saveBtn);
      item.appendChild(delBtn);
      mgr.appendChild(item);
    });
  }

  const tagFilterSelect = document.getElementById('tag-filter-select');
  if (tagFilterSelect) {
    tagFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value || null;
      activeTagFilter = val;
      renderTasks();
    });
  }

  const clearTagFilterBtn = document.getElementById('clear-tag-filter-btn');
  if (clearTagFilterBtn) {
    clearTagFilterBtn.addEventListener('click', () => {
      activeTagFilter = null;
      const sel = document.getElementById('tag-filter-select');
      if (sel) sel.value = '';
      renderTasks();
    });
  }

  const tagsInputEl = document.getElementById('task-tags');
  if (tagsInputEl) {
    tagsInputEl.addEventListener('input', (e) => {
      const cleaned = sanitizeTagInputValue(e.target.value);
      if (cleaned !== e.target.value.trim()) {
        e.target.value = cleaned;
      }
      const prefix = getCurrentTagPrefix();
      renderTagSuggestions(prefix);
    });
    tagsInputEl.addEventListener('focus', () => renderTagSuggestions(getCurrentTagPrefix()));
    tagsInputEl.addEventListener('blur', () => setTimeout(() => renderTagSuggestions(''), 150));
  }

  const manageTagsBtn = document.getElementById('manage-tags-btn');
  if (manageTagsBtn) {
    manageTagsBtn.addEventListener('click', () => {
      const mgr = document.getElementById('tag-manager');
      if (!mgr) return;
      const shown = mgr.style.display !== 'none';
      mgr.style.display = shown ? 'none' : 'flex';
      if (!shown) renderTagManager();
    });
  }

  renderPopularTags();

  // --- Export/Import Functions ---
  function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importTasksFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          tasks = imported.map(normalizeTask);
          tagRegistry = {};
          tasks.forEach(t => {
            if (Array.isArray(t.tags)) t.tags.forEach(tag => tagRegistry[tag] = (tagRegistry[tag] || 0) + 1);
          });
          saveTags();
          saveTasks();
          renderPopularTags();
          renderTasks();
          updateTaskProgressBar();
          toast.success('Your tasks have been imported successfully!', 'Import Complete');
        } else {
          toast.error('The file format is invalid. Please upload a valid JSON file.', 'Invalid File Format');
        }
      } catch (err) {
        toast.error(`Failed to import tasks: ${err.message}`, 'Import Error');
      }
    };
    reader.readAsText(file);
  }

  // --- Weather Functions ---
  function cancelOngoingWeatherRequest() {
    if (currentWeatherController) {
      try {
        currentWeatherController.abort();
      } catch (e) {}
      currentWeatherController = null;
    }
  }

  async function fetchWeather(city, attempt = 0) {
    if (!city) {
      weatherInfo.innerHTML = '<p class="loading-text">Enter a city to see the weather...</p>';
      return;
    }

    cancelOngoingWeatherRequest();
    weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

    currentWeatherController = new AbortController();
    const controller = currentWeatherController;
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (controller.signal.aborted) return;

      if (!response.ok) {
        if (response.status === 401) {
          showWeatherError("Invalid API key.");
          return;
        }
        if (response.status === 404) {
          showWeatherError(`Sorry, we couldn't find "${city}". Please check the spelling or try another city.`);
          return;
        }
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          showWeatherError("Request timed out.", attempt);
        }
      } else {
        showWeatherError("Weather data currently unavailable.", attempt);
      }
    } finally {
      if (currentWeatherController === controller) currentWeatherController = null;
    }
  }

  async function fetchWeatherByCoords(lat, lon, attempt = 0) {
    cancelOngoingWeatherRequest();
    weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;

    currentWeatherController = new AbortController();
    const controller = currentWeatherController;
    const timeoutId = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (controller.signal.aborted) return;

      if (!response.ok) {
        if (response.status === 401) {
          showWeatherError("Invalid API key.");
          return;
        }
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        if (attempt < MAX_RETRIES) showWeatherError("Request timed out.", attempt);
      } else {
        showWeatherError("Weather data currently unavailable.", attempt);
      }
    } finally {
      if (currentWeatherController === controller) currentWeatherController = null;
    }
  }

  function showWeatherError(message, attempt = 0) {
    const canRetry = attempt < MAX_RETRIES;
    weatherInfo.innerHTML = `
      <p class="error-text">${message}</p>
      ${canRetry ? '<button id="weather-retry-btn" class="retry-btn">Retry</button>' : ""}
    `;
    const retryBtn = document.getElementById("weather-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", () => {
      if (navigator.geolocation && !cityInput.value) {
        getLocationWeather();
      } else {
        fetchWeather(cityInput.value.trim(), attempt + 1);
      }
    });
  }

  function displayWeather(data) {
    const { name, main, weather } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
      <h3>${name}</h3>
      <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
      <p>Temperature: ${Math.round(main.temp)}°C</p>
      <p>Condition: ${weather[0].main}</p>
    `;
  }

  function getLocationWeather() {
    if (!navigator.geolocation) {
      weatherInfo.innerHTML = `<p class="error-text">Geolocation is not supported by your browser.</p>`;
      return;
    }
    weatherInfo.innerHTML = `<p class="loading-text">Detecting your location...</p>`;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        weatherInfo.innerHTML = `<p class="error-text">Unable to get your location. Please allow location access and try again, or search for a city above.</p>`;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // --- Weather Search Events ---
  const debouncedFetchWeather = debounce(() => {
    const city = cityInput.value.trim();
    if (city === "") {
      cancelOngoingWeatherRequest();
      weatherInfo.innerHTML = '<p class="loading-text">Enter a city to see the weather...</p>';
      return;
    }
    fetchWeather(city);
  }, DEBOUNCE_DELAY);

  cityInput.addEventListener("input", debouncedFetchWeather);

  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      fetchWeather(cityInput.value.trim());
    }
  });

  searchWeatherBtn.addEventListener("click", () => {
    fetchWeather(cityInput.value.trim());
  });

  getLocationBtn.addEventListener("click", getLocationWeather);

  // --- Task Events ---
  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("input", validateTaskInput);
  dueDateInput.addEventListener("input", validateDueDateInput);
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });
  dueDateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask();
  });
  clearAllBtn.addEventListener("click", clearAllTasks);

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasksWithSkeleton();
    });
  });

  taskList.addEventListener("click", (e) => {
    const li = e.target.closest("li.task-item");
    if (!li) return;
    const index = Number(li.dataset.index);
    if (e.target.dataset.action === "toggle") {
      toggleTaskCompletion(index);
    } else if (e.target.dataset.action === "delete") {
      deleteTask(index);
    } else if (e.target.dataset.action === "edit") {
      enableInlineEdit(index, e.target);
    }
  });

  if (taskSearch) {
    taskSearch.addEventListener("input", () => {
      renderTasksWithSkeleton();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const isActive = searchBtn.dataset.active === "true";
      searchBtn.dataset.active = isActive ? "false" : "true";
      searchBtn.classList.toggle("active", !isActive);
      renderTasksWithSkeleton();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (taskSearch) taskSearch.value = "";
      if (searchBtn) {
        searchBtn.dataset.active = "false";
        searchBtn.classList.remove("active");
      }
      if (searchCount) searchCount.textContent = "";
      renderTasksWithSkeleton();
    });
  }

  // For sort buttons:
  if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener("click", () => {
      if (sortType === "priority") {
        sortType = "none";
        sortPriorityBtn.textContent = "Sort by Priority";
      } else {
        sortType = "priority";
        sortPriorityBtn.textContent = "Clear Priority Sort";
      }
      renderTasksWithSkeleton();
    });
  }

  if (sortDateBtn) {
    sortDateBtn.addEventListener("click", () => {
      if (sortType === "date") {
        sortType = "none";
        sortDateBtn.textContent = "Sort by Date";
      } else {
        sortType = "date";
        sortDateBtn.textContent = "Clear Date Sort";
      }
      renderTasksWithSkeleton();
    });
  }

  if (sortTasksBtn) {
    sortTasksBtn.addEventListener("click", () => {
      if (sortType === "title") {
        sortType = "none";
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
      } else {
        sortType = "title";
        sortState.key = "title";
        sortState.direction = "asc";
      }
      saveSortState();
      renderTasksWithSkeleton();
    });
  }

  // For tag filter select:
  if (tagFilterSelect) {
    tagFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value || null;
      activeTagFilter = val;
      renderTasksWithSkeleton();
    });
  }

  // For clear tag filter:
  if (clearTagFilterBtn) {
    clearTagFilterBtn.addEventListener('click', () => {
      activeTagFilter = null;
      const sel = document.getElementById('tag-filter-select');
      if (sel) sel.value = '';
      renderTasksWithSkeleton();
    });
  }

  // For add/delete/complete/clear actions, keep renderTasks() for instant update:
  // --- Skeleton Loader ---
  function showTaskSkeleton(count = 5) {
    taskList.innerHTML = "";
    const skeletonUl = document.createElement("ul");
    skeletonUl.className = "skeleton-list";
    for (let i = 0; i < count; i++) {
      const li = document.createElement("li");
      li.className = "skeleton-item";
      // Title
      const title = document.createElement("div");
      title.className = "skeleton-bar long";
      title.innerHTML = '<div class="skeleton-shimmer"></div>';
      // Date Added
      const date = document.createElement("div");
      date.className = "skeleton-bar short";
      date.innerHTML = '<div class="skeleton-shimmer"></div>';
      // Due Date
      const due = document.createElement("div");
      due.className = "skeleton-bar short";
      due.innerHTML = '<div class="skeleton-shimmer"></div>';
      // Priority
      const priority = document.createElement("div");
      priority.className = "skeleton-bar circle";
      priority.innerHTML = '<div class="skeleton-shimmer"></div>';
      // Status
      const status = document.createElement("div");
      status.className = "skeleton-bar medium";
      status.innerHTML = '<div class="skeleton-shimmer"></div>';
      // Delete
      const del = document.createElement("div");
      del.className = "skeleton-bar circle";
      del.innerHTML = '<div class="skeleton-shimmer"></div>';

      li.appendChild(title);
      li.appendChild(date);
      li.appendChild(due);
      li.appendChild(priority);
      li.appendChild(status);
      li.appendChild(del);
      skeletonUl.appendChild(li);
    }
    taskList.appendChild(skeletonUl);
  }

  
  function renderTasksWithSkeleton() {
    showTaskSkeleton(6); 
    setTimeout(() => {
      renderTasks();
    }, 700);
  }


  function init() {
    renderTasksWithSkeleton();
    updateTaskProgressBar();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    getLocationWeather();
  }

  
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasksWithSkeleton();
    });
  });

  if (taskSearch) {
    taskSearch.addEventListener("input", () => {
      renderTasksWithSkeleton();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const isActive = searchBtn.dataset.active === "true";
      searchBtn.dataset.active = isActive ? "false" : "true";
      searchBtn.classList.toggle("active", !isActive);
      renderTasksWithSkeleton();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (taskSearch) taskSearch.value = "";
      if (searchBtn) {
        searchBtn.dataset.active = "false";
        searchBtn.classList.remove("active");
      }
      if (searchCount) searchCount.textContent = "";
      renderTasksWithSkeleton();
    });
  }

  
  if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener("click", () => {
      if (sortType === "priority") {
        sortType = "none";
        sortPriorityBtn.textContent = "Sort by Priority";
      } else {
        sortType = "priority";
        sortPriorityBtn.textContent = "Clear Priority Sort";
      }
      renderTasksWithSkeleton();
    });
  }

  if (sortDateBtn) {
    sortDateBtn.addEventListener("click", () => {
      if (sortType === "date") {
        sortType = "none";
        sortDateBtn.textContent = "Sort by Date";
      } else {
        sortType = "date";
        sortDateBtn.textContent = "Clear Date Sort";
      }
      renderTasksWithSkeleton();
    });
  }

  if (sortTasksBtn) {
    sortTasksBtn.addEventListener("click", () => {
      if (sortType === "title") {
        sortType = "none";
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
      } else {
        sortType = "title";
        sortState.key = "title";
        sortState.direction = "asc";
      }
      saveSortState();
      renderTasksWithSkeleton();
    });
  }

  if (tagFilterSelect) {
    tagFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value || null;
      activeTagFilter = val;
      renderTasksWithSkeleton();
    });
  }

  if (clearTagFilterBtn) {
    clearTagFilterBtn.addEventListener('click', () => {
      activeTagFilter = null;
      const sel = document.getElementById('tag-filter-select');
      if (sel) sel.value = '';
      renderTasksWithSkeleton();
    });
  }

  function init() {
    renderTasks();
    updateTaskProgressBar();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    getLocationWeather();
  }

  init();
});

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const btnCancel = document.getElementById('modal-cancel');
  const btnConfirm = document.getElementById('modal-confirm');

  let activeElementBeforeModal = null;
  let onConfirmCallback = null;
  let onCancelCallback = null;

  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function openModal({ title = '', content = '', type = 'alert', onConfirm = null, onCancel = null }) {
    activeElementBeforeModal = document.activeElement;
    modalTitle.textContent = title;
    modalContent.innerHTML = content;

    onConfirmCallback = onConfirm;
    onCancelCallback = onCancel;

    if (type === 'alert') {
      btnConfirm.style.display = 'inline-block';
      btnCancel.style.display = 'none';
    } else if (type === 'confirm' || type === 'form') {
      btnConfirm.style.display = 'inline-block';
      btnCancel.style.display = 'inline-block';
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    const focusables = modal.querySelectorAll(focusableSelectors);
    if (focusables.length) focusables[0].focus();
  }

  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    if (activeElementBeforeModal) activeElementBeforeModal.focus();
    onConfirmCallback = null;
    onCancelCallback = null;
  }

  btnConfirm.addEventListener('click', () => {
    if (onConfirmCallback) onConfirmCallback();
    closeModal();
  });

  btnCancel.addEventListener('click', () => {
    if (onCancelCallback) onCancelCallback();
    closeModal();
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('show')) return;

    if (e.key === 'Escape') {
      if (onCancelCallback) onCancelCallback();
      closeModal();
    }

    if (e.key === 'Tab') {
      const focusables = [...modal.querySelectorAll(focusableSelectors)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Demo buttons
  document.getElementById('open-alert').addEventListener('click', () => {
    openModal({ title: 'Alert', content: 'This is an alert modal!', type: 'alert' });
  });

  document.getElementById('open-confirm').addEventListener('click', () => {
    openModal({
      title: 'Confirm',
      content: 'Do you want to proceed?',
      type: 'confirm',
      onConfirm: () => toast.success('Action confirmed successfully!', 'Confirmed'),
      onCancel: () => toast.info('Action was cancelled', 'Cancelled')
    });
  });

  document.getElementById('open-form').addEventListener('click', () => {
    openModal({
      title: 'Form',
      content: `<form>
                  <label>Name: <input type="text" /></label><br/><br/>
                  <label>Email: <input type="email" /></label>
                </form>`,
      type: 'form',
      onConfirm: () => toast.success('Form submitted successfully!', 'Form Submitted'),
      onCancel: () => toast.info('Form submission cancelled', 'Cancelled')
    });
  });

  // --- Toast Notification Demo Buttons ---
  const toastSuccessBtn = document.getElementById('toast-success-btn');
  const toastErrorBtn = document.getElementById('toast-error-btn');
  const toastWarningBtn = document.getElementById('toast-warning-btn');
  const toastInfoBtn = document.getElementById('toast-info-btn');
  const toastPositionSelect = document.getElementById('toast-position-select');
  const clearAllToastsBtn = document.getElementById('clear-all-toasts-btn');

  if (toastSuccessBtn) {
    toastSuccessBtn.addEventListener('click', () => {
      toast.success('Your operation completed successfully!', 'Success', 5000);
    });
  }

  if (toastErrorBtn) {
    toastErrorBtn.addEventListener('click', () => {
      toast.error('An error occurred while processing your request.', 'Error', 5000);
    });
  }

  if (toastWarningBtn) {
    toastWarningBtn.addEventListener('click', () => {
      toast.warning('Please review your input before proceeding.', 'Warning', 5000);
    });
  }

  if (toastInfoBtn) {
    toastInfoBtn.addEventListener('click', () => {
      toast.info('This is an informational message for you.', 'Information', 5000);
    });
  }

  if (toastPositionSelect) {
    toastPositionSelect.addEventListener('change', (e) => {
      toast.setPosition(e.target.value);
      toast.info(`Toast position changed to: ${e.target.value.replace('-', ' ')}`, 'Position Updated', 3000);
    });
  }

  if (clearAllToastsBtn) {
    clearAllToastsBtn.addEventListener('click', () => {
      toast.clearAll();
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // --- Task Management ---
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  const taskInput = document.getElementById('task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');

  function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.textContent = task;
      li.className = 'task-item';
      taskList.appendChild(li);
    });
  }

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  addTaskBtn.addEventListener('click', () => {
    const task = taskInput.value.trim();
    if (!task) {
      toast.warning('Please enter a task before adding', 'Task Required');
      return;
    }
    tasks.push(task);
    taskInput.value = '';
    renderTasks();
    saveTasks();
    toast.success('Task added successfully!', 'Task Added');
  });

  // Initial render
  renderTasks();

  // --- Data Persistence ---
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const clearBtn = document.getElementById('clear-btn');

  // Export JSON
  exportBtn.addEventListener('click', () => {
    const data = { tasks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-manager-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Your data has been exported successfully!', 'Export Complete');
  });

  // Import JSON
  importBtn.addEventListener('click', () => importFile.click());

  importFile.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
          toast.error('The file format is invalid. Please upload a valid JSON file.', 'Invalid JSON File');
          return;
        }
        tasks = importedData.tasks;
        renderTasks();
        saveTasks();
        toast.success('Your data has been imported successfully!', 'Import Complete');
      } catch (err) {
        toast.error(`Failed to import JSON: ${err.message}`, 'Import Error');
      }
    };
    reader.readAsText(file);
  });

  // Clear all data
  clearBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to clear all data?')) return;
    tasks = [];
    localStorage.removeItem('tasks');
    renderTasks();
    toast.info('All data has been cleared', 'Data Cleared');
  });
});
const modalBackdrop = document.getElementById('modal-backdrop');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

let lastFocusedElement = null;
let confirmCallback = null;
let cancelCallback = null;

function openModal({ title, body, type = 'alert', onConfirm, onCancel }) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = title || '';
    modalBody.innerHTML = body || '';
    modalBackdrop.style.display = 'flex';
    document.body.classList.add('modal-open');
    modal.setAttribute('tabindex', '-1');
    modal.focus();

    // Show/hide buttons based on type
    modalConfirmBtn.style.display = type === 'confirm' ? '' : 'none';
    modalCancelBtn.style.display = type === 'confirm' ? '' : 'none';
    modalCloseBtn.style.display = type === 'alert' || type === 'form' ? '' : 'none';

    confirmCallback = typeof onConfirm === 'function' ? onConfirm : null;
    cancelCallback = typeof onCancel === 'function' ? onCancel : null;
}

function closeModal() {
    modalBackdrop.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (lastFocusedElement) lastFocusedElement.focus();
    confirmCallback = null;
    cancelCallback = null;
}

// Button events
modalConfirmBtn.onclick = () => {
    if (confirmCallback) confirmCallback();
    closeModal();
};
modalCancelBtn.onclick = () => {
    if (cancelCallback) cancelCallback();
    closeModal();
};
modalCloseBtn.onclick = closeModal;

// Keyboard accessibility
modalBackdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    // Focus trap
    const focusable = modalBackdrop.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    if (e.key === 'Tab') {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
});