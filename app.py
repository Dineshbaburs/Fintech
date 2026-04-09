import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from ml_model import TransactionModel
from utils import clean_data
from sklearn.ensemble import IsolationForest

st.set_page_config(page_title="FinData Intelligence", layout="wide")

# -----------------------
# 🎨 KEEP YOUR UI SAME
# -----------------------
st.markdown("""
<style>
body {
    background-color: #0f172a;
}
.main {
    background-color: #0f172a;
    color: white;
}
.block-container {
    padding-top: 1rem;
    padding-bottom: 1rem;
}
.card {
    background: linear-gradient(135deg, #1e293b, #020617);
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    text-align: center;
}
.metric {
    font-size: 28px;
    font-weight: bold;
}
.subtext {
    color: #94a3b8;
}
.section {
    margin-top: 30px;
}
</style>
""", unsafe_allow_html=True)

st.title("💳 FinData Intelligence")

# -----------------------
# 🧠 LOAD MODEL
# -----------------------
@st.cache_resource
def load_model():
    df_train = pd.read_csv("training_data.csv")
    model = TransactionModel()
    model.train(df_train)
    return model

model = load_model()

# -----------------------
# 📊 DEFINE CATEGORIES
# -----------------------
categories = ["Food", "Transport", "Shopping", "Rent", "Utilities", "Entertainment"]

# -----------------------
# 📱 SIDEBAR
# -----------------------
st.sidebar.title("📱 Banking Menu")
page = st.sidebar.radio("Navigate", ["🏠 Home", "📊 Analytics", "📈 Insights", "🗄️ Database"])

# API Status
try:
    requests.get("http://127.0.0.1:8000/")
    st.sidebar.success("🟢 Backend Online")
except:
    st.sidebar.error("🔴 Backend Offline")

# Upload
st.sidebar.markdown("### 📂 Upload Data")
file = st.sidebar.file_uploader("Upload CSV", type=["csv"])

if file:
    df = pd.read_csv(file)
    df = clean_data(df)

    # -----------------------
    # ML CLASSIFICATION
    # -----------------------
    df['Category'] = model.predict(df['Description'])

    # Confidence score
    probs = model.predict_proba(df['Description'])
    df['Confidence'] = probs.max(axis=1)

    # -----------------------
    # FRAUD DETECTION
    # -----------------------
    iso = IsolationForest(contamination=0.1)
    df['Fraud'] = iso.fit_predict(df[['Amount']])
    df['Fraud'] = df['Fraud'].apply(lambda x: "⚠️" if x == -1 else "✅")

    st.session_state.df = df

# -----------------------
# 🏠 HOME
# -----------------------
if page == "🏠 Home":
    st.header("💳 Account Overview")

    if "df" in st.session_state:
        df = st.session_state.df

        col1, col2, col3 = st.columns(3)

        col1.markdown(f"""
        <div class="card">
            <div class="metric">₹ {df['Amount'].sum()}</div>
            <div class="subtext">Total Balance</div>
        </div>
        """, unsafe_allow_html=True)

        col2.markdown(f"""
        <div class="card">
            <div class="metric">₹ {round(df['Amount'].mean(),2)}</div>
            <div class="subtext">Avg Transaction</div>
        </div>
        """, unsafe_allow_html=True)

        col3.markdown(f"""
        <div class="card">
            <div class="metric">{len(df)}</div>
            <div class="subtext">Transactions</div>
        </div>
        """, unsafe_allow_html=True)

        # -----------------------
        # MODEL EVALUATION
        # -----------------------
        st.subheader("🧠 Model Accuracy")
        train_df = pd.read_csv("training_data.csv")
        accuracy = model.evaluate(train_df)
        st.success(f"Accuracy: {round(accuracy*100,2)}%")

    else:
        st.info("Upload your data from sidebar")

# -----------------------
# 📊 ANALYTICS
# -----------------------
elif page == "📊 Analytics":
    st.header("📊 Financial Analytics")

    if "df" in st.session_state:
        df = st.session_state.df

        fig1 = px.pie(df, names='Category', hole=0.4)
        st.plotly_chart(fig1, use_container_width=True)

        df['Date'] = pd.to_datetime(df['Date'])
        fig2 = px.line(df, x='Date', y='Amount')
        st.plotly_chart(fig2, use_container_width=True)

    else:
        st.warning("Upload data first")

# -----------------------
# 📈 INSIGHTS
# -----------------------
elif page == "📈 Insights":
    st.header("📈 Smart Insights")

    if "df" in st.session_state:
        df = st.session_state.df

        # Budget
        budget = st.slider("Set Budget", 1000, 20000, 5000)
        total = df['Amount'].sum()

        st.progress(min(total / budget, 1.0))

        if total > budget:
            st.error("⚠️ Budget exceeded!")
        else:
            st.success("✅ Within budget")

        # -----------------------
        # SAVINGS TIPS
        # -----------------------
        st.subheader("💡 Savings Tips")

        if df[df['Category']=="Food"]['Amount'].sum() > 3000:
            st.warning("Reduce food spending 🍔")

        if df['Category'].value_counts().idxmax() == "Shopping":
            st.info("Control shopping expenses 🛍️")

        if total > 10000:
            st.error("High monthly spending ⚠️")

        # -----------------------
        # SEARCH
        # -----------------------
        search = st.text_input("🔍 Search transactions")
        if search:
            st.dataframe(df[df['Description'].str.contains(search)])

        # -----------------------
        # ADVANCED INSIGHTS
        # -----------------------
        st.subheader("📈 Advanced Analysis")

        max_txn = df.loc[df['Amount'].idxmax()]
        st.write(f"Highest Expense: ₹{max_txn['Amount']} ({max_txn['Category']})")

        top_cat = df['Category'].value_counts().idxmax()
        st.write(f"Most Frequent Category: {top_cat}")

    else:
        st.warning("Upload data first")

# -----------------------
# 🗄️ DATABASE
# -----------------------
elif page == "🗄️ Database":
    st.header("🗄️ Stored Transactions")

    try:
        res = requests.get("http://127.0.0.1:8000/transactions/")
        data = res.json()['data']
        df_db = pd.DataFrame(data, columns=["ID","User","Desc","Amount","Category"])
        st.dataframe(df_db, use_container_width=True)
    except:
        st.error("API not running")

# -----------------------
# 🔐 ETHICS
# -----------------------
st.markdown("## 🔐 Data Privacy & Ethics")

st.write("""
- User data is processed locally and not shared externally.
- Financial data should be encrypted in real-world applications.
- ML predictions may contain bias due to limited training data.
- Users must have full control over their financial data.
""")