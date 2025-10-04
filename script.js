document.addEventListener("DOMContentLoaded", () => {
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
    if (sortType !== "none") {
      filteredTasks = sortTasksByType(filteredTasks);
    } else {
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
      const originalIndex = tasks.findIndex((t) => t === task);
      const li = document.createElement("li");
      li.className = "task-item";
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
        if (!newName) { alert('Tag name cannot be empty'); label.value = tag; return; }
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
          alert("Tasks imported successfully!");
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        alert("Error importing tasks: " + err.message);
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
          showWeatherError(`We couldn't find "${city}". Please check the spelling or try another city.`);
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
      renderTasks();
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
      renderTasks();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const isActive = searchBtn.dataset.active === "true";
      searchBtn.dataset.active = isActive ? "false" : "true";
      searchBtn.classList.toggle("active", !isActive);
      renderTasks();
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
      renderTasks();
    });
  }

  window.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'f') {
      if (taskSearch) {
        e.preventDefault();
        taskSearch.focus();
        taskSearch.select();
      }
    }
  });

  // --- Export/Import Events ---
  if (exportBtn) {
    exportBtn.addEventListener("click", exportTasks);
  }
  if (importBtn && importFileInput) {
    importBtn.addEventListener("click", () => importFileInput.click());
    importFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        importTasksFromFile(e.target.files[0]);
        importFileInput.value = "";
      }
    });
  }

  // --- Theme Toggle ---
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
    });
  }

  // --- Priority Sort Button ---
  if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener("click", () => {
      if (sortType === "priority") {
        sortType = "none";
        sortPriorityBtn.textContent = "Sort by Priority";
      } else {
        sortType = "priority";
        sortPriorityBtn.textContent = "Clear Priority Sort";
      }
      renderTasks();
    });
  }

  // --- Date Sort Button ---
  if (sortDateBtn) {
    sortDateBtn.addEventListener("click", () => {
      if (sortType === "date") {
        sortType = "none";
        sortDateBtn.textContent = "Sort by Date";
      } else {
        sortType = "date";
        sortDateBtn.textContent = "Clear Date Sort";
      }
      renderTasks();
    });
  }

  // --- Sort A-Z Button ---
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
      renderTasks();
    });
  }

  // --- Init ---
  function init() {
    renderTasks();
    updateTaskProgressBar();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    getLocationWeather();
  }

  init();
});