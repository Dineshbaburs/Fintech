import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score


class TransactionModel:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.model = LogisticRegression(max_iter=1000)

    def train(self, df):
        X = df['Description'].fillna("")
        y = df['Category']
        X_vec = self.vectorizer.fit_transform(X)
        self.model.fit(X_vec, y)

    def predict(self, text_list):
        text_list = pd.Series(text_list).fillna("")
        X_vec = self.vectorizer.transform(text_list)
        return self.model.predict(X_vec)

    def predict_proba(self, text_list):
        text_list = pd.Series(text_list).fillna("")
        X_vec = self.vectorizer.transform(text_list)
        return self.model.predict_proba(X_vec)

    def evaluate(self, df):
        X = df['Description'].fillna("")
        y_true = df['Category']
        X_vec = self.vectorizer.transform(X)
        y_pred = self.model.predict(X_vec)
        return accuracy_score(y_true, y_pred)