import sys
import os

# Ensure backend is in path
sys.path.append(os.path.dirname(__file__))

from dynamo.fetch import fetch_survey_data

print("Fetching survey data to inspect columns...")
df = fetch_survey_data()
if not df.empty:
    print("Columns found in Survey_Response table:")
    print(df.columns.tolist())
    print("\nSample Data (first row):")
    print(df.iloc[0].to_dict())
else:
    print("No data found in Survey_Response table.")
