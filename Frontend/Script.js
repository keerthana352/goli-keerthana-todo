const taskForm = document.getElementById("taskForm");
const taskFormPanel = document.getElementById("taskFormPanel");
const taskTableBody = document.getElementById("taskTableBody");
const taskTitle = document.getElementById("taskTitle");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");
const searchInput = document.getElementById("searchInput");
const message = document.getElementById("message");
const emptyState = document.getElementById("emptyState");
const pageSize = document.getElementById("pageSize");

let tasks = [];
let currentPage = 1;
let editingId = null;

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function todayString() {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

function formatDate(dateString) {
    if (!dateString) return "—";

    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadTasks() {
    try {
        tasks = await api("/api/tasks");
        renderTasks();
    } catch (error) {
        message.textContent =
            "Could not load tasks. Check whether Flask is running.";
    }
}

function getFilteredTasks() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedDate = dateFilter.value;

    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search);

        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "pending" && !task.completed) ||
            (selectedStatus === "completed" && Boolean(task.completed));

        const matchesDate =
            !selectedDate || task.due_date === selectedDate;

        return matchesSearch && matchesStatus && matchesDate;
    });
}

function renderTasks() {
    const filteredTasks = getFilteredTasks();
    const perPage = Number(pageSize.value);
    const total = filteredTasks.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * perPage;
    const visibleTasks = filteredTasks.slice(start, start + perPage);

    taskTableBody.replaceChildren();
    emptyState.classList.toggle("hidden", total !== 0);

    visibleTasks.forEach(task => {
        const row = document.createElement("tr");
        const statusClass = task.completed ? "completed" : "pending";
        const statusText = task.completed ? "Completed" : "In progress";

        row.innerHTML = `
            <td>${escapeText(task.title)}</td>
            <td>
                <span class="priority-badge ${escapeText(task.priority)}">
                    ${escapeText(task.priority)}
                </span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>You</td>
            <td>${formatDate(todayString())}</td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn"
                        data-action="toggle" data-id="${task.id}"
                        title="Change task status">
                        ${task.completed ? "↶" : "☑"}
                    </button>
                    <button class="action-btn edit"
                        data-action="edit" data-id="${task.id}"
                        title="Edit task">✎</button>
                    <button class="action-btn delete"
                        data-action="delete" data-id="${task.id}"
                        title="Delete task">▤</button>
                    <button class="action-btn more"
                        data-action="more" data-id="${task.id}"
                        title="More options">⋮</button>
                </div>
            </td>
        `;

        taskTableBody.appendChild(row);
    });

    const firstItem = total === 0 ? 0 : start + 1;
    const lastItem = Math.min(start + perPage, total);

    document.getElementById("pageInfo").textContent =
        `${firstItem}-${lastItem} of ${total}`;

    document.getElementById("prevPage").disabled = currentPage <= 1;
    document.getElementById("nextPage").disabled =
        currentPage >= totalPages;
}

document.getElementById("createButton").addEventListener("click", () => {
    resetForm();
    taskFormPanel.classList.remove("hidden");
    taskTitle.focus();
});

document.getElementById("cancelButton").addEventListener("click", () => {
    resetForm();
    taskFormPanel.classList.add("hidden");
    message.textContent = "";
});

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskTitle.value.trim();

    if (!title) {
        message.textContent = "Please enter a task title.";
        return;
    }

    const taskData = {
        title,
        priority: priorityInput.value,
        due_date: dueDateInput.value
    };

    try {
        if (editingId !== null) {
            await api(`/api/tasks/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(taskData)
            });
            message.textContent = "Task updated successfully!";
        } else {
            await api("/api/tasks", {
                method: "POST",
                body: JSON.stringify(taskData)
            });
            message.textContent = "Task created successfully!";
        }

        resetForm();
        taskFormPanel.classList.add("hidden");
        currentPage = 1;
        await loadTasks();
    } catch (error) {
        message.textContent = error.message;
    }
});

function resetForm() {
    editingId = null;
    taskForm.reset();
    priorityInput.value = "Medium";
    document.getElementById("formHeading").textContent = "Create New Task";
    document.getElementById("submitButton").textContent = "Save Task";
}

taskTableBody.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    const action = button.dataset.action;

    try {
        if (action === "edit") {
            editingId = task.id;
            taskTitle.value = task.title;
            priorityInput.value = task.priority;
            dueDateInput.value = task.due_date || "";

            document.getElementById("formHeading").textContent = "Edit Task";
            document.getElementById("submitButton").textContent = "Save Changes";
            taskFormPanel.classList.remove("hidden");
            taskTitle.focus();
            taskFormPanel.scrollIntoView({ behavior: "smooth" });
        }

        if (action === "toggle") {
            await api(`/api/tasks/${id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    completed: !Boolean(task.completed)
                })
            });

            message.textContent = "Task status updated.";
            await loadTasks();
        }

        if (action === "delete") {
            if (!confirm(`Delete "${task.title}"?`)) return;

            await api(`/api/tasks/${id}`, { method: "DELETE" });
            message.textContent = "Task deleted.";
            await loadTasks();
        }

        if (action === "more") {
            alert(
                `Task: ${task.title}\n` +
                `Priority: ${task.priority}\n` +
                `Status: ${task.completed ? "Completed" : "In progress"}`
            );
        }
    } catch (error) {
        message.textContent = error.message;
    }
});

document.getElementById("filterButton").addEventListener("click", () => {
    currentPage = 1;
    renderTasks();
});

searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTasks();
});

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => {
            item.classList.toggle("active", item === tab);
        });

        // These tabs currently change the selected tab appearance.
        // The existing database does not store separate task categories.
    });
});

pageSize.addEventListener("change", () => {
    currentPage = 1;
    renderTasks();
});

document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderTasks();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.max(
        1,
        Math.ceil(getFilteredTasks().length / Number(pageSize.value))
    );

    if (currentPage < totalPages) {
        currentPage++;
        renderTasks();
    }
});

document.getElementById("focusSearch").addEventListener("click", () => {
    searchInput.focus();
});

statusFilter.addEventListener("change", () => {
    currentPage = 1;
    renderTasks();
});

dateFilter.addEventListener("change", () => {
    currentPage = 1;
    renderTasks();
});

loadTasks();