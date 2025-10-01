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
    let taskIdCounter = 0; 

    // --- Block C: Service Configuration ---
   
    const weatherApiKey = 'YOUR_API_KEY_HERE';

    // --- Block D: Module 1 Functions ---
    
    // Create individual task element
    function createTaskElement(task, index) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.taskId = task.id;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskCompletion(index));
        
        const taskText = document.createElement('span');
        taskText.textContent = task.text;
        if (task.completed) {
            taskText.style.textDecoration = 'line-through';
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => deleteTask(index));

        li.appendChild(checkbox);
        li.appendChild(taskText);
        li.appendChild(deleteBtn);
        
        return li;
    }

    function addTaskToDOM(task, index) {
        const taskElement = createTaskElement(task, index);
        taskList.appendChild(taskElement);
    }

    function updateTaskInDOM(task, index) {
        const taskElement = taskList.querySelector(`[data-task-id="${task.id}"]`);
        if (taskElement) {
            const checkbox = taskElement.querySelector('input[type="checkbox"]');
            const taskText = taskElement.querySelector('span');
            
            checkbox.checked = task.completed;
            taskText.textContent = task.text;
            taskText.style.textDecoration = task.completed ? 'line-through' : 'none';
            
            checkbox.replaceWith(checkbox.cloneNode(true));
            const newCheckbox = taskElement.querySelector('input[type="checkbox"]');
            newCheckbox.checked = task.completed;
            newCheckbox.addEventListener('change', () => toggleTaskCompletion(index));
        }
    }


    function removeTaskFromDOM(taskId) {
        const taskElement = taskList.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.remove();
        }
    }

    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            addTaskToDOM(task, index);
        });
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            const newTask = { 
                id: ++taskIdCounter, 
                text: text, 
                completed: false 
            };
            tasks.push(newTask);
            addTaskToDOM(newTask, tasks.length - 1);
            taskInput.value = ''; // Clear input
        }
    }

    function toggleTaskCompletion(index) {
        if (index >= 0 && index < tasks.length) {
            tasks[index].completed = !tasks[index].completed;
            updateTaskInDOM(tasks[index], index);
        }
    }

    function deleteTask(index) {
        if (index >= 0 && index < tasks.length) {
            const taskId = tasks[index].id;
            tasks.splice(index, 1);
            removeTaskFromDOM(taskId);
            // Update indices for remaining tasks
            updateAllTaskIndices();
        }
    }

    function clearAllTasks() {
        tasks = [];
        taskList.innerHTML = '';
    }

    // Update event listeners after task deletion to maintain correct indices
    function updateAllTaskIndices() {
        const taskElements = taskList.querySelectorAll('.task-item');
        taskElements.forEach((element, newIndex) => {
            const checkbox = element.querySelector('input[type="checkbox"]');
            const deleteBtn = element.querySelector('.delete-btn');
            
            // Clone and replace to remove old event listeners
            const newCheckbox = checkbox.cloneNode(true);
            const newDeleteBtn = deleteBtn.cloneNode(true);
            
            newCheckbox.addEventListener('change', () => toggleTaskCompletion(newIndex));
            newDeleteBtn.addEventListener('click', () => deleteTask(newIndex));
            
            checkbox.replaceWith(newCheckbox);
            deleteBtn.replaceWith(newDeleteBtn);
        });
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
            displayWeather(data);
        } catch (error) {
            console.error('Service call failed:', error);
            weatherInfo.innerHTML = `<p class="error-text">Data unavailable.</p>`;
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
