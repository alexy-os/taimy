// Function to toggle dark mode
function toggleDarkMode() {
    if (localStorage.getItem('darkMode') === 'dark') {
        localStorage.setItem('darkMode', 'light');
        document.documentElement.classList.remove('dark');
    } else {
        localStorage.setItem('darkMode', 'dark');
        document.documentElement.classList.add('dark');
    }
}

// Function to set initial theme
function setInitialTheme() {
    if (localStorage.getItem('darkMode') === 'dark' || (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Set initial theme when the script loads
setInitialTheme();

// Add event listener to dark mode toggle button when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});