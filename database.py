import sqlite3

conn = sqlite3.connect("finance.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    description TEXT,
    amount REAL,
    category TEXT
)
""")

conn.commit()

def insert_data(user, description, amount, category):
    cursor.execute(
        "INSERT INTO transactions (user, description, amount, category) VALUES (?, ?, ?, ?)",
        (user, description, amount, category)
    )
    conn.commit()