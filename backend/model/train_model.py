import os
import pandas as pd
import pickle

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Get current file location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Build correct paths
data_path = os.path.join(BASE_DIR, "..", "..", "data", "transactions.csv")
model_path = os.path.join(BASE_DIR, "..", "..", "models", "model.pkl")

# Load dataset
df = pd.read_csv(data_path)

# Features & labels
X = df["description"].str.lower()
y = df["category"]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Model pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1,2))),
    ("clf", LogisticRegression(max_iter=200))
])

# Train
model.fit(X_train, y_train)

# Accuracy
accuracy = model.score(X_test, y_test)
print("Model Accuracy:", accuracy)

# Save model
os.makedirs(os.path.dirname(model_path), exist_ok=True)

with open(model_path, "wb") as f:
    pickle.dump(model, f)