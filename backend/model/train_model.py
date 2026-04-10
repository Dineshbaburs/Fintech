from pathlib import Path

from ml_utils import load_transactions, retrain_and_persist_model


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"


def main() -> None:
    transactions = load_transactions(DATA_PATH)
    model, accuracy = retrain_and_persist_model(MODEL_PATH, transactions)

    if model is None:
        print("Training failed: dataset is empty or invalid")
        return

    print(f"Model trained successfully. Accuracy: {accuracy:.4f}")
    print(f"Saved model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
