document.addEventListener('DOMContentLoaded', () => {
    // --- Block A: Element Hooks ---
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const cityInput = document.getElementById('city-input');
    const searchWeatherBtn = document.getElementById('search-weather-btn');
    const weatherInfo = document.getElementById('weather-info');
    const themeToggle = document.getElementById('theme-toggle');
    const copyrightYear = document.querySelector('footer p');

    // --- Block B: Data Store ---
    let tasks = [];

    // --- Block C: Service Configuration ---
    const weatherApiKey = 'YOUR_API_KEY_HERE'; // <-- apna OpenWeather API key daalna

    // --- Block D: Module 1 Functions ---
    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = 'task-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => toggleTaskCompletion(index));

            const taskText = document.createElement('span');
            taskText.textContent = task.text;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.addEventListener('click', () => {
                tasks.splice(index, 1);
                renderTasks();
            });

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
            renderTasks();
            taskInput.value = '';
        }
    }

    function toggleTaskCompletion(index) {
        tasks[index].completed = !tasks[index].completed;
        renderTasks();
    }

    function clearAllTasks() {
        tasks = [];
        renderTasks();
    }

    // --- Block E: Module 2 Functions sample data ---
    async function fetchWeather(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric`;
        try {
            const response = await fetch(url);
            const data = await response.json();

            // Agar city nahi mili
            if (response.status === 404 || data.cod === "404") {
                weatherInfo.innerHTML = `
                    <div class="card">
                        <p class="error-text">
                            ⚠️ Oops! We couldn't find the city "<strong>${city}</strong>". Please check the spelling and try again.
                        </p>
                    </div>`;
                return;
            }

            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }

            displayWeather(data);
        } catch (error) {
            console.error('Service call failed:', error);
            weatherInfo.innerHTML = `
                <div class="card">
                    <p class="error-text">❌ Unable to fetch weather data. Please try again later.</p>
                </div>`;
        }
    }

    function displayWeather(data) {
        const { name, main, weather } = data;
        const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        weatherInfo.innerHTML = `
            <div class="card weather-widget">
                <h3>${name}</h3>
                <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
                <p>🌡 Temperature: ${main.temp}°C</p>
                <p>☁ Condition: ${weather[0].main}</p>
            </div>`;
    }

    // --- Block F: Event Registry ---
    addTaskBtn.addEventListener('click', addTask);
    clearAllBtn.addEventListener('click', clearAllTasks);

    searchWeatherBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        } else {
            weatherInfo.innerHTML = `
                <div class="card">
                    <p class="error-text">⚠️ Please enter a city name.</p>
                </div>`;
        }
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });

    // --- Block G: Application Entry Point ---
    function init() {
        renderTasks();
    }

    init();
});
