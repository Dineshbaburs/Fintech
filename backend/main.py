from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import pickle

app = FastAPI()

# ✅ CORS (IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
with open("../models/model.pkl", "rb") as f:
    model = pickle.load(f)

def rule_based(desc):
    desc = desc.lower()
    if "swiggy" in desc:
        return "Food"
    if "uber" in desc:
        return "Transport"
    return None

@app.post("/predict")
def predict(data: dict):
    desc = data["description"]

    rule = rule_based(desc)
    if rule:
        return {"category": rule}

    pred = model.predict([desc])[0]
    return {"category": pred}

@app.post("/bulk_predict")
async def bulk_predict(file: UploadFile):
    df = pd.read_csv(file.file)

    df["predicted"] = df["description"].apply(
        lambda x: rule_based(x) if rule_based(x) else model.predict([x])[0]
    )

    return df.to_dict(orient="records")