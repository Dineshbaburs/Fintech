def clean_data(df):
    df['Description'] = df['Description'].astype(str).str.lower()
    df['Description'] = df['Description'].str.replace('[^a-z ]', '', regex=True)
    return df