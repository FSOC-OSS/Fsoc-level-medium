document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const weatherInfo = document.getElementById("weather-info");
    const themeToggle = document.getElementById("theme-toggle");
    const yearSpan = document.getElementById("year");

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    let currentFilter = "all";
    let weatherSearchTimeout = null;
    let lastBackupReminder = localStorage.getItem("lastBackupReminder") || 0;

    const weatherApiKey = "YOUR_API_KEY_HERE";
    const DEBOUNCE_DELAY = 500;
    const WEATHER_TIMEOUT_MS = 8000;
    const MAX_RETRIES = 2;

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
        checkBackupReminder();
    }

    function exportData() {
        const data = {
            tasks: tasks,
            exportDate: new Date().toISOString(),
            version: "1.0",
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `fsoc-tasks-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        localStorage.setItem("lastBackupReminder", Date.now());
    }

    function importData(event) {
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
                    alert("Data imported successfully!");
                } else {
                    alert("Invalid file format");
                }
            } catch (error) {
                alert("Error reading file");
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
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (tasks.length > 0 && now - lastBackupReminder > sevenDays) {
            setTimeout(() => {
                if (
                    confirm(
                        "It's been a while since your last backup. Would you like to export your data?",
                    )
                ) {
                    exportData();
                } else {
                    localStorage.setItem("lastBackupReminder", now);
                }
            }, 1000);
        }
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

    function deleteTask(index) {
        const taskElement = taskList.querySelector(`li[data-index='${index}']`);
        if (taskElement) taskElement.remove();

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

    async function fetchWeather(city, attempt = 0) {
        if (!city) {
            weatherInfo.innerHTML =
                '<p class="loading-text">Enter a city to see the weather...</p>';
            return;
        }

        weatherInfo.innerHTML =
            '<p class="loading-text">Loading weather data...</p>';

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

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
        if (retryBtn) {
            retryBtn.addEventListener("click", () => {
                fetchWeather("London", attempt + 1);
            });
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

    async function fetchWeatherByCoords(lat, lon, attempt = 0) {
        weatherInfo.innerHTML =
            '<p class="loading-text">Loading weather data...</p>';
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
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

    document.getElementById("sort-tasks-btn").addEventListener("click", () => {
        tasks.sort((a, b) => a.text.localeCompare(b.text));
        saveTasks();
        renderTasks();
    });

    document
        .getElementById("export-data-btn")
        .addEventListener("click", exportData);
    document.getElementById("import-data-btn").addEventListener("click", () => {
        document.getElementById("import-file").click();
    });
    document
        .getElementById("import-file")
        .addEventListener("change", importData);

    document
        .getElementById("get-location-btn")
        .addEventListener("click", () => {
            if (navigator.geolocation) {
                weatherInfo.innerHTML =
                    '<p class="loading-text">Getting your location...</p>';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        fetchWeatherByCoords(latitude, longitude);
                    },
                    () => {
                        showWeatherError("Location access denied");
                    },
                );
            } else {
                showWeatherError("Geolocation not supported");
            }
        });

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
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
        checkBackupReminder();
    }

    init();
});
