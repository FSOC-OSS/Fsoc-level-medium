document.addEventListener("DOMContentLoaded", () => {
    const taskInput = document.getElementById("task-input");
    const addTaskBtn = document.getElementById("add-task-btn");
    const taskList = document.getElementById("task-list");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const sortTasksBtn = document.getElementById("sort-tasks-btn");
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

        tasks.forEach((task) => {
            if (task.completed) {
                completedTasks.push(task);
            } else {
                incompleteTasks.push(task);
            }
        });

        tasks = [...incompleteTasks, ...completedTasks];
        saveTasks();

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

    function sortTasksAlphabetically() {
        tasks.sort((a, b) => a.text.localeCompare(b.text));
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
    sortTasksBtn.addEventListener("click", sortTasksAlphabetically);

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
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
        renderTasks();
        fetchWeather("London");
    }

    init();
});
