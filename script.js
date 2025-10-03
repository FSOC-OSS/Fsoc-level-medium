document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const exportDataBtn = document.getElementById("export-data-btn");
    const importFileInput = document.getElementById("import-file");
    const backupReminderBtn = document.getElementById("backup-reminder-btn");
    const backupStatus = document.getElementById("backup-status");

    const cityInput = document.getElementById("city-input");
    const searchWeatherBtn = document.getElementById("search-weather-btn");
    const getLocationBtn = document.getElementById("get-location-btn");
    const weatherInfo = document.getElementById("weather-info");
    const themeToggle = document.getElementById("theme-toggle");
    const yearSpan = document.getElementById("year");

    let tasks = [];
    let currentFilter = "all";
    let weatherSearchTimeout = null;

    const weatherApiKey = "YOUR_API_KEY_HERE";
    const DEBOUNCE_DELAY = 500;
    const BACKUP_REMINDER_DAYS = 7;

    function debounce(func, delay) {
        return function (...args) {
            clearTimeout(weatherSearchTimeout);
            weatherSearchTimeout = setTimeout(
                () => func.apply(this, args),
                delay,
            );
        };
    }

    function saveToLocalStorage() {
        const appData = {
            tasks: tasks,
            lastBackup: localStorage.getItem("lastBackup"),
            exportCount: localStorage.getItem("exportCount") || "0",
            version: "1.0",
        };
        localStorage.setItem("tasks", JSON.stringify(tasks));
        localStorage.setItem("appData", JSON.stringify(appData));
    }

    function loadFromLocalStorage() {
        const storedTasks = localStorage.getItem("tasks");
        const storedAppData = localStorage.getItem("appData");

        if (storedTasks) {
            try {
                tasks = JSON.parse(storedTasks);
                if (!Array.isArray(tasks)) tasks = [];
            } catch (e) {
                tasks = [];
            }
        }

        updateBackupStatus();
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

    function exportData() {
        const exportData = {
            tasks: tasks,
            exportDate: new Date().toISOString(),
            version: "1.0",
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t) => t.completed).length,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fsoc-tasks-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        localStorage.setItem("lastBackup", new Date().toISOString());
        const exportCount =
            parseInt(localStorage.getItem("exportCount") || "0") + 1;
        localStorage.setItem("exportCount", exportCount.toString());

        updateBackupStatus();
        showNotification("Data exported successfully!", "success");
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);

                if (!validateImportData(importedData)) {
                    showNotification(
                        "Invalid file format. Please select a valid backup file.",
                        "error",
                    );
                    return;
                }

                const confirmImport = confirm(
                    `Import ${importedData.tasks.length} tasks? This will replace your current ${tasks.length} tasks.`,
                );

                if (confirmImport) {
                    tasks = importedData.tasks;
                    saveToLocalStorage();
                    renderTasks();
                    showNotification(
                        `Successfully imported ${tasks.length} tasks!`,
                        "success",
                    );
                }
            } catch (error) {
                showNotification(
                    "Error reading file. Please check the file format.",
                    "error",
                );
            }
        };
        reader.readAsText(file);
    }

    function updateBackupStatus() {
        const lastBackup = localStorage.getItem("lastBackup");
        if (lastBackup) {
            const backupDate = new Date(lastBackup);
            const daysSince = Math.floor(
                (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSince === 0) {
                backupStatus.textContent = "Last backup: Today";
            } else if (daysSince === 1) {
                backupStatus.textContent = "Last backup: Yesterday";
            } else {
                backupStatus.textContent = `Last backup: ${daysSince} days ago`;
            }

            if (daysSince >= BACKUP_REMINDER_DAYS) {
                backupStatus.style.color = "var(--accent)";
                backupStatus.textContent += " (Backup recommended!)";
            } else {
                backupStatus.style.color = "var(--secondary-color)";
            }
        } else {
            backupStatus.textContent = "Last backup: Never";
            backupStatus.style.color = "var(--accent)";
        }
    }

    function showBackupReminder() {
        const lastBackup = localStorage.getItem("lastBackup");
        const exportCount = localStorage.getItem("exportCount") || "0";

        let message = "Backup Reminder:\n\n";

        if (lastBackup) {
            const backupDate = new Date(lastBackup);
            const daysSince = Math.floor(
                (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            message += `Last backup: ${daysSince} days ago\n`;
        } else {
            message += "No backup found\n";
        }

        message += `Total exports: ${exportCount}\n`;
        message += `Current tasks: ${tasks.length}\n\n`;
        message += "Regular backups help protect your data!";

        alert(message);
    }

    function showNotification(message, type) {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${type === "success" ? "#28a745" : "#dc3545"};
    `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function clearAllData() {
        const confirmClear = confirm(
            `Are you sure you want to clear all ${tasks.length} tasks? This action cannot be undone.`,
        );

        if (confirmClear) {
            tasks = [];
            saveToLocalStorage();
            renderTasks();
            showNotification("All data cleared!", "success");
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
        const incompleteTasks = [];
        const completedTasks = [];

        tasks.forEach((task) => {
            if (task.completed) {
                completedTasks.push(task);
            } else {
                incompleteTasks.push(task);
            }
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
            const taskElement = createTaskElement(task, originalIndex);
            taskList.appendChild(taskElement);
        });

        saveToLocalStorage();
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

        saveToLocalStorage();
        taskInput.value = "";
    }

    function deleteTask(index) {
        const taskElement = taskList.querySelector(`li[data-index='${index}']`);
        if (taskElement) taskElement.remove();

        tasks.splice(index, 1);
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

    function sortTasksAlphabetically() {
        const incompleteTasks = tasks.filter((task) => !task.completed);
        const completedTasks = tasks.filter((task) => task.completed);

        incompleteTasks.sort((a, b) => a.text.localeCompare(b.text));
        completedTasks.sort((a, b) => a.text.localeCompare(b.text));

        tasks = [...incompleteTasks, ...completedTasks];
        renderTasks();
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
            city,
        )}&appid=${weatherApiKey}&units=metric`;

        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`City not found (${response.status})`);
            const data = await response.json();
            displayWeather(data);
        } catch (error) {
            weatherInfo.innerHTML = `<p class="error-text">Weather data unavailable.</p>`;
        }
    }

    async function fetchWeatherByCoords(lat, lon) {
        weatherInfo.innerHTML =
            '<p class="loading-text">Loading weather data...</p>';

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;

        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(
                    `Weather data unavailable (${response.status})`,
                );
            const data = await response.json();
            displayWeather(data);
        } catch (error) {
            weatherInfo.innerHTML = `<p class="error-text">Weather data unavailable.</p>`;
        }
    }

    function getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            weatherInfo.innerHTML = `<p class="error-text">Geolocation is not supported by this browser.</p>`;
            return;
        }

        weatherInfo.innerHTML =
            '<p class="loading-text">Getting your location...</p>';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                let errorMessage = "Unable to get your location. ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "Location access denied.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "Location information unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "Location request timed out.";
                        break;
                    default:
                        errorMessage += "Unknown error occurred.";
                        break;
                }
                weatherInfo.innerHTML = `<p class="error-text">${errorMessage}</p>`;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            },
        );
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

    clearAllBtn.addEventListener("click", clearAllData);

    const sortTasksBtn = document.getElementById("sort-tasks-btn");
    if (sortTasksBtn) {
        sortTasksBtn.addEventListener("click", sortTasksAlphabetically);
    }

    exportDataBtn.addEventListener("click", exportData);

    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
            e.target.value = "";
        }
    });

    backupReminderBtn.addEventListener("click", showBackupReminder);

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    if (cityInput) {
        cityInput.addEventListener("input", () =>
            debouncedFetchWeather(cityInput.value.trim()),
        );
    }

    if (searchWeatherBtn) {
        searchWeatherBtn.addEventListener("click", () => {
            clearTimeout(weatherSearchTimeout);
            fetchWeather(cityInput.value.trim());
        });
    }

    if (getLocationBtn) {
        getLocationBtn.addEventListener("click", getCurrentLocationWeather);
    }

    if (cityInput) {
        cityInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                clearTimeout(weatherSearchTimeout);
                fetchWeather(cityInput.value.trim());
            }
        });
    }

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
        loadFromLocalStorage();
        renderTasks();
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        fetchWeather("London");

        const style = document.createElement("style");
        style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
        document.head.appendChild(style);
    }

    init();
});
