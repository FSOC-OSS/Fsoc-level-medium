document.addEventListener("DOMContentLoaded", () => {
    // --- Task Manager Setup ---
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const sortTasksBtn = document.getElementById("sort-tasks-btn");
    const exportDataBtn = document.getElementById("export-data-btn");
    const importDataBtn = document.getElementById("import-data-btn");
    const importFileInput = document.getElementById("import-file-input");

    // --- Weather Widget Setup ---
    const cityInput = document.getElementById("city-input");
    const searchWeatherBtn = document.getElementById("search-weather-btn");
    const getLocationBtn = document.getElementById("get-location-btn");
    const weatherInfo = document.getElementById("weather-info");
    const themeToggle = document.getElementById("theme-toggle");
    const yearSpan = document.getElementById("year");

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    let currentFilter = "all";
    let weatherSearchTimeout = null;

    const weatherApiKey = "4b1ee5452a2e3f68205153f28bf93927";
    const DEBOUNCE_DELAY = 500;
    const WEATHER_TIMEOUT_MS = 8000;
    const MAX_RETRIES = 100;

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
        tasks.forEach((task, index) => {
            if (task.completed) completedTasks.push(task);
            else incompleteTasks.push(task);
        });
        tasks = [...incompleteTasks, ...completedTasks];

        taskList.innerHTML = "";
        // Check if filter buttons exist before updating their text
        const filterActiveBtn = document.querySelector("#filter-active");
        const filterCompletedBtn = document.querySelector("#filter-completed");
        if (filterActiveBtn)
            filterActiveBtn.innerHTML = `Active [${incompleteTasks.length}]`;
        if (filterCompletedBtn)
            filterCompletedBtn.innerHTML = `Completed [${completedTasks.length}]`;

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
        saveTasks();
        taskInput.value = "";
        renderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    function clearAllTasks() {
        clearAllData();
    }

    function toggleTaskCompletion(index) {
        tasks[index].completed = !tasks[index].completed;
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

    function sortTasks() {
        tasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed - b.completed;
            }
            return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
        });
        saveTasks();
        renderTasks();
        toast.success("Tasks sorted alphabetically!");

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

    function showWeatherError(message, attempt = 0) {
        const canRetry = attempt < MAX_RETRIES;
        weatherInfo.innerHTML = `
      <p class="error-text">${message}</p>
      ${canRetry ? '<button id="weather-retry-btn" class="retry-btn">Retry</button>' : ""}
    `;
        const retryBtn = document.getElementById("weather-retry-btn");
        if (retryBtn)
            retryBtn.addEventListener("click", () => {
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
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    }

    // --- Weather Search Events ---
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
    taskInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addTask();
    });
    sortTasksBtn.addEventListener("click", sortTasks);
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

    // --- Data Management Functions ---
    function exportData() {
        const data = {
            tasks: tasks,
            exportDate: new Date().toISOString(),
            version: "1.0",
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(dataBlob);
        link.download = `fsoc-medium-backup-${new Date().toISOString().split("T")[0]}.json`;
        link.click();

        URL.revokeObjectURL(link.href);
        updateLastBackupDate();
        toast.success("Data exported successfully!");
    }

    function importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedData = JSON.parse(e.target.result);

                if (validateImportData(importedData)) {
                    const confirmed = confirm(
                        "This will replace all existing tasks. Continue?",
                    );
                    if (confirmed) {
                        tasks = importedData.tasks || [];
                        saveTasks();
                        renderTasks();
                        toast.success("Data imported successfully!");

                    }
                } else {
                    alert(
                        "Invalid file format. Please select a valid backup file.",
                    );
                }
            } catch (error) {
                alert(
                    "Error reading file. Please ensure it's a valid JSON backup file.",
                );
            }
        };
        reader.readAsText(file);
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

    function clearAllData() {
        const confirmed = confirm(
            "This will delete all tasks permanently. Are you sure?",
        );
        if (confirmed) {
            const doubleConfirmed = confirm(
                "This action cannot be undone. Click OK to proceed.",
            );
            if (doubleConfirmed) {
                tasks = [];
                saveTasks();
                renderTasks();
                toast.success("All data cleared!");

            }
        }
    }

   toast.success(message);  // For success messages
toast.error(message);    // For error messages (where applicable)
toast.info(message);     // For informational messages
toast.warning(message);  // For warnings as needed


    function updateLastBackupDate() {
        localStorage.setItem("lastBackupDate", new Date().toISOString());
    }

    function checkBackupReminder() {
        const lastBackup = localStorage.getItem("lastBackupDate");
        const daysSinceBackup = lastBackup
            ? Math.floor(
                  (Date.now() - new Date(lastBackup).getTime()) /
                      (1000 * 60 * 60 * 24),
              )
            : Infinity;

        if (daysSinceBackup >= 7 && tasks.length > 0) {
            setTimeout(() => {
                const reminder = confirm(
                    "It's been a week since your last backup. Would you like to export your data now?",
                );
                if (reminder) {
                    exportData();
                }
            }, 2000);
        }
    }

    // --- Data Management Events ---
    exportDataBtn.addEventListener("click", exportData);
    importDataBtn.addEventListener("click", () => {
        importFileInput.click();
    });
    importFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            importData(file);
        }
        e.target.value = "";
    });

    // --- Theme Toggle ---
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-theme");
        });
    }

    // --- Init ---
    function init() {
        renderTasks();
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        getLocationWeather();
        checkBackupReminder();
    }

    init();
});
