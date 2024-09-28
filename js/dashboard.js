// Функция для переключения темного режима
function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}

// Обработчик для кнопки переключения темного режима
document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

// Функция для загрузки данных задач
function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
    const postponedTasks = JSON.parse(localStorage.getItem('postponedTasks')) || [];
    return { tasks, completedTasks, postponedTasks };
}

// Функция для обновления статистики
function updateStats(tasks, completedTasks, postponedTasks) {
    const totalTasksElement = document.getElementById('totalTasks');
    const completedTasksElement = document.getElementById('completedTasks');

    const totalTasks = tasks.length + completedTasks.length + postponedTasks.length;
    totalTasksElement.textContent = totalTasks;
    completedTasksElement.textContent = completedTasks.length;
}

// Функция для создания данных для диаграммы Ганта
function createGanttData(tasks, completedTasks, postponedTasks) {
    const allTasks = [...tasks, ...completedTasks, ...postponedTasks];
    return allTasks.map(task => {
        const startTime = task.statusLog && task.statusLog.length > 0
            ? new Date(task.statusLog[0].timestamp)
            : new Date(task.createdAt || Date.now());

        const taskData = {
            id: task.id.toString(),
            name: task.name,
            start: startTime,
            end: new Date(Math.max(startTime.getTime() + task.timeLeft * 1000, Date.now())),
            status: task.status || 'active',
            timeLeft: task.timeLeft || 0,
            statusChanges: task.statusLog || [],
            timeLog: task.timeLog || []
        };

        // Сортируем изменения статуса по времени
        taskData.statusChanges.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return taskData;
    });
}

// Функция для создания диаграммы Ганта
function createGanttChart(tasks) {
    const ganttElement = document.getElementById('gantt');
    ganttElement.innerHTML = '';

    if (tasks.length === 0) {
        ganttElement.innerHTML = '<p class="text-center py-4 text-sm">No tasks to display</p>';
        return;
    }

    const earliestStart = new Date(Math.min(...tasks.map(t => t.start.getTime())));
    const latestEnd = new Date(Math.max(...tasks.map(t => t.end.getTime()), new Date()));
    const totalDays = Math.ceil((latestEnd - earliestStart) / (1000 * 60 * 60 * 24)) + 1;

    const headerRow = document.createElement('div');
    headerRow.className = 'flex border-b dark:border-slate-700 overflow-x-auto';
    headerRow.innerHTML = `<div class="w-40 p-2 font-semibold text-sm sticky left-0 bg-white dark:bg-slate-800">Task Name</div>`;
    
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(earliestStart.getTime() + i * 24 * 60 * 60 * 1000);
        headerRow.innerHTML += `<div class="w-8 p-2 text-center text-xs">${date.getDate()}/${date.getMonth() + 1}</div>`;
    }
    ganttElement.appendChild(headerRow);

    tasks.forEach(task => {
        const taskRow = document.createElement('div');
        taskRow.className = 'flex items-center border-b dark:border-slate-700 overflow-x-auto';
        taskRow.innerHTML = `<div class="w-40 p-2 truncate sticky left-0 bg-white dark:bg-slate-800 text-sm" title="${task.name}">${task.name}</div>`;

        let currentStatus = 'created';
        let statusStartDay = 0;

        for (let i = 0; i < totalDays; i++) {
            const currentDate = new Date(earliestStart.getTime() + i * 24 * 60 * 60 * 1000);
            const cell = document.createElement('div');
            cell.className = `w-8 h-4 cursor-pointer`; // Изменено на h-4

            // Находим текущий статус для этой даты
            const currentStatusChange = task.statusChanges.find(change => 
                new Date(change.timestamp) <= currentDate && 
                (!task.statusChanges[task.statusChanges.indexOf(change) + 1] || 
                 new Date(task.statusChanges[task.statusChanges.indexOf(change) + 1].timestamp) > currentDate)
            );

            if (currentStatusChange) {
                currentStatus = currentStatusChange.status;
            }

            // Проверяем, была ли задача активна в этот день
            const wasActive = task.timeLog.some(log => 
                new Date(log.timestamp).toDateString() === currentDate.toDateString() && 
                log.action === 'start'
            );

            if (wasActive) {
                cell.classList.add(getStatusColor('active'));
            } else {
                cell.classList.add(getStatusColor(currentStatus));
            }

            cell.addEventListener('click', () => showTaskDetails(task, currentDate));
            taskRow.appendChild(cell);
        }

        ganttElement.appendChild(taskRow);
    });
}

// Функция для отображения деталей задачи
function showTaskDetails(task, date) {
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center';
    
    const statusOnDate = task.statusChanges.find(change => 
        new Date(change.timestamp) <= date && 
        (!task.statusChanges[task.statusChanges.indexOf(change) + 1] || 
         new Date(task.statusChanges[task.statusChanges.indexOf(change) + 1].timestamp) > date)
    );

    const wasActiveOnDate = task.timeLog.some(log => 
        new Date(log.timestamp).toDateString() === date.toDateString() && 
        log.action === 'start'
    );

    popup.innerHTML = `
        <div class="bg-white dark:bg-slate-800 p-6 rounded-md shadow-lg max-w-sm w-full">
            <h3 class="text-lg font-semibold mb-2">${task.name}</h3>
            <p class="text-sm"><strong>Date:</strong> ${date.toLocaleDateString()}</p>
            <p class="text-sm"><strong>Status:</strong> ${statusOnDate ? statusOnDate.status : 'Unknown'}</p>
            <p class="text-sm"><strong>Active on this day:</strong> ${wasActiveOnDate ? 'Yes' : 'No'}</p>
            <p class="text-sm"><strong>Time Left:</strong> ${formatTimeHoursMinutes(task.timeLeft)}</p>
            <p class="text-sm"><strong>Exact Time Left:</strong> ${formatTime(task.timeLeft)}</p>
            <button class="mt-4 px-4 py-1 bg-sky-500 text-white text-sm rounded-md hover:bg-sky-600">Close</button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    popup.querySelector('button').addEventListener('click', () => {
        document.body.removeChild(popup);
    });
}

// Функция для форматирования времени
function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
        return '00:00';  // Возвращаем значение по умолчанию, если seconds некорректно
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Функция для форматирования времени в часах и минутах
function formatTimeHoursMinutes(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours} h ${minutes} min`;
    } else {
        return `${minutes} min`;
    }
}

// Функция для получения цвета в зависимости от статуса задачи
function getStatusColor(status) {
    switch (status) {
        case 'created':
            return 'bg-gray-300';
        case 'active':
            return 'bg-blue-500';
        case 'completed':
            return 'bg-green-500';
        case 'postponed':
            return 'bg-yellow-500';
        default:
            return 'bg-gray-500';
    }
}

// Функция для сброса локального хранилища
function resetLocalStorage() {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
        localStorage.clear();
        location.reload(); // Перезагружаем страницу для обновления данных
    }
}

// Объявляем ganttData как глобальную переменную
let ganttData = [];

// Функция для создания мини-календаря
function createMiniCalendar(earliestDate, latestDate) {
    const calendarElement = document.getElementById('miniCalendar');
    calendarElement.className = 'flex items-center space-x-2 mb-4';
    
    const prevButton = document.createElement('button');
    prevButton.textContent = '←';
    prevButton.className = 'px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-sm';
    
    const nextButton = document.createElement('button');
    nextButton.textContent = '→';
    nextButton.className = 'px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-sm';
    
    const dateRange = document.createElement('span');
    dateRange.className = 'text-sm';
    
    calendarElement.appendChild(prevButton);
    calendarElement.appendChild(dateRange);
    calendarElement.appendChild(nextButton);
    
    let currentStartDate = new Date(earliestDate);
    let currentEndDate = new Date(currentStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 31 день
    
    function updateDateRange() {
        dateRange.textContent = `${currentStartDate.toLocaleDateString()} - ${currentEndDate.toLocaleDateString()}`;
        const filteredTasks = ganttData.filter(task => 
            (task.start >= currentStartDate && task.start <= currentEndDate) ||
            (task.end >= currentStartDate && task.end <= currentEndDate) ||
            (task.start <= currentStartDate && task.end >= currentEndDate)
        );
        createGanttChart(filteredTasks);
    }
    
    prevButton.addEventListener('click', () => {
        currentEndDate = new Date(currentStartDate.getTime() - 1000);
        currentStartDate = new Date(currentEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        updateDateRange();
    });
    
    nextButton.addEventListener('click', () => {
        currentStartDate = new Date(currentEndDate.getTime() + 1000);
        currentEndDate = new Date(currentStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        updateDateRange();
    });
    
    updateDateRange();
}

// Основная функция инициализации
function init() {
    const { tasks, completedTasks, postponedTasks } = loadTasks();
    updateStats(tasks, completedTasks, postponedTasks);
    ganttData = createGanttData(tasks, completedTasks, postponedTasks);
    
    const earliestDate = new Date(Math.min(...ganttData.map(t => t.start.getTime())));
    const latestDate = new Date(Math.max(...ganttData.map(t => t.end.getTime()), new Date()));
    
    createMiniCalendar(earliestDate, latestDate);
    
    // Обработчик для кнопки переключения темного режима
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Обработчик для кнопки сброса локального хранилища
    document.getElementById('resetStorage').addEventListener('click', resetLocalStorage);
}

// Вызов основной функции при загрузке страницы
document.addEventListener('DOMContentLoaded', init);