document.addEventListener("DOMContentLoaded", () => {
    // --- Block A: Element Hooks ---
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const filterBtns = document.querySelectorAll(".filter-btn");

    const cityInput = document.getElementById("city-input");
    const searchWeatherBtn = document.getElementById("search-weather-btn");
    const weatherInfo = document.getElementById("weather-info");
    const themeToggle = document.getElementById("theme-toggle");
    // Support both footer p and span#year elements
    const copyrightYear = document.querySelector('footer p') || document.getElementById("year"); 

    // --- Block B: Data Store & State ---
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    let currentFilter = "all";
    let weatherSearchTimeout = null;

    // --- Block C: Service Configuration ---
    const weatherApiKey = "YOUR_API_KEY_HERE";
    const DEBOUNCE_DELAY = 500;

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

    // --- Block D: Module 1 Functions ---

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
            // Find the original index for delegation/modification
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
        saveTasks();
        taskInput.value = "";
        renderTasks(); // Re-render to respect current filter
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
        renderTasks(); // Re-render to ensure filter state updates
    }

    function enableInlineEdit(index, spanEl) {
        if (spanEl.parentElement.querySelector(".task-edit-input")) return;

        const originalText = tasks[index].text;
        const input = document.createElement("input");
        input.type = "text";
        input.value = originalText;
        input.className = "task-edit-input";
        input.setAttribute('aria-label', 'Edit task');
        
        // keep layout stable
        input.style.flex = '1 1 auto';
        input.style.padding = '0.25rem 0.5rem';
        input.style.fontSize = '1rem';

        spanEl.replaceWith(input);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        const saveChanges = () => {
            const newText = input.value.trim();
            tasks[index].text = newText || originalText; // revert if empty
            saveTasks();
            renderTasks();
        };

        const cancel = () => {
            renderTasks();
        };

        input.addEventListener("blur", saveChanges);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveChanges();
            else if (e.key === "Escape") cancel();
        });
    }

    // --- Block E: Module 2 Functions ---

    async function fetchWeather(city) {
        if (!city) {
            weatherInfo.innerHTML = '<p class="loading-text">Enter a city to see the weather...</p>';
            return;
        }
        
        weatherInfo.innerHTML = '<p class="loading-text">Loading weather data...</p>';

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric`;

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Explicit 404 error handling from feature/city_not_exist_error branch
                    weatherInfo.innerHTML = `<p class="error-text">
                        ❌ Oops! "<strong>${city}</strong>" city not found.<br>
                        🧐 Double-check the spelling or try a valid city name.<br>
                        </p>`;
                    return;
                }
                throw new Error(`Request failed (${response.status})`);
            }
            
            const data = await response.json();
            displayWeather(data);
            
        } catch (error) {
            console.error('Service call failed:', error);
            weatherInfo.innerHTML = `<p class="error-text">Weather data unavailable due to a service error.</p>`;
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

    // --- Block F: Event Registry ---

    // Task List Event Delegation for click actions (delete)
    taskList.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (!action) return;
        const li = e.target.closest(".task-item");
        if (!li) return;
        const index = parseInt(li.dataset.index, 10);
        
        if (action === "delete") deleteTask(index);
    });

    // Task List Event Delegation for change actions (toggle checkbox)
    taskList.addEventListener("change", (e) => {
        const action = e.target.dataset.action;
        if (action === "toggle" && e.target.type === "checkbox") {
            const li = e.target.closest(".task-item");
            if (!li) return;
            const index = parseInt(li.dataset.index, 10);
            toggleTaskCompletion(index);
        }
    });

    // Task List Event Delegation for dblclick actions (edit)
    taskList.addEventListener("dblclick", (e) => {
        const action = e.target.dataset.action;
        if (action === "edit" && e.target.tagName === "SPAN") {
            const li = e.target.closest(".task-item");
            if (!li) return;
            const index = parseInt(li.dataset.index, 10);
            enableInlineEdit(index, e.target);
        }
    });

    // Add Task Events
    addTaskBtn.addEventListener("click", addTask);
    taskInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") addTask();
    });

    // Clear All & Filter Events
    clearAllBtn.addEventListener("click", clearAllTasks);

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            filterBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Weather Search Events (Debounced input and immediate button/enter)
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

    // Theme Toggle
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
    });

    // Navigation (If applicable)
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            navLinks.forEach((l) => l.classList.remove("active"));
            e.currentTarget.classList.add("active");
        });
    });

    // --- Block G: Application Entry Point ---
    function init() {
        renderTasks();
        // Set copyright year
        if (copyrightYear) {
            copyrightYear.textContent = `© ${new Date().getFullYear()} Todo & Weather App`;
        }
        // Initial weather fetch
        fetchWeather("London");
    }

    init();
});