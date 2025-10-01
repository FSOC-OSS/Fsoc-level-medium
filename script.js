document.addEventListener("DOMContentLoaded", () => {
  // --- Block A: Element Hooks ---
  const taskInput = document.getElementById("task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const taskList = document.getElementById("task-list");
  const clearAllBtn = document.getElementById("clear-all-btn");
  const cityInput = document.getElementById("city-input");
  const searchWeatherBtn = document.getElementById("search-weather-btn");
  const weatherInfo = document.getElementById("weather-info");
  const themeToggle = document.getElementById("theme-toggle");
  const copyrightYear = document.querySelector("footer p");

  // Contact page elements
  const navLinks = document.querySelectorAll(".nav-link");
  const dashboardSection = document.getElementById("dashboard-section");
  const contactSection = document.getElementById("contact-section");
  const contactForm = document.getElementById("contact-form");

  // --- Block B: Data Store ---
  let tasks = [];

  // --- Block C: Service Configuration ---

  const weatherApiKey = "YOUR_API_KEY_HERE";

  // --- Block D: Module 1 Functions ---
  function renderTasks() {
    taskList.innerHTML = "";
    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "task-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => toggleTaskCompletion(index));

      const taskText = document.createElement("span");
      taskText.textContent = task.text;
      taskText.className = "task-text";
      if (task.completed) {
        taskText.classList.add("completed");
      }

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "✏️";
      editBtn.title = "Edit task";
      editBtn.addEventListener("click", () => toggleTaskEdit(index));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete task";
      deleteBtn.addEventListener("click", () => deleteTask(index));

      li.appendChild(checkbox);
      li.appendChild(taskText);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });
  }

  function addTask() {
    const text = taskInput.value.trim();
    if (text) {
      tasks.push({ text: text, completed: false });
      taskInput.value = "";
      renderTasks();
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

  function toggleTaskEdit(index) {
    const taskItem = document.querySelectorAll(".task-item")[index];
    if (!taskItem) return;

    const taskText = taskItem.querySelector(".task-text");
    const editBtn = taskItem.querySelector(".edit-btn");

    if (!taskText || !editBtn) return;

    if (taskText.contentEditable === "true") {
      // Save the task
      const newText = taskText.textContent.trim();
      if (newText && newText !== tasks[index].text) {
        tasks[index].text = newText;
      }
      taskText.contentEditable = "false";
      taskText.classList.remove("editing");
      editBtn.textContent = "✏️";
      editBtn.title = "Edit task";

      // Remove any existing event listeners
      taskText.removeEventListener("keydown", taskText._keyHandler);
      delete taskText._keyHandler;
    } else {
      // Enter edit mode
      taskText.contentEditable = "true";
      taskText.classList.add("editing");
      taskText.focus();
      editBtn.textContent = "💾";
      editBtn.title = "Save task";

      // Select all text for easy editing
      setTimeout(() => {
        const range = document.createRange();
        range.selectNodeContents(taskText);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }, 0);

      // Add keyboard event listeners
      const handleKeyPress = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          toggleTaskEdit(index);
        } else if (e.key === "Escape") {
          e.preventDefault();
          taskText.textContent = tasks[index].text; // Restore original text
          taskText.contentEditable = "false";
          taskText.classList.remove("editing");
          editBtn.textContent = "✏️";
          editBtn.title = "Edit task";
          taskText.removeEventListener("keydown", handleKeyPress);
        }
      };

      // Store reference to handler for cleanup
      taskText._keyHandler = handleKeyPress;
      taskText.addEventListener("keydown", handleKeyPress);

      // Add click outside to save functionality
      const handleClickOutside = (e) => {
        if (!taskItem.contains(e.target)) {
          toggleTaskEdit(index);
          document.removeEventListener("click", handleClickOutside);
        }
      };

      // Add a small delay to prevent immediate triggering
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 100);
    }
  }
  // --- Contact Page Functions ---
  function showSection(sectionName) {
    // Hide all sections
    dashboardSection.classList.add("hidden");
    contactSection.classList.add("hidden");

    // Remove active class from all nav links
    navLinks.forEach((link) => link.classList.remove("active"));

    // Show selected section and activate corresponding nav link
    if (sectionName === "dashboard") {
      dashboardSection.classList.remove("hidden");
      document
        .querySelector('[data-section="dashboard"]')
        .classList.add("active");
    } else if (sectionName === "contact") {
      contactSection.classList.remove("hidden");
      document
        .querySelector('[data-section="contact"]')
        .classList.add("active");
    } else if (sectionName === "about") {
      // For now, show dashboard as about page is not implemented
      dashboardSection.classList.remove("hidden");
      document
        .querySelector('[data-section="dashboard"]')
        .classList.add("active");
    }
  }

  function handleContactForm(event) {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name");
    const email = formData.get("email");
    const subject = formData.get("subject");
    const message = formData.get("message");

    // Simple validation
    if (!name || !email || !subject || !message) {
      showMessage("Please fill in all fields.", "error");
      return;
    }

    // Simulate form submission
    showMessage(
      "Thank you for your message! We'll get back to you soon.",
      "success"
    );
    contactForm.reset();
  }

  function showMessage(text, type) {
    // Remove existing messages
    const existingMessage = document.querySelector(".message");
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;

    // Insert message at the top of the contact form
    contactForm.insertBefore(messageDiv, contactForm.firstChild);

    // Auto-remove message after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }

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
      console.error("Service call failed:", error);
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
  addTaskBtn.addEventListener("click", addTask);
  clearAllBtn.addEventListener("click", clearAllTasks);

  searchWeatherBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) {
      fetchWeather(city);
    }
  });

  themeToggle.addEventListener("click", () => {
    console.log("Theme toggle logic is not implemented.");
  });

  // Navigation event listeners
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");
      showSection(section);
    });
  });

  // Contact form event listener
  contactForm.addEventListener("submit", handleContactForm);

  // --- Block G: Application Entry Point ---
  function init() {
    fetchWeather("sdfasdfnsa,mn,mn.");
    renderTasks();
  }

  init();
});
