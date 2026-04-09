import sqlite3
import json

conn = sqlite3.connect("finance.db", check_same_thread=False)
cursor = conn.cursor()

# Flexible table
cursor.execute("""
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    raw_data TEXT
)
""")

conn.commit()

# Insert ANY dataset row
def insert_data(user, row_dict):
    json_data = json.dumps(row_dict)

    cursor.execute(
        "INSERT INTO transactions (user, raw_data) VALUES (?, ?)",
        (user, json_data)
    )

    conn.commit()

# Fetch all data
def fetch_all():
    cursor.execute("SELECT * FROM transactions")
    rows = cursor.fetchall()

    data = []
    for r in rows:
        try:
            if not r[2]:  # skip empty
                continue

            parsed = json.loads(r[2])

            parsed["ID"] = r[0]
            parsed["User"] = r[1]

            data.append(parsed)

        except Exception:
            # skip corrupted rows
            continue

    return data