document.addEventListener("DOMContentLoaded", () => {
    // --- Block A: Element Hooks ---
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const cityInput = document.getElementById("city-input");
    const searchWeatherBtn = document.getElementById("search-weather-btn");
    const weatherInfo = document.getElementById("weather-info");
    const themeToggle = document.getElementById("theme-toggle");
    const yearSpan = document.getElementById("year");

    // --- Block B: Data Store ---
    let tasks = [];
    let weatherSearchTimeout = null;

    // --- Block C: Service Configuration ---
    const weatherApiKey = "YOUR_API_KEY_HERE";
    const DEBOUNCE_DELAY = 500; // 500ms delay

    // --- Block D: Utility Functions ---
    function debounce(func, delay) {
        return function (...args) {
            clearTimeout(weatherSearchTimeout);
            weatherSearchTimeout = setTimeout(
                () => func.apply(this, args),
                delay,
            );
        };
    }

    function saveTasks() {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }

    function loadTasks() {
        const savedTasks = localStorage.getItem("tasks");
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
    }

    // --- Block E: Module 1 Functions (Task Management) ---
    function renderTasks() {
        taskList.innerHTML = "";

        if (tasks.length === 0) {
            const empty = document.createElement("li");
            empty.className = "task-empty-state";
            empty.setAttribute("aria-live", "polite");
            empty.textContent = "No tasks yet — add one above to get started.";
            taskList.appendChild(empty);
            return;
        }

        tasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = "task-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.completed;
            checkbox.addEventListener("change", () =>
                toggleTaskCompletion(index),
            );

            const taskText = document.createElement("span");
            taskText.textContent = task.text;
            if (task.completed) {
                taskText.classList.add("completed");
            }

            taskText.addEventListener("dblclick", () =>
                enableInlineEdit(index, taskText),
            );

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = "🗑️";
            deleteBtn.addEventListener("click", () => deleteTask(index));

            li.appendChild(checkbox);
            li.appendChild(taskText);
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text: text, completed: false });
            saveTasks();
            renderTasks();
            taskInput.value = "";
        }
    }

    function deleteTask(index) {
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
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
    }

    function enableInlineEdit(index, spanEl) {
        const originalText = tasks[index].text;
        const input = document.createElement("input");
        input.type = "text";
        input.value = originalText;
        input.className = "task-edit-input";
        input.setAttribute("aria-label", "Edit task");

        // Keep layout stable
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

    // --- Block F: Module 2 Functions (Weather) ---
    async function fetchWeather(city) {
        if (!city || city.trim() === "") {
            weatherInfo.innerHTML =
                '<p class="loading-text">Enter a city name to see the weather...</p>';
            return;
        }

        // Show loading state
        weatherInfo.innerHTML =
            '<p class="loading-text">Loading weather data...</p>';

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }
            const data = await response.json();
            displayWeather(data);
        } catch (error) {
            console.error("Weather service call failed:", error);
            weatherInfo.innerHTML =
                '<p class="error-text">Weather data unavailable. Please check the city name and try again.</p>';
        }
    }

    function displayWeather(data) {
        const { name, main, weather } = data;
        const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        weatherInfo.innerHTML = `
            <h3>${name}</h3>
            <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
            <p>Temperature: ${Math.round(main.temp)}°C</p>
            <p>Condition: ${weather[0].main}</p>
            <p>Description: ${weather[0].description}</p>
        `;
    }

    // Create debounced version of fetchWeather
    const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

    function handleWeatherSearch() {
        const city = cityInput.value.trim();
        debouncedFetchWeather(city);
    }

    // --- Block G: Event Registry ---
    // Task management events
    addTaskBtn.addEventListener("click", addTask);
    clearAllBtn.addEventListener("click", clearAllTasks);

    taskInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            addTask();
        }
    });

    // Weather search events with debouncing
    cityInput.addEventListener("input", handleWeatherSearch);
    searchWeatherBtn.addEventListener("click", () => {
        // Clear any pending debounced calls and search immediately
        clearTimeout(weatherSearchTimeout);
        const city = cityInput.value.trim();
        fetchWeather(city);
    });

    // Allow Enter key to trigger immediate search
    cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(weatherSearchTimeout);
            const city = cityInput.value.trim();
            fetchWeather(city);
        }
    });

    // Theme toggle
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
    });

    // Navigation links
    const navLinks = Array.from(document.querySelectorAll(".nav-link"));
    navLinks.forEach((navLink) => {
        navLink.addEventListener("click", (e) => {
            navLinks.forEach((allNavLinks) => {
                allNavLinks.classList.remove("active");
            });
            e.target.classList.add("active");
        });
    });

    // Adding Task With Enter
    taskInput.addEventListener("keypress", (e) => {
        if (e.key == "Enter") {
            addTask();
        }
    });

    // --- Block H: Application Entry Point ---
    function init() {
        loadTasks();
        renderTasks();
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    init();
});
document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const filterBtns = document.querySelectorAll(".filter-btn");

  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const yearSpan = document.getElementById("year");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentFilter = "all";
  let weatherSearchTimeout = null;

  const weatherApiKey = "YOUR_API_KEY_HERE";
  const DEBOUNCE_DELAY = 500;

  function debounce(func, delay) {
    return function (...args) {
      clearTimeout(weatherSearchTimeout);
      weatherSearchTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
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
      empty.textContent = "No tasks here. Add a new one or change your filter!";
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
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = { text, completed: false };
    tasks.push(newTask);

    if (currentFilter === "all" || currentFilter === "active") {
      const emptyState = taskList.querySelector(".task-empty-state");
      if (emptyState) emptyState.remove();

      const newIndex = tasks.length - 1;
      const taskElement = createTaskElement(newTask, newIndex);
      taskList.appendChild(taskElement);
    }

    saveTasks();
    taskInput.value = "";
  }

  function deleteTask(index) {
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);
    if (taskElement) taskElement.remove();

    tasks.splice(index, 1);
    renderTasks();
    saveTasks();
  }

  function clearAllTasks() {
    tasks = [];
    saveTasks();
    renderTasks();
  }

  function toggleTaskCompletion(index) {
    tasks[index].completed = !tasks[index].completed;
    const taskElement = taskList.querySelector(`li[data-index='${index}']`);

    if (taskElement) {
      if (
        (currentFilter === "active" && tasks[index].completed) ||
        (currentFilter === "completed" && !tasks[index].completed)
      ) {
        taskElement.remove();
        if (taskList.children.length === 0) renderTasks();
      } else {
        const taskText = taskElement.querySelector("span");
        taskText.classList.toggle("completed", tasks[index].completed);
      }
    }
    saveTasks();
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

  async function fetchWeather(city) {
    if (!city) {
      weatherInfo.innerHTML =
        '<p class="loading-text">Enter a city to see the weather...</p>';
      return;
    }
    weatherInfo.innerHTML =
      '<p class="loading-text">Loading weather data...</p>';

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${weatherApiKey}&units=metric`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`City not found (${response.status})`);
      const data = await response.json();
      displayWeather(data);
    } catch (error) {
      weatherInfo.innerHTML = `<p class="error-text">Weather data unavailable.</p>`;
    }
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

  const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

  taskList.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    const li = e.target.closest(".task-item");
    if (!li) return;
    const index = parseInt(li.dataset.index, 10);
    if (action === "delete") deleteTask(index);
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

  addTaskBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keydown", (e) => {
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

  cityInput.addEventListener("input", () =>
    debouncedFetchWeather(cityInput.value.trim())
  );
  searchWeatherBtn.addEventListener("click", () => {
    clearTimeout(weatherSearchTimeout);
    fetchWeather(cityInput.value.trim());
  });
  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(weatherSearchTimeout);
      fetchWeather(cityInput.value.trim());
    }
  });

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
  });

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      navLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });
  });

  function init() {
    renderTasks();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    fetchWeather("London");
  }

  init();
});
