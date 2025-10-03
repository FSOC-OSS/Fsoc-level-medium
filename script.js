document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const exportDataBtn = document.getElementById("export-data-btn");
    const importDataBtn = document.getElementById("import-data-btn");
    const importFileInput = document.getElementById("import-file-input");

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
    const WEATHER_TIMEOUT_MS = 8000;
    const MAX_RETRIES = 2;
    const BACKUP_REMINDER_DAYS = 7;

    // --- Utility Functions ---
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
        localStorage.setItem("lastSave", Date.now().toString());
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
        let incompleteTasks = [];
        let completedTasks = [];
        tasks.forEach((task) => {
            if (task.completed) completedTasks.push(task);
            else incompleteTasks.push(task);
        });
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
            empty.textContent =
                "No tasks here. Add a new one or change your filter!";
            taskList.appendChild(empty);
            return;
        }

        function addTask() {
            const text = taskInput.value.trim();
            // Removing the White Spaces around the text (excluding the middle one)
            if (text) {
                tasks.push({ text: text, completed: false });
                // Checking if text is not Clear String.
                renderTasks();
                taskInput.value = "";
            }
        }
        filteredTasks.forEach((task) => {
            const originalIndex = tasks.findIndex((t) => t === task);
            taskList.appendChild(createTaskElement(task, originalIndex));
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
            taskList.appendChild(createTaskElement(newTask, tasks.length - 1));
        }

        saveTasks();
        taskInput.value = "";
        renderTasks();
    }

    function exportData() {
        const data = {
            tasks: tasks,
            exportDate: new Date().toISOString(),
            version: "1.0",
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fsoc-tasks-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem("lastBackup", Date.now().toString());
    }

    function importData() {
        importFileInput.click();
    }

    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (validateImportData(data)) {
                    tasks = data.tasks || [];
                    saveTasks();
                    renderTasks();
                } else {
                    alert("Invalid file format");
                }
            } catch {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    }

    function validateImportData(data) {
        if (!data || typeof data !== "object") return false;
        if (!Array.isArray(data.tasks)) return false;
        return data.tasks.every(
            (task) =>
                task &&
                typeof task === "object" &&
                typeof task.text === "string" &&
                typeof task.completed === "boolean",
        );
    }

    function checkBackupReminder() {
        const lastBackup = localStorage.getItem("lastBackup");
        const lastSave = localStorage.getItem("lastSave");

        if (!lastBackup && lastSave) {
            const daysSinceLastSave =
                (Date.now() - parseInt(lastSave)) / (1000 * 60 * 60 * 24);
            if (daysSinceLastSave >= BACKUP_REMINDER_DAYS && tasks.length > 0) {
                if (
                    confirm(
                        "You haven't backed up your data in a while. Would you like to export it now?",
                    )
                ) {
                    exportData();
                }
            }
        } else if (lastBackup) {
            const daysSinceBackup =
                (Date.now() - parseInt(lastBackup)) / (1000 * 60 * 60 * 24);
            if (daysSinceBackup >= BACKUP_REMINDER_DAYS && tasks.length > 0) {
                if (
                    confirm(
                        "It's been a while since your last backup. Would you like to export your data?",
                    )
                ) {
                    exportData();
                }
            }
        }
    }

    function deleteTask(index) {
        const taskElement = taskList.querySelector(`li[data-index='${index}']`);
        if (taskElement) taskElement.remove();

        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    function clearAllTasks() {
        if (
            confirm(
                "Are you sure you want to clear all tasks? This action cannot be undone.",
            )
        ) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    }

    function toggleTaskCompletion(index) {
        tasks[index].completed = !tasks[index].completed;
        const taskElement = taskList.querySelector(`li[data-index='${index}']`);
        if (taskElement) {
            const taskText = taskElement.querySelector("span");
            taskText.classList.toggle("completed", tasks[index].completed);

            if (
                (currentFilter === "active" && tasks[index].completed) ||
                (currentFilter === "completed" && !tasks[index].completed)
            ) {
                taskElement.remove();
                if (taskList.children.length === 0) renderTasks();
            }
        }
        saveTasks();
        renderTasks();
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

    // --- Weather Functions ---
    async function fetchWeather(city, attempt = 0) {
        if (!city) {
            weatherInfo.innerHTML =
                '<p class="loading-text">Enter a city to see the weather...</p>';
            return;
        }

        weatherInfo.innerHTML =
            '<p class="loading-text">Loading weather data...</p>';

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            city,
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
                showWeatherError(
                    "Weather data currently unavailable.",
                    attempt,
                );
            }
        }
    }

    function showWeatherError(message, attempt = 0) {
        const canRetry = attempt < MAX_RETRIES;
        weatherInfo.innerHTML = `
      <p class="error-text">${message}</p>
      ${canRetry ? '<button id="weather-retry-btn" class="retry-btn">Retry</button>' : ""}
    `;
        const retryBtn = document.getElementById("weather-retry-btn");
        if (retryBtn)
            retryBtn.addEventListener("click", () => {
                fetchWeather(cityInput.value.trim(), attempt + 1);
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

    const debouncedFetchWeather = debounce(fetchWeather, DEBOUNCE_DELAY);

    // --- Event Listeners ---
    taskList.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        const li = e.target.closest(".task-item");
        if (!li) return;
        const index = parseInt(li.dataset.index, 10);
        if (action === "delete") deleteTask(index);
    });

    taskList.addEventListener("change", (e) => {
        if (
            e.target.dataset.action === "toggle" &&
            e.target.type === "checkbox"
        ) {
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

    addTaskBtn.addEventListener("click", addTask);
    taskInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addTask();
    });

    clearAllBtn.addEventListener("click", clearAllTasks);
    exportDataBtn.addEventListener("click", exportData);
    importDataBtn.addEventListener("click", importData);
    importFileInput.addEventListener("change", handleFileImport);

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    cityInput.addEventListener("input", () =>
        debouncedFetchWeather(cityInput.value.trim()),
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

    themeToggle.addEventListener("click", () =>
        document.body.classList.toggle("dark-theme"),
    );

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
        setTimeout(checkBackupReminder, 2000);
    }

    init();
});
