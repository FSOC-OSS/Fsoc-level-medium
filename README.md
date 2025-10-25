# 🤝 How to Contribute

We welcome all types of contributions! Whether you're fixing bugs, adding features, improving documentation, or enhancing the UI/UX, your help is appreciated. Please read our Contributing Guidelines and Code of Conduct before getting started.

---

## ✨ Recent Updates

### 🍞 Custom Toast Notification System
The application now features a modern toast notification system that replaces browser `alert()` dialogs:

- **Multiple notification types**: Success, Error, Warning, Info
- **Auto-dismiss** with visual progress bar
- **Manual close** button on each toast
- **Stack multiple toasts** simultaneously (up to 5)
- **6 position options**: top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
- **Smooth animations**: Slide-in/out effects
- **Fully responsive** and theme-aware
- **Zero dependencies**: Pure vanilla JavaScript

📖 See [TOAST_NOTIFICATIONS.md](./TOAST_NOTIFICATIONS.md) for complete documentation.  
🧪 Try the demo: Open `toast-demo.html` in your browser or check the demo section on the main dashboard.

---

## 📌 Step-by-Step Guide to Making a Pull Request

### 1. **Fork the Repository** 🍴
* Click the "Fork" button at the top-right corner of this repository's GitHub page.
* This creates a copy of the repository under your GitHub account.

### 2. **Clone Your Forked Repository** 📥
* On your GitHub account, navigate to your forked repo.
* Copy the repository URL.
* Open your terminal and run:

```bash
git clone https://github.com/<your-username>/Fsoc-level-medium.git
```

Replace `<your-username>` with your actual GitHub username.

### 3. **Create a New Branch** 🌿
* Navigate into the cloned directory:

```bash
cd Fsoc-level-medium
```

* Create and switch to a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Use a descriptive branch name, e.g., `feature/add-dark-mode` or `fix/loading-spinner-bug`.

### 4. **Make Your Changes** 🔧
* Open the project in your code editor (we recommend VS Code).
* Make your modifications to the codebase.
* Ensure your changes follow our coding standards.
* Test your changes locally by opening `index.html` in your browser.

### 5. **Commit Your Changes** 💾
* Stage your changes:

```bash
git add .
```

* Commit with a clear, descriptive message:

```bash
git commit -m "Add: Brief description of your changes

- More detailed explanation if needed
- Reference any issues (e.g., Fixes #123)"
```

### 6. **Push to Your Fork** 📤
* Push your branch to your forked repository:

```bash
git push origin feature/your-feature-name
```

### 7. **Create a Pull Request** 🔄
* Go to the original repository on GitHub: [FSOC-OSS/Fsoc-level-medium](https://github.com/FSOC-OSS/Fsoc-level-medium)
* Click on the "Pull Requests" tab.
* Click "New Pull Request".
* Select your branch from the dropdown.
* Fill out the PR template:
  * **Title**: Clear and descriptive (e.g., "Fix: Dark mode toggle functionality")
  * **Description**: Explain what changes you made, why, and how to test them.
  * **Screenshots/GIFs**: If your changes affect the UI, include visual proof.
  * **Related Issues**: Reference any issues your PR addresses.
* Click "Create Pull Request".

### 8. **Wait for Review** 👀
* Our maintainers will review your PR.
* Be responsive to any feedback or requested changes.
* Once approved, your PR will be merged! 🎉

---

## 💡 Contribution Ideas

Looking for inspiration? Here are some areas where you can contribute:

- **Fix Bugs**: Check the Issues tab for reported bugs
- **Implement Missing Features**: Complete the task management functionality
- **Improve UI/UX**: Enhance the design and user experience
- **Add Form Validation**: Ensure user inputs are properly validated
- **Improve Responsiveness**: Make the app work better on mobile devices
- **Enhance Accessibility**: Add ARIA labels and keyboard navigation
- **Write Documentation**: Improve README or add inline code comments
- **Add Unit Tests**: Help us test the application

Check out our [Issues page](https://github.com/FSOC-OSS/Fsoc-level-medium/issues) for more specific tasks!

---

## 📝 Code Style Guidelines

- Use **meaningful variable and function names**
- Add **comments** to explain complex logic
- Keep functions **small and focused** on a single task
- Ensure your code is **properly indented**
- Test your changes before submitting

---

## 🎯 What Makes a Good Pull Request?

- **Clear title and description** explaining what you changed and why
- **Small, focused changes** that address one issue at a time
- **Tested code** that works as expected
- **Follows existing code style** and project structure
- **Includes screenshots** for UI changes

---

## ❓ Need Help?

If you have questions or need assistance:
- Open an issue on GitHub
- Check existing issues and pull requests
- Reach out to the maintainers

**Happy Contributing! 🚀**
