import streamlit as st
import pandas as pd

st.title("SmartSpend Analytics 📊")

data = {
    "Category": ["Food", "Transport", "Others"],
    "Amount": [5000, 2000, 1000]
}

df = pd.DataFrame(data)

st.bar_chart(df.set_index("Category"))