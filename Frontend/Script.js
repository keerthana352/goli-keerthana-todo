const API_URL = 'http://127.0.0.1:5000/api/tasks';

document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();

    document.getElementById('createTaskBtn').addEventListener('click', () => {
        addNewTask();
    });
});

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        renderTable(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function renderTable(tasks) {
    const tableBody = document.getElementById('taskTableBody');
    tableBody.innerHTML = '';

    tasks.forEach(task => {
        const isCompleted = task.status.toLowerCase() === 'completed';
        const statusClass = isCompleted ? 'status-completed' : 'status-in-progress';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title}</td>
            <td><span class="badge-priority">${task.priority}</span></td>
            <td><span class="badge-status ${statusClass}">${task.status}</span></td>
            <td>${task.created_by}</td>
            <td>${task.date_assigned}</td>
            <td>${task.due_date}</td>
            <td>
                <div class="action-icons">
                    <i class="fa-regular fa-file-lines"></i>
                    <i class="fa-regular fa-pen-to-square"></i>
                    <i class="fa-regular fa-trash-can"></i>
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function addNewTask() {
    const newTask = {
        title: 'New test task title',
        priority: 'High',
        status: 'In progress',
        created_by: 'Maia',
        date_assigned: '29/07/2023',
        due_date: '28/04/2023'
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}