from flask import Flask, render_template, request, jsonify
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "Frontend"
DB_PATH = BASE_DIR / "tasks.db"

app = Flask(
    __name__,
    template_folder=str(FRONTEND_DIR),
    static_folder=str(FRONTEND_DIR),
    static_url_path="/static"
)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'Medium',
                due_date TEXT DEFAULT '',
                completed INTEGER NOT NULL DEFAULT 0
            )
        """)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY id DESC"
        ).fetchall()
    return jsonify([dict(row) for row in rows])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    priority = data.get("priority", "Medium")
    due_date = data.get("due_date", "")

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    if priority not in ["Low", "Medium", "High"]:
        priority = "Medium"

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)",
            (title, priority, due_date)
        )
        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()

    return jsonify(dict(row)), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    priority = data.get("priority", "Medium")
    due_date = data.get("due_date", "")

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    if priority not in ["Low", "Medium", "High"]:
        priority = "Medium"

    with get_db() as conn:
        cursor = conn.execute(
            """UPDATE tasks
               SET title = ?, priority = ?, due_date = ?
               WHERE id = ?""",
            (title, priority, due_date, task_id)
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found"}), 404

        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

    return jsonify(dict(row))


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def patch_task(task_id):
    data = request.get_json(silent=True) or {}

    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

        if row is None:
            return jsonify({"error": "Task not found"}), 404

        completed = data.get("completed", bool(row["completed"]))
        if not isinstance(completed, bool):
            return jsonify({"error": "Invalid completed value"}), 400

        conn.execute(
            "UPDATE tasks SET completed = ? WHERE id = ?",
            (int(completed), task_id)
        )
        updated = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

    return jsonify(dict(updated))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM tasks WHERE id = ?", (task_id,)
        )
        if cursor.rowcount == 0:
            return jsonify({"error": "Task not found"}), 404

    return jsonify({"message": "Task deleted"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)