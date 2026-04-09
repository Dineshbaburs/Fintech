import pandas as pd

def clean_data(df):
    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # -----------------------
    # SMART COLUMN DETECTION (PARTIAL MATCH)
    # -----------------------
    desc_col = None
    amount_col = None
    date_col = None

    for col in df.columns:
        if any(x in col for x in ['description', 'product', 'merchant', 'narration']):
            desc_col = col

        if any(x in col for x in ['amount', 'value']):
            amount_col = col

        if 'date' in col:
            date_col = col

    # -----------------------
    # VALIDATION
    # -----------------------
    if desc_col is None:
        raise ValueError(f"❌ No description column found.\nColumns: {list(df.columns)}")

    if amount_col is None:
        raise ValueError(f"❌ No amount column found.\nColumns: {list(df.columns)}")

    # -----------------------
    # RENAME TO STANDARD
    # -----------------------
    df = df.rename(columns={
        desc_col: 'Description',
        amount_col: 'Amount'
    })

    if date_col:
        df = df.rename(columns={date_col: 'Date'})
    else:
        df['Date'] = pd.Timestamp.today()

    # -----------------------
    # CLEAN DATA
    # -----------------------
    df['Description'] = df['Description'].astype(str).str.lower()
    df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce').fillna(0)

    return df