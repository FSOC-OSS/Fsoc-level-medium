document.addEventListener("DOMContentLoaded", () => {
  const taskInput = document.getElementById("task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
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
  const WEATHER_TIMEOUT_MS = 8000;
  const MAX_RETRIES = 2;

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

  function createTaskElement(task, index) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.draggable = true;
    li.dataset.index = index; // Set data-index for drag and drop

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
    tasks = [...incompleteTasks, ...completedTasks]; // Reorder tasks array

    taskList.innerHTML = "";
    document.querySelector("#filter-active").innerHTML = `Active [${incompleteTasks.length}]`;
    document.querySelector("#filter-completed").innerHTML = `Completed [${completedTasks.length}]`;

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

    filteredTasks.forEach((task, index) => {
      taskList.appendChild(createTaskElement(task, index)); // Use the current index for data-index
    });
  }

  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = { text, completed: false };
    tasks.push(newTask);

    saveTasks();
    renderTasks();
    taskInput.value = "";
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
      city
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
      }
      else if (error.name === "TypeError") {
        showWeatherError("Network error. Please check your connection.", attempt);
      }
      else {
        showWeatherError("Weather data currently unavailable.", attempt);
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
    if (retryBtn) retryBtn.addEventListener("click", () => {
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
  let draggedItem = null;

  taskList.addEventListener("dragstart", (e) => {
    draggedItem = e.target;
    setTimeout(() => {
      e.target.classList.add("dragging");
    }, 0);
  });

  taskList.addEventListener("dragend", (e) => {
    e.target.classList.remove("dragging");
    draggedItem = null;
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const currentDraggable = document.querySelector(".dragging");
    if (afterElement == null) {
      taskList.appendChild(currentDraggable);
    } else {
      taskList.insertBefore(currentDraggable, afterElement);
    }
  });

  taskList.addEventListener("drop", () => {
    const newOrder = Array.from(taskList.children).map((li) => {
      const index = parseInt(li.dataset.index, 10);
      return tasks[index];
    });
    tasks = newOrder;
    saveTasks();
    renderTasks();
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".task-item:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
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
    if (e.target.dataset.action === "toggle" && e.target.type === "checkbox") {
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

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

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

  themeToggle.addEventListener("click", () =>
    document.body.classList.toggle("dark-theme")
  );

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      navLinks.forEach((l) => l.classList.remove("active"));
      e.currentTarget.classList.add("active");
    });
  });

  // --- Drag and Drop Event Listeners ---
  let draggedTaskIndex = null;

  taskList.addEventListener("dragstart", (e) => {
    const li = e.target.closest(".task-item");
    if (!li) return;
    draggedTaskIndex = parseInt(li.dataset.index, 10);
    e.dataTransfer.setData("text/plain", draggedTaskIndex);
    li.classList.add("dragging");
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault(); // Allow drop
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const draggable = document.querySelector(".dragging");
    if (draggable === null) return; // No item being dragged

    // Remove drag-over from all elements first
    taskList.querySelectorAll(".task-item").forEach(item => item.classList.remove("drag-over"));

    if (afterElement == null) {
      taskList.appendChild(draggable);
    } else {
      taskList.insertBefore(draggable, afterElement);
    }
    // Add drag-over to the element being hovered over, if it's not the dragged item itself
    if (afterElement && afterElement !== draggable) {
      afterElement.classList.add("drag-over");
    } else if (afterElement === null && taskList.lastElementChild !== draggable) {
      // If dropping at the end and it's not already the last element
      // No specific element to add drag-over to, but we can add it to the last child if needed
    }
  });

  taskList.addEventListener("dragleave", (e) => {
    const li = e.target.closest(".task-item");
    if (li) {
      li.classList.remove("drag-over");
    }
  });

  taskList.addEventListener("drop", (e) => {
    e.preventDefault();
    const droppedIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    const draggedElement = document.querySelector(".dragging");

    if (!draggedElement) return; // No item was being dragged

    const targetElement = e.target.closest(".task-item");
    let targetIndex;

    if (targetElement && targetElement !== draggedElement) {
      targetIndex = parseInt(targetElement.dataset.index, 10);
    } else if (!targetElement && taskList.children.length > 0) {
      // Dropped outside any task item, but there are other tasks, append to end
      targetIndex = tasks.length - 1;
    } else if (!targetElement && taskList.children.length === 0) {
      // Dropped into an empty list
      targetIndex = 0;
    } else {
      // Dropped on itself or invalid target
      taskList.querySelectorAll(".task-item").forEach(item => item.classList.remove("dragging", "drag-over"));
      return;
    }

    // Reorder the tasks array
    const [draggedTask] = tasks.splice(droppedIndex, 1);
    tasks.splice(targetIndex, 0, draggedTask);

    saveTasks();
    renderTasks();
  });

  taskList.addEventListener("dragend", (e) => {
    const allLis = taskList.querySelectorAll(".task-item");
    allLis.forEach(li => li.classList.remove("dragging", "drag-over"));
    draggedTaskIndex = null;
    renderTasks(); // Re-render to ensure data-index attributes are correct
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".task-item:not(.dragging)")];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function init() {
    renderTasks();
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    fetchWeather("London");
  }

  init();
});