def categorize(text):
    if "swiggy" in text or "zomato" in text:
        return "Food"
    elif "uber" in text or "ola" in text:
        return "Transport"
    elif "amazon" in text or "flipkart" in text:
        return "Shopping"
    elif "netflix" in text:
        return "Entertainment"
    elif "rent" in text:
        return "Rent"
    else:
        return "Other"