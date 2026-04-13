from pathlib import Path

from ml_utils import load_transactions, retrain_and_persist_model


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"


def main() -> None:
    transactions = load_transactions(DATA_PATH)
    model, accuracy, metrics = retrain_and_persist_model(MODEL_PATH, transactions)

    if model is None:
        print("Training failed: dataset is empty or invalid")
        return

    print(f"Model trained successfully. Accuracy: {accuracy:.4f}")
    print(
        "Macro metrics -> "
        f"Precision: {metrics.get('precision_macro', 0):.4f}, "
        f"Recall: {metrics.get('recall_macro', 0):.4f}, "
        f"F1: {metrics.get('f1_macro', 0):.4f}"
    )
    print(f"Saved model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
