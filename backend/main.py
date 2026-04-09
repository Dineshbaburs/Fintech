from fastapi import FastAPI, UploadFile
import pandas as pd

app = FastAPI()

# Simple rule-based classifier
def classify(desc):
    desc = desc.lower()
    if "swiggy" in desc:
        return "Food"
    if "uber" in desc:
        return "Transport"
    return "Others"

@app.get("/")
def home():
    return {"message": "Backend Running 🚀"}

@app.post("/predict")
def predict(data: dict):
    desc = data["description"]
    return {"category": classify(desc)}

@app.post("/upload")
async def upload(file: UploadFile):
    df = pd.read_csv(file.file)
    return {"columns": list(df.columns)}