import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from ml_model import TransactionModel
from utils import clean_data
from sklearn.ensemble import IsolationForest

st.set_page_config(page_title="FinData Intelligence", layout="wide")

# -----------------------
# 🎨 PREMIUM COLORFUL UI
# -----------------------
st.markdown("""
<style>

/* Background */
body {
    background: linear-gradient(135deg, #0f172a, #020617);
}

/* Main */
.main {
    color: white;
}

/* Cards */
.card {
    background: linear-gradient(135deg, #1e3a8a, #0ea5e9);
    padding: 20px;
    border-radius: 18px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.5);
    text-align: center;
    transition: 0.3s;
}
.card:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #2563eb, #06b6d4);
}

/* Metrics */
.metric {
    font-size: 30px;
    font-weight: bold;
}
.subtext {
    font-size: 14px;
    opacity: 0.8;
}

/* Sidebar */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #020617, #1e293b);
}

/* Buttons */
.stButton>button {
    background: linear-gradient(90deg, #22c55e, #16a34a);
    color: white;
    border-radius: 10px;
}

/* Progress */
.stProgress > div > div {
    background-color: #22c55e;
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
# 📱 SIDEBAR
# -----------------------
st.sidebar.title("📱 Banking Menu")
page = st.sidebar.radio("Navigate", ["🏠 Home", "📊 Analytics", "📈 Insights", "🗄️ Database"])

# -----------------------
# API STATUS
# -----------------------
try:
    res = requests.get("http://127.0.0.1:8000/", timeout=2)
    if res.status_code == 200:
        st.sidebar.success("🟢 Backend Online")
    else:
        st.sidebar.error("🔴 Backend Error")
except:
    st.sidebar.error("🔴 Backend Offline")

# -----------------------
# 📂 UPLOAD
# -----------------------
st.sidebar.markdown("### 📂 Upload Data")
file = st.sidebar.file_uploader("Upload CSV", type=["csv"])

if file:
    df = pd.read_csv(file)
    df = clean_data(df)

    # ML
    df['Category'] = model.predict(df['Description'])
    probs = model.predict_proba(df['Description'])
    df['Confidence'] = probs.max(axis=1)

    # Fraud
    iso = IsolationForest(contamination=0.1)
    df['Fraud'] = iso.fit_predict(df[['Amount']])
    df['Fraud'] = df['Fraud'].apply(lambda x: "⚠️" if x == -1 else "✅")

    # Store in DB
    try:
        for i in range(len(df)):
            row_dict = df.iloc[i].to_dict()

            requests.post(
                "http://127.0.0.1:8000/add/",
                params={"user": "default"},
                json={"data": row_dict}
            )
    except:
        st.warning("⚠️ API not running")

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
            <div class="subtext">Total Spending</div>
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

        # Accuracy
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

        fig1 = px.pie(
            df,
            names='Category',
            hole=0.5,
            color_discrete_sequence=px.colors.sequential.Tealgrn
        )
        st.plotly_chart(fig1, width="stretch")

        df['Date'] = pd.to_datetime(df['Date'])
        fig2 = px.line(
            df,
            x='Date',
            y='Amount',
            markers=True,
            color_discrete_sequence=['#22c55e']
        )
        st.plotly_chart(fig2, width="stretch")

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

        # Tips
        st.subheader("💡 Savings Tips")

        if df[df['Category']=="Food"]['Amount'].sum() > 3000:
            st.warning("Reduce food spending 🍔")

        if df['Category'].value_counts().idxmax() == "Shopping":
            st.info("Control shopping expenses 🛍️")

        if total > 10000:
            st.error("High monthly spending ⚠️")

        # Search
        search = st.text_input("🔍 Search transactions")
        if search:
            st.dataframe(df[df['Description'].str.contains(search)], width="stretch")

        # Advanced
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

        df_db = pd.DataFrame(data)
        st.dataframe(df_db, width="stretch")

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