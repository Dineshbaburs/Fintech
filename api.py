from fastapi import FastAPI
from database import insert_data, fetch_all

app = FastAPI()

@app.get("/")
def home():
    return {"message": "API running"}

# Insert flexible data
@app.post("/add/")
def add_transaction(user: str, data: dict):
    insert_data(user, data)
    return {"status": "stored"}

# Get all data
@app.get("/transactions/")
def get_transactions():
    return {"data": fetch_all()}