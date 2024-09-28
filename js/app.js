// Initialize tasks from localStorage or use empty array
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
let postponedTasks = JSON.parse(localStorage.getItem('postponedTasks')) || [];
tasks = tasks.filter(task => task && task.id);  // Фильтруем невалидные задачи

// DOM elements
const taskList = document.getElementById('taskList');
if (!taskList) {
    console.error('Task list element not found');
}
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const menuToggle = document.getElementById('menuToggle');
const dropdownMenu = document.getElementById('dropdownMenu');
const exportJSON = document.getElementById('exportJSON');
const importJSON = document.getElementById('importJSON');

// Function to save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Function to create a task element
function createTaskElement(task) {
    if (!task || !task.id) {
        console.error('Invalid task object:', task);
        return document.createElement('div');
    }

    const taskEl = document.createElement('div');
    taskEl.className = 'task-card bg-white dark:bg-slate-800 p-4 rounded-md shadow-md';
    taskEl.dataset.id = task.id;
    taskEl.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="drag-handle mr-2 text-slate-400">☰</span>
            <button class="playPauseBtn p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 mr-2">
                ${task.isRunning ? '⏸' : '▶'}
            </button>
            <span class="text-xs font-medium mr-2">${formatTimeHoursMinutes(task.timeLeft)}</span>
            <input type="text" value="${task.name}" class="flex-grow bg-transparent border-none focus:outline-none task-name-input text-sm">
            <button class="expandBtn p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 ml-2">▼</button>
        </div>
        <div class="expanded-content hidden mt-4">
            <div class="text-center">
                <input type="text" class="task-time text-center bg-transparent border-none focus:outline-none text-sm" value="${formatTime(task.timeLeft)}">
                <div class="end-time text-xs text-slate-500 dark:text-slate-400">Ends at ${getEndTime(task.timeLeft)}</div>
            </div>
            <div class="flex justify-center items-center space-x-4 mt-4">
                <button class="adjustTimeBtn p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs" data-adjust="-5">-5</button>
                <button class="playPauseBtn p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs">
                    ${task.isRunning ? '⏸' : '▶'}
                </button>
                <button class="resetBtn p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs">🔄</button>
                <button class="adjustTimeBtn p-1 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs" data-adjust="+5">+5</button>
            </div>
            <div class="flex justify-center mt-4 space-x-4">
                <button class="completeBtn p-1 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-xs">✅</button>
                <button class="postponeBtn p-1 rounded-md bg-yellow-500 hover:bg-yellow-600 text-white text-xs">⏳</button>
            </div>
        </div>
    `;

    const playPauseBtn = taskEl.querySelector('.playPauseBtn');
    playPauseBtn.addEventListener('click', () => toggleTimer(task.id));

    const expandBtn = taskEl.querySelector('.expandBtn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => toggleExpand(taskEl));
    } else {
        console.error('Expand button not found for task:', task.id);
    }

    const completeBtn = taskEl.querySelector('.completeBtn');
    if (completeBtn) {
        completeBtn.addEventListener('click', () => completeTask(task.id));
    }

    const postponeBtn = taskEl.querySelector('.postponeBtn');
    if (postponeBtn) {
        postponeBtn.addEventListener('click', () => postponeTask(task.id));
    }

    const adjustTimeBtns = taskEl.querySelectorAll('.adjustTimeBtn');
    adjustTimeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const adjustment = parseInt(btn.dataset.adjust);
            adjustTime(task.id, adjustment);
        });
    });

    const resetBtn = taskEl.querySelector('.resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetTimer(task.id));
    }

    const taskTimeInput = taskEl.querySelector('.task-time');
    taskTimeInput.addEventListener('input', () => formatTimeInput(taskTimeInput));
    taskTimeInput.addEventListener('change', () => {
        formatTimeInput(taskTimeInput);
        updateTaskTime(task.id, taskTimeInput.value);
    });

    return taskEl;
}

// Function to update task list
function updateTaskList() {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        if (task && task.id) {  // Добавляем проверку
            taskList.appendChild(createTaskElement(task));
        }
    });
}

// Function to create a task
function createTask(name) {
    return {
        id: Date.now(),
        name: name,
        timeLeft: 25 * 60,
        isRunning: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        statusLog: [{
            status: 'active',
            timestamp: new Date().toISOString()
        }],
        timeLog: []
    };
}

// Function to add a new task
function addTask() {
    const name = newTaskInput.value.trim();
    if (name) {
        const newTask = createTask(name);
        tasks.push(newTask);
        saveTasks();
        updateTaskList();
        newTaskInput.value = '';
    }
}

// Function to delete a task
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    updateTaskList();
}

// Function to toggle timer
function toggleTimer(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        console.error(`Task with id ${id} not found`);
        return;
    }
    task.isRunning = !task.isRunning;
    if (task.isRunning) {
        startTimer(task);
        if (!task.timeLog) task.timeLog = [];
        task.timeLog.push({
            action: 'start',
            timestamp: new Date().toISOString()
        });
    } else {
        stopTimer(task);
        if (!task.timeLog) task.timeLog = [];
        task.timeLog.push({
            action: 'stop',
            timestamp: new Date().toISOString()
        });
    }
    saveTasks();
    updateTaskList();
}

// Function to start timer
function startTimer(task) {
    task.interval = setInterval(() => {
        task.timeLeft--;
        if (task.timeLeft <= 0) {
            clearInterval(task.interval);
            task.isRunning = false;
            alert(`Time's up for task: ${task.name}`);
        }
        saveTasks();
        updateTaskList();
    }, 1000);
}

// Function to stop timer
function stopTimer(task) {
    clearInterval(task.interval);
}

// Function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Event listeners
addTaskBtn.addEventListener('click', addTask);
newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

darkModeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

menuToggle.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
});

exportJSON.addEventListener('click', () => {
    const allTasks = {
        active: tasks,
        completed: completedTasks,
        postponed: postponedTasks
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allTasks));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "all_tasks.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

importJSON.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                tasks = importedData.active || [];
                completedTasks = importedData.completed || [];
                postponedTasks = importedData.postponed || [];
                saveTasks();
                saveCompletedTasks();
                savePostponedTasks();
                updateTaskList();
                updateCompletedTasks();
                updatePostponedTasks();
            } catch (error) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// Initialize task list
updateTaskList();

// Initialize Sortable
new Sortable(taskList, {
    animation: 150,
    handle: '.drag-handle',
    onEnd: () => {
        tasks = Array.from(taskList.children).map(el => tasks.find(t => t.id === parseInt(el.dataset.id)));
        saveTasks();
    }
});

// Function to toggle task expansion
function toggleExpand(taskEl) {
    if (!taskEl) {
        console.error('Invalid task element');
        return;
    }

    taskEl.classList.toggle('expanded');
    const expandedContent = taskEl.querySelector('.expanded-content');
    if (expandedContent) {
        expandedContent.classList.toggle('hidden');
    } else {
        console.error('Expanded content not found');
    }

    const expandBtn = taskEl.querySelector('.expandBtn');
    if (expandBtn) {
        // Используем Unicode-символы для стрелок
        expandBtn.textContent = taskEl.classList.contains('expanded') ? '▲' : '▼';
    } else {
        console.error('Expand button not found');
    }
}

// Function to adjust time
function adjustTime(id, minutes) {
    const task = tasks.find(t => t.id === id);
    task.timeLeft = Math.max(0, task.timeLeft + minutes * 60);
    saveTasks();
    updateTaskList();
}

// Function to reset timer
function resetTimer(id) {
    const task = tasks.find(t => t.id === id);
    task.timeLeft = 25 * 60; // Reset to 25 minutes
    saveTasks();
    updateTaskList();
}

function completeTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        task.status = 'completed';
        task.completedTime = task.timeLeft > 0 ? 25 * 60 - task.timeLeft : 25 * 60;
        if (!task.statusLog) task.statusLog = [];
        task.statusLog.push({
            status: 'completed',
            timestamp: new Date().toISOString()
        });
        tasks.splice(taskIndex, 1);
        if (!completedTasks) completedTasks = [];
        completedTasks.push(task);
        saveTasks();
        saveCompletedTasks();
        updateTaskList();
        updateCompletedTasks();
    }
}

function postponeTask(id) {
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        task.status = 'postponed';
        if (!task.statusLog) task.statusLog = [];
        task.statusLog.push({
            status: 'postponed',
            timestamp: new Date().toISOString()
        });
        tasks.splice(taskIndex, 1);
        if (!postponedTasks) postponedTasks = [];
        postponedTasks.push(task);
        saveTasks();
        savePostponedTasks();
        updateTaskList();
        updatePostponedTasks();
    }
}

function saveCompletedTasks() {
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
}

function savePostponedTasks() {
    localStorage.setItem('postponedTasks', JSON.stringify(postponedTasks));
}

// Function to update completed tasks count
function updateCompletedTasks() {
    const completedTasksEl = document.querySelector('#completedTasks p');
    if (completedTasksEl) {
        completedTasksEl.textContent = completedTasks.length;
    }
}

// Function to update postponed tasks count
function updatePostponedTasks() {
    const postponedTasksEl = document.querySelector('#postponedTasks p');
    if (postponedTasksEl) {
        postponedTasksEl.textContent = postponedTasks.length;
    }
}

// Function to get end time
function getEndTime(seconds) {
    const now = new Date();
    const endTime = new Date(now.getTime() + seconds * 1000);
    return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initial update
updateTaskList();
updateCompletedTasks();
updatePostponedTasks();

// Добавьте эту новую функцию для обновления времени задачи
function updateTaskTime(id, newTime) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const [minutes, seconds] = newTime.split(':').map(Number);
        task.timeLeft = minutes * 60 + seconds;
        saveTasks();
        updateTaskList();
    }
}

function formatTimeInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 4) {
        value = value.slice(0, 4);
    }
    const minutes = value.slice(0, 2).padStart(2, '0');
    const seconds = value.slice(2).padStart(2, '0');
    input.value = `${minutes}:${seconds}`;
}

// Модальное окно
const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const modalTaskList = document.getElementById('modalTaskList');
const closeModal = document.getElementById('closeModal');

// Обработчики для открытия модального окна
document.getElementById('completedTasks').addEventListener('click', () => openTaskModal('completed'));
document.getElementById('postponedTasks').addEventListener('click', () => openTaskModal('postponed'));

// Функция для открытия модального окна
function openTaskModal(type) {
    const tasks = type === 'completed' ? completedTasks : postponedTasks;
    modalTitle.textContent = type === 'completed' ? 'Completed Tasks' : 'Postponed Tasks';
    modalTaskList.innerHTML = '';
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center';
        li.innerHTML = `
            <span>${task.name} (${formatTime(task.timeLeft)})</span>
            <button class="restartTask px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" data-id="${task.id}">
                Restart
            </button>
        `;
        modalTaskList.appendChild(li);
    });

    taskModal.classList.remove('hidden');
}

// Обработчик для закрытия модального окна
closeModal.addEventListener('click', () => {
    taskModal.classList.add('hidden');
});

// Обработчик для перезапуска задачи
modalTaskList.addEventListener('click', (e) => {
    if (e.target.classList.contains('restartTask')) {
        const taskId = parseInt(e.target.dataset.id);
        restartTask(taskId);
    }
});

// Функция для перезапуска задачи
function restartTask(id) {
    let task;
    let sourceArray;

    if (completedTasks.some(t => t.id === id)) {
        task = completedTasks.find(t => t.id === id);
        sourceArray = completedTasks;
    } else if (postponedTasks.some(t => t.id === id)) {
        task = postponedTasks.find(t => t.id === id);
        sourceArray = postponedTasks;
    }

    if (task) {
        task.status = 'active';
        tasks.push(task);
        sourceArray.splice(sourceArray.indexOf(task), 1);

        saveTasks();
        saveCompletedTasks();
        savePostponedTasks();
        updateTaskList();
        updateCompletedTasks();
        updatePostponedTasks();
        openTaskModal(sourceArray === completedTasks ? 'completed' : 'postponed');
    }
}

// Функция для форматирования времени в часах и минутах
function formatTimeHoursMinutes(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

// Функция для сброса локального хранилища
function resetLocalStorage() {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
        localStorage.clear();
        location.reload(); // Перезагружаем страницу для обновления данных
    }
}

// Добавляем обработчик для кнопки сброса локального хранилища
document.getElementById('resetStorage').addEventListener('click', resetLocalStorage);