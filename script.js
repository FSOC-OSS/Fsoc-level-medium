// script.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Block A: Element Hooks ---
  const taskInput = document.getElementById("task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const sortTasksBtn = document.getElementById("sort-tasks-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");

  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const getLocationBtn = document.getElementById("get-location-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const yearSpan = document.getElementById("year");

  // --- Block B: Data Store ---
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let weatherSearchTimeout = null;

  // --- Block C: Service Configuration ---
  const weatherApiKey = "YOUR_API_KEY_HERE"; // <-- replace with your OpenWeatherMap API key
  const DEBOUNCE_DELAY = 500;

  // --- Block D: Utilities ---
  function debounce(func, delay) {
    return function (...args) {
      clearTimeout(weatherSearchTimeout);
      weatherSearchTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function saveTasks() {
    try {
      localStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks:", e);
    }
  }

  // --- Block E: Task Management ---
  function createTaskElement(task, index) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.dataset.index = index;

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "0.6rem";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";

    const taskText = document.createElement("span");
    taskText.textContent = task.text;
    taskText.dataset.action = "edit";
    if (task.completed) taskText.classList.add("completed");

    left.appendChild(checkbox);
    left.appendChild(taskText);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "🗑️";
    deleteBtn.dataset.action = "delete";

    li.appendChild(left);
    li.appendChild(deleteBtn);
    return li;
  }

  function renderTasks() {
    // keep stable order: incomplete first then completed (as some parts of your code expected)
    const incompleteTasks = [];
    const completedTasks = [];
    tasks.forEach((t) => (t.completed ? completedTasks.push(t) : incompleteTasks.push(t)));
    tasks = [...incompleteTasks, ...completedTasks];

    taskList.innerHTML = "";

    const filteredTasks = tasks.filter((task) => {
      if (currentFilter === "active") return !task.completed;
      if (currentFilter === "completed") return task.completed;
      return true;
    });

    if (filteredTasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "task-empty-state";
      empty.setAttribute("aria-live", "polite");

      let msg = "No tasks yet — add one above to get started.";
      if (currentFilter === "active") msg = "No active tasks — time to add some goals!";
      if (currentFilter === "completed") msg = "No completed tasks yet — get started!";

      empty.textContent = msg;
      taskList.appendChild(empty);
      return;
    }

    filteredTasks.forEach((task) => {
      const originalIndex = tasks.findIndex((t) => t === task);
      const taskElement = createTaskElement(task, originalIndex);
      taskList.appendChild(taskElement);
    });
  }

  function addTask() {
    const text = taskInput?.value?.trim();
    if (!text) return;
    const newTask = { text, completed: false };
    tasks.push(newTask);
    saveTasks();

    // quick append if visible under current filter
    if (currentFilter === "all" || currentFilter === "active") {
      const emptyState = taskList.querySelector(".task-empty-state");
      if (emptyState) emptyState.remove();
      const newIndex = tasks.length - 1;
      const taskElement = createTaskElement(newTask, newIndex);
      taskList.appendChild(taskElement);
    }

    if (taskInput) taskInput.value = "";
  }

  function deleteTask(index) {
    // remove from DOM if shown
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);
    if (taskElement) taskElement.remove();

    tasks.splice(index, 1);
    saveTasks();
    // re-render to fix indexes and empty-state
    renderTasks();
  }

  function clearAllTasks() {
    tasks = [];
    saveTasks();
    renderTasks();
  }

  function sortTasksAlphabetically() {
    tasks.sort((a, b) => a.text.localeCompare(b.text));
    saveTasks();
    renderTasks();
  }

  function toggleTaskCompletion(index) {
    if (typeof tasks[index] === "undefined") return;
    tasks[index].completed = !tasks[index].completed;
    saveTasks();

    // Update UI: if task exists in DOM update, else re-render
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);
    if (taskElement) {
      const taskText = taskElement.querySelector("span");
      if (taskText) taskText.classList.toggle("completed", tasks[index].completed);

      // hide if filter excludes it now
      if ((currentFilter === "active" && tasks[index].completed) || (currentFilter === "completed" && !tasks[index].completed)) {
        taskElement.remove();
        if (taskList.children.length === 0) renderTasks();
        return;
      }
      const checkbox = taskElement.querySelector("input[type='checkbox']");
      if (checkbox) checkbox.checked = tasks[index].completed;
    }
    // Ensure indexes and rendering stay consistent
    renderTasks();
  }

  function enableInlineEdit(index, spanEl) {
    if (!spanEl) return;
    if (spanEl.parentElement.querySelector(".task-edit-input")) return;

    const originalText = tasks[index].text;
    const input = document.createElement("input");
    input.type = "text";
    input.value = originalText;
    input.className = "task-edit-input";
    input.setAttribute("aria-label", "Edit task");
    input.style.flex = "1 1 auto";
    input.style.padding = "0.25rem 0.5rem";
    input.style.fontSize = "1rem";

    spanEl.replaceWith(input);
    input.focus();
    input.setSelectionRange(0, input.value.length);

    const commit = () => {
      const newText = input.value.trim();
      tasks[index].text = newText || originalText;
      saveTasks();
      renderTasks();
    };
    const cancel = () => {
      renderTasks();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cancel();
    });
    input.addEventListener("blur", commit);
  }

  function setFilter(filterType) {
    currentFilter = filterType;
    filterBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.filter === filterType));
    renderTasks();
  }

  // --- Block F: Weather ---
  async function fetchWeather(city) {
    if (!city || city.trim() === "") {
      if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Enter a city name to see the weather...</p>';
      return;
    }
    if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      console.error("Weather service call failed:", error);
      if (weatherInfo) weatherInfo.innerHTML = '<p class="error-text">Click "Get My Location Weather" to see your local weather...</p>';
    }
  }

  async function fetchWeatherByCoords(lat, lon) {
    if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      console.error("Weather service call failed:", error);
      if (weatherInfo) weatherInfo.innerHTML = '<p class="error-text">Failed to load weather data. Please try again.</p>';
    }
  }

  function displayWeather(data) {
    if (!weatherInfo) return;
    const { name, main, weather, sys } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
      <h3>${name}${sys && sys.country ? ', ' + sys.country : ''}</h3>
      <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
      <p>Temperature: ${Math.round(main.temp)}°C</p>
      <p>Feels like: ${Math.round(main.feels_like)}°C</p>
      <p>Condition: ${weather[0].main}</p>
      <p>Description: ${weather[0].description}</p>
      <p>Humidity: ${main.humidity}%</p>
    `;
  }

  function getUserLocationWeather() {
    if (!navigator.geolocation) {
      if (weatherInfo) weatherInfo.innerHTML = '<p class="error-text">Geolocation is not supported by your browser.</p>';
      return;
    }
    if (weatherInfo) weatherInfo.innerHTML = '<p class="loading-text">Getting your location...</p>';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon);
      },
      (error) => {
        handleLocationError(error);
      }
    );
  }

  function handleLocationError(error) {
    if (!weatherInfo) return;
    let errorMessage = "";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied. Please allow location access and try again.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information unavailable. Please try again.";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out. Please try again.";
        break;
      default:
        errorMessage = "An error occurred. Please try again.";
    }
    weatherInfo.innerHTML = `<p class="error-text">${errorMessage}</p>`;
  }

  const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

  // --- Block G: Event Delegation / Listeners ---
  // Task clicks (delete / edit / toggle via delegation)
  taskList.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    const li = e.target.closest(".task-item");
    if (!li) return;

    const index = parseInt(li.dataset.index, 10);
    if (action === "delete") {
      deleteTask(index);
    }
  });

  taskList.addEventListener("change", (e) => {
    const action = e.target.dataset.action;
    if (action === "toggle" && e.target.type === "checkbox") {
      const li = e.target.closest(".task-item");
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      toggleTaskCompletion(index);
    }
  });

  taskList.addEventListener("dblclick", (e) => {
    const action = e.target.dataset.action;
    if (action === "edit" && e.target.tagName === "SPAN") {
      const li = e.target.closest(".task-item");
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      enableInlineEdit(index, e.target);
    }
  });

  // Direct UI buttons
  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  if (taskInput) {
    taskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTask();
    });
  }
  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllTasks);
  if (sortTasksBtn) sortTasksBtn.addEventListener("click", sortTasksAlphabetically);

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

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
      fetchWeather(cityInput?.value?.trim() || "");
    });
  }

  if (getLocationBtn) {
    getLocationBtn.addEventListener("click", () => {
      getUserLocationWeather();
    });
  }

  // Navigation links active state
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      navLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });
  });

  // --- Theme handler (inside DOMContentLoaded so element exists) ---
  (function initTheme() {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark") document.body.classList.add("dark-theme");

      if (themeToggle) {
        // display small icon to indicate state
        const sun = '☀️';
        const moon = '🌙';
        const updateLabel = (isDark) => {
          themeToggle.textContent = isDark ? sun + ' Light' : moon + ' Dark';
          themeToggle.setAttribute('aria-pressed', isDark);
        };

        const isDarkNow = document.body.classList.contains('dark-theme');
        updateLabel(isDarkNow);

        themeToggle.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark-theme');
          try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
          updateLabel(isDark);
        });
      }
    } catch (e) {
      console.error("theme handler init failed", e);
    }
  })();

  // --- Entry point ---
  function init() {
    renderTasks();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    // Show default city on load (you can change or remove)
    fetchWeather("London");
  }

  init();
}); // end DOMContentLoaded
