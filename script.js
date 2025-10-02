
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
    const errorMsg = document.getElementById('error-msg'); // new error placeholder

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
=======
document.addEventListener("DOMContentLoaded", () => {
  // --- Block A: Element Hooks ---
  const taskInput = document.getElementById("task-input")
  const addTaskBtn = document.getElementById("add-task-btn")
  const taskList = document.getElementById("task-list")
  const cityInput = document.getElementById("city-input")
  const searchWeatherBtn = document.getElementById("search-weather-btn")
  const weatherInfo = document.getElementById("weather-info")
  const themeToggle = document.getElementById("theme-toggle")
  const copyrightYear = document.querySelector("footer p")

  // --- Block B: Data Store ---
  let tasks = []

  // --- Block C: Service Configuration ---

  const weatherApiKey = "YOUR_API_KEY_HERE"

  // --- Block D: Module 1 Functions ---
  function renderTasks() {
    taskList.innerHTML = ""
    tasks.forEach((task, index) => {
      const li = document.createElement("li")
      li.className = "task-item"

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.checked = task.completed
      checkbox.addEventListener("change", () => toggleTaskCompletion(index))

      const taskText = document.createElement("span")
      taskText.textContent = task.text
      if (task.completed) {
        taskText.classList.add("completed")
      }

      taskText.addEventListener("dblclick", () => enableInlineEdit(index, taskText))

      const deleteBtn = document.createElement("button")
      deleteBtn.className = "delete-btn"
      deleteBtn.textContent = "🗑️"
      deleteBtn.addEventListener("click", () => deleteTask(index))

      li.appendChild(checkbox)
      li.appendChild(taskText)
      li.appendChild(deleteBtn)
      taskList.appendChild(li)
    })
  }

  function addTask() {
    const text = taskInput.value.trim()
    if (text) {
      tasks.push({ text: text, completed: false })
      renderTasks()
      taskInput.value = ""
    }
  }


    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text: text, completed: false });
            renderTasks();
            taskInput.value = '';
            errorMsg.textContent = ''; // clear error
        } else {
            errorMsg.textContent = "The task is empty. Please enter a valid task.";
        }
    }
     function toggleTaskCompletion(index) {
        tasks[index].completed = !tasks[index].completed;
        renderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        renderTasks();
    }

    function clearAllTasks() {
        tasks = [];
        renderTasks();
    }
=======


  function enableInlineEdit(index, spanEl) {
    const originalText = tasks[index].text
    const input = document.createElement("input")
    input.type = "text"
    input.value = originalText
    input.className = "task-edit-input"
    input.setAttribute("aria-label", "Edit task")

    // keep layout stable

    input.style.flex = "1 1 auto"
    input.style.padding = "0.25rem 0.5rem"
    input.style.fontSize = "1rem"

    spanEl.replaceWith(input)
    input.focus()
    input.setSelectionRange(0, input.value.length)

    const commit = () => {
      const newText = input.value.trim()
      tasks[index].text = newText || originalText // revert if empty
      renderTasks()
    }

    const cancel = () => {
      renderTasks()
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit()
      if (e.key === "Escape") cancel()
    })
    input.addEventListener("blur", commit)
  }

  // --- Block E: Module 2 Functions sample data ---
  async function fetchWeather(city) {
    const url = `write something here`
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
      }
      const data = await response.json()
      displayWeather(data)
    } catch (error) {
      console.error("Service call failed:", error)
      weatherInfo.innerHTML = `<p class="error-text">Data unavailable.</p>`
    }
  }

  function displayWeather(data) {
    const { name, main, weather } = data
    const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`
    weatherInfo.innerHTML = `
            <h3>${name}</h3>
            <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon">
            <p>Temperature: ${main.temp}°C</p>
            <p>Condition: ${weather[0].main}</p>
        `
  }

  // --- Block F: Event Registry ---
  addTaskBtn.addEventListener("click", addTask)

  searchWeatherBtn.addEventListener("click", () => {
    const city = cityInput.value.trim()
    if (city) {
      fetchWeather(city)
    }
  })

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme")
  })

  const navLinks = Array.from(document.querySelectorAll(".nav-link"))
  navLinks.forEach((navLink) => {
    navLink.addEventListener("click", (e) => {
      navLinks.forEach((allNavLinks) => {
        allNavLinks.classList.remove("active")
      })
      e.target.classList.add("active")
    })
  })

  // --- Block G: Application Entry Point ---
  function init() {
    fetchWeather("sdfasdfnsa,mn,mn.")
    renderTasks()
  }

  init()
})
