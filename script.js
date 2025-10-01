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
   
    const weatherApiKey = 'YOUR_API_KEY_HERE';

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
        }
    }
  //---Can write the the required functions here



 

  

     // --- Block E: Module 2 Functions sample data ---
    async function fetchWeather(city) {
        const url = `write something here `;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }
            const data = await response.json();
            
            if (data && data.name && data.main && data.weather) {
                displayWeather(data);
            } else {
                throw new Error('Invalid weather data received');
            }
        } catch (error) {
            console.error('Service call failed:', error);
            
            let errorMessage = 'Weather data unavailable. ';
            
            if (error.message.includes('Failed to fetch') || !navigator.onLine) {
                errorMessage += 'Please check your internet connection and try again.';
            } else {
                const statusMatch = error.message.match(/\((\d+)\)/);
                const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
                
                switch (statusCode) {
                    case 400:
                        errorMessage += 'Invalid request. Please check the city name.';
                        break;
                    case 401:
                        errorMessage += 'Authentication failed. Please contact support.';
                        break;
                    case 403:
                        errorMessage += 'Access denied. API key may be invalid.';
                        break;
                    case 404:
                        errorMessage += 'City not found. Please check the city name.';
                        break;
                    case 429:
                        errorMessage += 'Too many requests. Please wait and try again.';
                        break;
                    case 500:
                    case 502:
                    case 503:
                    case 504:
                        errorMessage += 'Weather service is temporarily down. Please try again later.';
                        break;
                    default:
                        errorMessage += 'Please try again later.';
                        break;
                }
            }
            
            weatherInfo.innerHTML = `<p class="error-text">${errorMessage}</p>`;
        }
    }

    function displayWeather(data) {
        const { name, main, weather } = data;
        const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        weatherInfo.innerHTML = `
            <h3>${name}</h3>
            <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
            <p>Temperature: ${main.temp}°C</p>
            <p>Condition: ${weather[0].main}</p>
        `;
    }

  

    // --- Block F: Event Registry ---
    addTaskBtn.addEventListener('click', addTask);
    clearAllBtn.addEventListener('click', clearAllTasks);

    searchWeatherBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
        }
    });

    themeToggle.addEventListener('click', () => {
        console.log('Theme toggle logic is not implemented.');
    });

    // --- Block G: Application Entry Point ---
    function init() {
        fetchWeather("sdfasdfnsa,mn,mn.");
        renderTasks();
    }

    init();
});
