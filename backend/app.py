from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = sqlite3.connect('tasks.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            created_by TEXT NOT NULL,
            date_assigned TEXT NOT NULL,
            due_date TEXT NOT NULL
        )
    ''')
    
    # Initial dummy data setup
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM tasks')
    if cursor.fetchone()[0] == 0:
        sample_tasks = [
            ("New test task title", "High", "In progress", "Maia", "29/07/2023", "28/04/2023"),
            ("New test task title", "High", "Completed", "Maia Burjanadze", "23/09/2023", "24/07/2023"),
            ("New test task title", "High", "In progress", "Maia", "29/07/2023", "28/04/2023"),
            ("New test task title", "High", "In progress", "Maia", "29/07/2023", "28/04/2023")
        ]
        cursor.executemany('''
            INSERT INTO tasks (title, priority, status, created_by, date_assigned, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_tasks)
        conn.commit()
    conn.close()

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db_connection()
    tasks = conn.execute('SELECT * FROM tasks').fetchall()
    conn.close()
    return jsonify([dict(task) for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (title, priority, status, created_by, date_assigned, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', 'New test task title'),
        data.get('priority', 'High'),
        data.get('status', 'In progress'),
        data.get('created_by', 'Maia'),
        data.get('date_assigned', '29/07/2023'),
        data.get('due_date', '28/04/2023')
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({"id": new_id, "message": "Task created successfully"}), 201

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)