document.addEventListener("DOMContentLoaded", () => {
  // --- Task Manager Setup ---
  const taskInput = document.getElementById("task-input")
  const dueDateInput = document.getElementById("due-date-input") // NEW
  const addTaskBtn = document.getElementById("add-task-btn")
  const taskList = document.getElementById("task-list")
  const clearAllBtn = document.getElementById("clear-all-btn")
  const filterBtns = document.querySelectorAll(".filter-btn")
  const sortTasksBtn = document.getElementById("sort-tasks-btn")

  const priorityInput = document.getElementById("priority-input")
  const tagsInput = document.getElementById("tags-input")

  const priorityFilter = document.getElementById("priority-filter")
  const tagsFilter = document.getElementById("tags-filter")
  const dueFromFilter = document.getElementById("due-from-filter")
  const dueToFilter = document.getElementById("due-to-filter")
  const clearFiltersBtn = document.getElementById("clear-filters-btn")

  // --- Export/Import Setup ---
  const exportBtn = document.getElementById("export-data-btn");
  const importBtn = document.getElementById("import-data-btn");
  const importFileInput = document.getElementById("import-file-input");

  // --- Weather Widget Setup ---
  const cityInput = document.getElementById("city-input")
  const searchWeatherBtn = document.getElementById("search-weather-btn")
  const getLocationBtn = document.getElementById("get-location-btn")
  const weatherInfo = document.getElementById("weather-info")
  const themeToggle = document.getElementById("theme-toggle")
  const yearSpan = document.getElementById("year")

  let tasks = JSON.parse(localStorage.getItem("tasks")) || []
  let currentFilter = "all"
  let filters = {
    status: "all", // all | active | completed
    priority: "all", // all | high | medium | low
    tags: [], // array of lowercased tag names
    dueFrom: null, // YYYY-MM-DD
    dueTo: null, // YYYY-MM-DD
  }

  // --- Sorting State ---
  const sortState = JSON.parse(localStorage.getItem("sortState")) || {
    key: "title",
    direction: "asc",
  }

  // --- Weather API Key ---
  const weatherApiKey = "4b1ee5452a2e3f68205153f28bf93927"
  const DEBOUNCE_DELAY = 500
  const WEATHER_TIMEOUT_MS = 8000
  const MAX_RETRIES = 3

  let weatherSearchTimeout // Declare the variable here

  // --- Validation State ---
  // Add error containers only if not present
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
    return function (...args) {
      clearTimeout(weatherSearchTimeout)
      weatherSearchTimeout = setTimeout(() => func.apply(this, args), delay)
    }
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
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }

  function saveSortState() {
    localStorage.setItem("sortState", JSON.stringify(sortState))
  }

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

  // --- Task Data Model ---
  // Each task: { text, completed, created, priority, dueDate, tags }
  function addTask() {
    const text = taskInput.value.trim()
    const dueDate = dueDateInput.value ? dueDateInput.value : null
    if (!text) return

    const prio = priorityInput ? Number(priorityInput.value) : 2 // 1=High, 2=Medium, 3=Low
    const tagsRaw = tagsInput && tagsInput.value ? tagsInput.value : ""
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const newTask = {
      text,
      completed: false,
      created: Date.now(),
      priority: prio,
      dueDate,
      tags,
    }
    tasks.push(newTask)
    saveTasks()

    taskInput.value = ""
    dueDateInput.value = ""
    if (priorityInput) priorityInput.value = "2"
    if (tagsInput) tagsInput.value = ""
    renderTasks()
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function saveSortState() {
    localStorage.setItem("sortState", JSON.stringify(sortState));
  }

  function deleteTask(index) {
    tasks.splice(index, 1)
    saveTasks()
    renderTasks()
  }

  function clearAllTasks() {
    tasks = []
    saveTasks()
    renderTasks()
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed
    saveTasks()
    renderTasks()
  }

  function enableInlineEdit(index, spanEl) {
    if (spanEl.parentElement.querySelector(".task-edit-input")) return
    const originalText = tasks[index].text
    const input = document.createElement("input")
    input.type = "text"
    input.value = originalText
    input.className = "task-edit-input"
    spanEl.replaceWith(input)
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)

    const saveChanges = () => {
      const newText = input.value.trim()
      tasks[index].text = newText || originalText
      saveTasks()
      renderTasks()
    }

    input.addEventListener("blur", saveChanges)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur()
      else if (e.key === "Escape") {
        input.value = originalText
        input.blur()
      }
    })
  }

  // --- Sorting ---
  function sortTasks(tasksArr) {
    const sorted = [...tasksArr]
    switch (sortState.key) {
      case "title":
        sorted.sort((a, b) =>
          sortState.direction === "asc" ? a.text.localeCompare(b.text) : b.text.localeCompare(a.text),
        )
        break
      case "date":
        sorted.sort((a, b) => (sortState.direction === "asc" ? a.created - b.created : b.created - a.created))
        break
      case "priority":
        sorted.sort((a, b) => (sortState.direction === "asc" ? a.priority - b.priority : b.priority - a.priority))
        break
      case "status":
        sorted.sort((a, b) => (sortState.direction === "asc" ? a.completed - b.completed : b.completed - a.completed))
        break
      case "dueDate":
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return sortState.direction === "asc"
            ? new Date(a.dueDate) - new Date(b.dueDate)
            : new Date(b.dueDate) - new Date(a.dueDate)
        })
        break
      default:
        break
    }
    return sorted
  }

  function renderTasks() {
    const incompleteTasks = []
    const completedTasks = []
    tasks.forEach((task) => {
      if (task.completed) completedTasks.push(task)
      else incompleteTasks.push(task)
    })

    let filteredTasks = tasks.filter((task) => {
      // status
      if (filters.status === "active" && task.completed) return false
      if (filters.status === "completed" && !task.completed) return false

      // priority
      if (filters.priority !== "all") {
        const map = { high: 1, medium: 2, low: 3 }
        if (task.priority !== map[filters.priority]) return false
      }

      // tags (must include all filter tags)
      if (filters.tags.length > 0) {
        const taskTags = (task.tags || []).map((t) => t.toLowerCase())
        const hasAll = filters.tags.every((tg) => taskTags.includes(tg))
        if (!hasAll) return false
      }

      // due date range
      if (filters.dueFrom) {
        if (!task.dueDate || new Date(task.dueDate) < new Date(filters.dueFrom)) return false
      }
      if (filters.dueTo) {
        if (!task.dueDate || new Date(task.dueDate) > new Date(filters.dueTo)) return false
      }

      return true
    })

    const q = taskSearch ? taskSearch.value.trim() : "";
    const matches = q
      ? filteredTasks.filter((t) =>
          fuzzyMatch(t.text, q) || fuzzyMatch(t.description || "", q) || (Array.isArray(t.tags) && t.tags.some(tag => fuzzyMatch(tag, q)))
        )
      : [];
    if (searchCount) searchCount.textContent = q ? `${matches.length} match(es)` : "";
    if (q && searchBtn && searchBtn.dataset.active === "true") filteredTasks = matches;

    // Sorting
    filteredTasks = sortTasks(filteredTasks)

    taskList.innerHTML = ""
    const filterActiveBtn = document.querySelector("#filter-active")
    const filterCompletedBtn = document.querySelector("#filter-completed")
    if (filterActiveBtn) filterActiveBtn.innerHTML = `Active [${incompleteTasks.length}]`
    if (filterCompletedBtn) filterCompletedBtn.innerHTML = `Completed [${completedTasks.length}]`

    if (filteredTasks.length === 0) {
      const empty = document.createElement("li")
      empty.className = "task-empty-state"
      empty.setAttribute("aria-live", "polite")
      empty.textContent = "No tasks here. Add a new one or change your filter!"
      taskList.appendChild(empty)
      return
    }

    const header = document.createElement("li")
    header.className = "task-header"
    header.innerHTML = `
      <span class="sortable" data-sort="title">Title ${sortState.key === "title" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="date">Date Added ${sortState.key === "date" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="dueDate">Due Date ${sortState.key === "dueDate" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span class="sortable" data-sort="priority">Priority ${sortState.key === "priority" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span>Tags</span>
      <span class="sortable" data-sort="status">Status ${sortState.key === "status" ? (sortState.direction === "asc" ? "▲" : "▼") : ""}</span>
      <span></span>
    `
    header.style.fontWeight = "bold"
    header.style.background = "rgba(0,0,0,0.03)"
    header.style.borderBottom = "1px solid var(--border-color)"
    header.style.display = "grid"
    header.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr 1fr 0.5fr"
    header.style.alignItems = "center"
    header.style.padding = "0.5rem 0.5rem"
    taskList.appendChild(header)

    filteredTasks.forEach((task) => {
      const originalIndex = tasks.findIndex((t) => t === task)
      const li = document.createElement("li")
      li.className = "task-item"
      li.dataset.index = originalIndex
      li.style.display = "grid"
      li.style.gridTemplateColumns = "2fr 1fr 1fr 1fr 1fr 1fr 0.5fr"
      li.style.alignItems = "center"
      li.style.padding = "0.5rem 0.5rem"
      li.style.transition = "background 0.2s"

      // Highlight overdue tasks
      let isOverdue = false
      if (task.dueDate && !task.completed) {
        const now = new Date()
        const due = new Date(task.dueDate)
        if (due < now.setHours(0, 0, 0, 0)) {
          li.classList.add("overdue-task")
          isOverdue = true
        }
      }

      // Title
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.checked = task.completed
      checkbox.dataset.action = "toggle"
      checkbox.style.marginRight = "0.5rem"

      const taskText = document.createElement("span")
      taskText.textContent = task.text
      if (task.completed) taskText.classList.add("completed")
      taskText.dataset.action = "edit"

      const titleCell = document.createElement("span")
      titleCell.appendChild(checkbox)
      titleCell.appendChild(taskText)

      // Date Added
      const dateCell = document.createElement("span")
      const dateObj = new Date(task.created)
      dateCell.textContent =
        dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      // Due Date
      const dueDateCell = document.createElement("span")
      dueDateCell.textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"
      if (isOverdue) dueDateCell.classList.add("overdue-date")

      // Priority
      const priorityCell = document.createElement("span")
      let priorityText = "Medium"
      if (task.priority === 1) priorityText = "High"
      if (task.priority === 3) priorityText = "Low"
      priorityCell.textContent = priorityText

      const tagsCell = document.createElement("span")
      tagsCell.textContent = task.tags && task.tags.length ? task.tags.join(", ") : "-"

      // Status
      const statusCell = document.createElement("span")
      statusCell.textContent = task.completed ? "Done" : "Active"
      statusCell.style.color = task.completed ? "var(--completed-color)" : "var(--primary-color)"

      // Delete
      const deleteBtn = document.createElement("button")
      deleteBtn.className = "delete-btn"
      deleteBtn.textContent = "🗑️"
      deleteBtn.dataset.action = "delete"

      li.appendChild(titleCell)
      li.appendChild(dateCell)
      li.appendChild(dueDateCell)
      li.appendChild(priorityCell)
      li.appendChild(tagsCell)
      li.appendChild(statusCell)
      li.appendChild(deleteBtn)
      taskList.appendChild(li)
    })

    // Sorting listeners
    taskList.querySelectorAll(".sortable").forEach((el) => {
      el.style.cursor = "pointer"
      el.addEventListener("click", () => {
        const key = el.dataset.sort
        if (sortState.key === key) {
          sortState.direction = sortState.direction === "asc" ? "desc" : "asc"
        } else {
          sortState.key = key
          sortState.direction = "asc"
        }
        saveSortState()
        updateURLFromFilters()
        renderTasks()
      })
    })
  }

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
          tasks = imported;
          saveTasks();
          renderTasks();
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
  async function fetchWeather(city, attempt = 0) {
    if (!city) {
      weatherInfo.innerHTML = '<p class="loading-text">Enter a city to see the weather...</p>'
      return
    }
    weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>'
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city,
    )}&appid=${weatherApiKey}&units=metric`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)

    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(id)

      if (!response.ok) {
        if (response.status === 401) {
          showWeatherError("Invalid API key.")
          return
        }
        if (response.status === 404) {
          showWeatherError("City not found.")
          return
        }
        throw new Error(`Server error (${response.status})`)
      }

      const data = await response.json()
      displayWeather(data)
    } catch (error) {
      clearTimeout(id)
      if (error.name === "AbortError") {
        showWeatherError("Request timed out.", attempt)
      } else {
        showWeatherError("Weather data currently unavailable.", attempt)
      }
    }
  }

  async function fetchWeatherByCoords(lat, lon, attempt = 0) {
    weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>'
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS)

    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(id)

      if (!response.ok) {
        if (response.status === 401) {
          showWeatherError("Invalid API key.")
          return
        }
        throw new Error(`Server error (${response.status})`)
      }

      const data = await response.json()
      displayWeather(data)
    } catch (error) {
      clearTimeout(id)
      if (error.name === "AbortError") {
        showWeatherError("Request timed out.", attempt)
      } else {
        showWeatherError("Weather data currently unavailable.", attempt)
      }
    }
  }

  function showWeatherError(message, attempt = 0) {
    const canRetry = attempt < MAX_RETRIES
    weatherInfo.innerHTML = `
      <p class="error-text">${message}</p>
      ${canRetry ? '<button id="weather-retry-btn" class="retry-btn">Retry</button>' : ""}
    `
    const retryBtn = document.getElementById("weather-retry-btn")
    if (retryBtn)
      retryBtn.addEventListener("click", () => {
        if (navigator.geolocation && !cityInput.value) {
          getLocationWeather()
        } else {
          fetchWeather(cityInput.value.trim(), attempt + 1)
        }
      })
  }

  function displayWeather(data) {
    const { name, main, weather } = data
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`
    weatherInfo.innerHTML = `
      <h3>${name}</h3>
      <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
      <p>Temperature: ${Math.round(main.temp)}°C</p>
      <p>Condition: ${weather[0].main}</p>
    `
  }

  function getLocationWeather() {
    if (!navigator.geolocation) {
      weatherInfo.innerHTML = `<p class="error-text">Geolocation is not supported by your browser.</p>`
      return
    }
    weatherInfo.innerHTML = `<p class="loading-text">Detecting your location...</p>`
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        weatherInfo.innerHTML = `<p class="error-text">Unable to get your location. Please allow location access and try again, or search for a city above.</p>`
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  // --- Weather Search Events ---
  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      fetchWeather(cityInput.value.trim())
    }
  })
  searchWeatherBtn.addEventListener("click", () => {
    fetchWeather(cityInput.value.trim())
  })
  getLocationBtn.addEventListener("click", getLocationWeather)

  // --- Task Events ---
  addTaskBtn.addEventListener("click", addTask)
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask()
  })
  dueDateInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask()
  })
  clearAllBtn.addEventListener("click", clearAllTasks)

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      currentFilter = btn.dataset.filter
      filters.status = currentFilter
      updateURLFromFilters()
      renderTasks()
    })
  })

  if (priorityFilter) {
    priorityFilter.addEventListener("change", () => {
      filters.priority = priorityFilter.value
      updateURLFromFilters()
      renderTasks()
    })
  }
  if (tagsFilter) {
    tagsFilter.addEventListener(
      "input",
      debounce(() => {
        filters.tags = tagsFilter.value
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
        updateURLFromFilters()
        renderTasks()
      }, 300),
    )
  }
  if (dueFromFilter) {
    dueFromFilter.addEventListener("change", () => {
      filters.dueFrom = dueFromFilter.value || null
      updateURLFromFilters()
      renderTasks()
    })
  }
  if (dueToFilter) {
    dueToFilter.addEventListener("change", () => {
      filters.dueTo = dueToFilter.value || null
      updateURLFromFilters()
      renderTasks()
    })
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      filters = { status: "all", priority: "all", tags: [], dueFrom: null, dueTo: null }
      currentFilter = "all"
      syncUIFromFilters()
      updateURLFromFilters()
      renderTasks()
    })
  }

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
      document.body.classList.toggle("dark-theme")
    })
  }

  // --- Sort Button ---
  if (sortTasksBtn) {
    sortTasksBtn.addEventListener("click", () => {
      if (sortState.key === "title") {
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc"
      } else {
        sortState.key = "title"
        sortState.direction = "asc"
      }
      saveSortState()
      updateURLFromFilters()
      renderTasks()
    })
  }

  function readFiltersFromURL() {
    const params = new URLSearchParams(window.location.search)
    filters.status = params.get("status") || "all"
    currentFilter = filters.status

    const p = (params.get("priority") || "all").toLowerCase()
    filters.priority = ["high", "medium", "low"].includes(p) ? p : "all"

    const t = params.get("tags") || ""
    filters.tags = t
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    filters.dueFrom = params.get("dueFrom") || null
    filters.dueTo = params.get("dueTo") || null

    const sort = params.get("sort")
    const dir = params.get("dir")
    if (sort) sortState.key = sort
    if (dir) sortState.direction = dir === "desc" ? "desc" : "asc"
  }

  function updateURLFromFilters() {
    const params = new URLSearchParams()
    if (filters.status !== "all") params.set("status", filters.status)
    if (filters.priority !== "all") params.set("priority", filters.priority)
    if (filters.tags.length > 0) params.set("tags", filters.tags.join(","))
    if (filters.dueFrom) params.set("dueFrom", filters.dueFrom)
    if (filters.dueTo) params.set("dueTo", filters.dueTo)
    if (sortState.key) params.set("sort", sortState.key)
    if (sortState.direction) params.set("dir", sortState.direction)
    const q = params.toString()
    history.replaceState(null, "", q ? `?${q}` : window.location.pathname)
  }

  function syncUIFromFilters() {
    // status buttons
    filterBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === filters.status)
    })

    // priority filter
    if (priorityFilter) priorityFilter.value = filters.priority
    // tags filter
    if (tagsFilter) tagsFilter.value = filters.tags.join(", ")
    // due range
    if (dueFromFilter) dueFromFilter.value = filters.dueFrom || ""
    if (dueToFilter) dueToFilter.value = filters.dueTo || ""
  }

  // --- Task List Actions (Toggle, Delete, Edit) ---
  taskList.addEventListener("click", (e) => {
    const action = e.target.dataset.action
    const li = e.target.closest("li.task-item")
    if (!li) return
    const index = Number(li.dataset.index)

    if (action === "toggle") {
      toggleTaskCompletion(index)
    } else if (action === "delete") {
      deleteTask(index)
    } else if (action === "edit") {
      enableInlineEdit(index, e.target)
    }
  })


  // --- Init ---
  function init() {
    readFiltersFromURL()
    syncUIFromFilters()

    renderTasks()
    if (yearSpan) yearSpan.textContent = new Date().getFullYear()
    getLocationWeather() // Show local weather on page load
  }

  init()
})
