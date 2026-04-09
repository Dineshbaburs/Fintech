from fastapi import FastAPI
from database import insert_data, cursor

app = FastAPI()

@app.get("/")
def home():
    return {"message": "FinTech API Running"}

@app.post("/add/")
def add_transaction(user: str, description: str, amount: float, category: str):
    insert_data(user, description, amount, category)
    return {"status": "stored"}

@app.get("/transactions/")
def get_transactions():
    cursor.execute("SELECT * FROM transactions")
    data = cursor.fetchall()
    return {"data": data}