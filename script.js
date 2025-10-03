document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const sortColumns = document.querySelectorAll(".sort-column");
  const sortTasksBtn = document.getElementById("sort-tasks-btn");

  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const yearSpan = document.getElementById("year");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let weatherSearchTimeout = null;
  let currentSort = { column: null, ascending: true };

  const weatherApiKey = "YOUR_API_KEY_HERE";
  const DEBOUNCE_DELAY = 500;
  const WEATHER_TIMEOUT_MS = 8000;
  const MAX_RETRIES = 2;

  // --- Utility Functions ---
  function debounce(func, delay) {
    return function (...args) {
      clearTimeout(weatherSearchTimeout);
      weatherSearchTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Sort state setter — does not mutate tasks array, only sets currentSort and re-renders
  function sortTasks(column) {
    if (column === "none") {
      currentSort.column = null;
      currentSort.ascending = true;
      updateSortIndicators();
      renderTasks();
      return;
    }

    if (currentSort.column === column) {
      currentSort.ascending = !currentSort.ascending;
    } else {
      currentSort.column = column;
      currentSort.ascending = true;
    }

    updateSortIndicators();
    renderTasks();
  }

  // Update arrows/active classes on sort columns
  function updateSortIndicators() {
    sortColumns.forEach((col) => {
      const arrow = col.querySelector(".sort-arrow");
      if (col.dataset.sort === currentSort.column) {
        col.classList.add("active");
        if (arrow) arrow.textContent = currentSort.ascending ? "▼" : "▲";
      } else {
        col.classList.remove("active");
        if (arrow) arrow.textContent = "";
      }
    });
  }

  function createTaskElement(task, index) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.index = index;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";

    const taskText = document.createElement("span");
    taskText.textContent = task.text;
    if (task.completed) taskText.classList.add("completed");
    taskText.dataset.action = "edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.dataset.action = "delete";

    li.appendChild(checkbox);
    li.appendChild(taskText);
    li.appendChild(deleteBtn);
    return li;
  }

  function renderTasks() {
    if (!taskList) return;

    const incompleteCount = tasks.filter((t) => !t.completed).length;
    const completedCount = tasks.filter((t) => t.completed).length;

    const activeCounter = document.querySelector("#filter-active");
    const completedCounter = document.querySelector("#filter-completed");
    if (activeCounter) activeCounter.innerHTML = `Active [${incompleteCount}]`;
    if (completedCounter) completedCounter.innerHTML = `Completed [${completedCount}]`;

    let displayedTasks = [...tasks];

    if (currentSort.column) {
      displayedTasks.sort((a, b) => {
        let compareA, compareB;
        if (currentSort.column === "title") {
          compareA = a.text.toLowerCase();
          compareB = b.text.toLowerCase();
        } else if (currentSort.column === "status") {
          compareA = a.completed ? 1 : 0;
          compareB = b.completed ? 1 : 0;
        } else {
          return 0;
        }

        if (compareA < compareB) return currentSort.ascending ? -1 : 1;
        if (compareA > compareB) return currentSort.ascending ? 1 : -1;
        return 0;
      });
    } else {
      displayedTasks = [
        ...tasks.filter((t) => !t.completed),
        ...tasks.filter((t) => t.completed),
      ];
    }

    // Apply filter to displayed list
    const filteredTasks = displayedTasks.filter((task) => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      return true;
    });

    taskList.innerHTML = "";

    if (filteredTasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-empty-state";
      empty.setAttribute("aria-live", "polite");
      empty.textContent = "No tasks here. Add a new one or change your filter!";
      taskList.appendChild(empty);
      return;
    }

    // Append tasks — compute the original index relative to the stored tasks array
    filteredTasks.forEach((task) => {
      const originalIndex = tasks.indexOf(task);
      taskList.appendChild(createTaskElement(task, originalIndex));
    });
  }

  function addTask() {
    if (!taskInput) return;
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = { text, completed: false };
    tasks.push(newTask);
    saveTasks();
    taskInput.value = "";
    renderTasks();
  }

  function deleteTask(index) {
    if (typeof index !== "number" || index < 0 || index >= tasks.length) return;
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }

  function clearAllTasks() {
    tasks = [];
    saveTasks();
    renderTasks();
  }

  function toggleTaskCompletion(index) {
    if (typeof index !== "number" || !tasks[index]) return;
    tasks[index].completed = !tasks[index].completed;
    saveTasks();
    renderTasks();
  }

  function enableInlineEdit(index, spanEl) {
    if (!tasks[index]) return;
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

  // --- Weather Functions ---
  async function fetchWeather(city, attempt = 0) {
    if (!city) {
      if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Enter a city to see the weather...</p>';
      return;
    }

    if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${weatherApiKey}&units=metric`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) {
        if (response.status === 401) {
          showWeatherError("Invalid API key.");
          return;
        }
        if (response.status === 404) {
          showWeatherError("City not found.");
          return;
        }
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        showWeatherError("Request timed out.", attempt);
      } else {
        showWeatherError("Weather data currently unavailable.", attempt);
      }
    }
  }

  function showWeatherError(message, attempt = 0) {
    const canRetry = attempt < MAX_RETRIES;
    if (!weatherInfo) return;
    weatherInfo.innerHTML = `
      <p class="error-text">${message}</p>
      ${canRetry ? '<button id="weather-retry-btn" class="retry-btn">Retry</button>' : ""}
    `;
    const retryBtn = document.getElementById("weather-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", () => {
      const city = cityInput ? cityInput.value.trim() : "";
      fetchWeather(city, attempt + 1);
    });
  }

  function displayWeather(data) {
    if (!weatherInfo) return;
    const { name, main, weather } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
      <h3>${name}</h3>
      <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
      <p>Temperature: ${Math.round(main.temp)}°C</p>
      <p>Condition: ${weather[0].main}</p>
    `;
  }

  const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

  // --- Event Listeners (attach only when elements exist) ---
  if (taskList) {
    taskList.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      const li = e.target.closest(".task-item");
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      if (action === "delete") deleteTask(index);
    });

    taskList.addEventListener("change", (e) => {
      if (e.target.dataset.action === "toggle" && e.target.type === "checkbox") {
        const li = e.target.closest(".task-item");
        if (!li) return;
        toggleTaskCompletion(parseInt(li.dataset.index, 10));
      }
    });

    taskList.addEventListener("dblclick", (e) => {
      if (e.target.dataset.action === "edit" && e.target.tagName === "SPAN") {
        const li = e.target.closest(".task-item");
        if (!li) return;
        enableInlineEdit(parseInt(li.dataset.index, 10), e.target);
      }
    });
  }

  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  if (taskInput) {
    taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTask();
    });
  }

  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllTasks);

  if (filterBtns && filterBtns.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderTasks();
      });
    });
  }

  if (sortColumns && sortColumns.length) {
    sortColumns.forEach((col) => {
      col.addEventListener("click", () => {
        sortTasks(col.dataset.sort);
      });
    });
  }

  if (sortTasksBtn) {
    sortTasksBtn.addEventListener("click", () => {
      sortTasks("title");
    });
  }

  if (cityInput) {
    cityInput.addEventListener("input", () => debouncedFetchWeather(cityInput.value.trim()));
    cityInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(weatherSearchTimeout);
        fetchWeather(cityInput.value.trim());
      }
    });
  }

  if (searchWeatherBtn) {
    searchWeatherBtn.addEventListener("click", () => {
      clearTimeout(weatherSearchTimeout);
      const city = cityInput ? cityInput.value.trim() : "";
      fetchWeather(city);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => document.body.classList.toggle("dark-theme"));
  }

  const navLinks = document.querySelectorAll(".nav-link");
  if (navLinks && navLinks.length) {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        navLinks.forEach((l) => l.classList.remove("active"));
        e.currentTarget.classList.add("active");
      });
    });
  }

  function init() {
    renderTasks();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    fetchWeather("London");
  }

  init();
});