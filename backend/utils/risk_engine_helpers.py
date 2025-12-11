import pandas as pd
import numpy as np
from utils.quarter import get_quarter
from utils.season_detect import classify_festival_date

def calculate_row_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculates row-level metrics based on the Pos Malaysia survey structure (Q1-Q15),
    grouping questions into Dimensions and calculating Risk/Stress levels.
    """
    data = df.copy()

    # ---------------------------------------------------------
    # 1. MAP QUESTIONS TO DIMENSIONS (Based on Image)
    # ---------------------------------------------------------
    # We assume column names start with 'Q' followed by the number (e.g., 'Q1', 'Q1_Recommend')
    # If your CSV uses different names, ensure they contain 'Q1_', 'Q2_', etc.
    
    dimension_map = {
        'Dim_Employee_Engagement': [1, 9],    # Q1: Recommend, Q9: Proud to work
        'Dim_Leadership':          [2, 10],   # Q2: Feedback, Q10: Informed
        'Dim_Enablement':          [3, 11],   # Q3: Resources, Q11: Systems/Processes
        'Dim_Development':         [4, 12],   # Q4: Career Interest, Q12: Opportunities
        'Dim_Delight_Customer':    [5, 13],   # Q5: Quality, Q13: Service
        'Dim_Company_Confidence':  [6, 14],   # Q6: Trust Mgmt, Q14: Future Success
        'Dim_Culture_Values':      [7, 15],   # Q7: Diversity, Q15: Respect
        'Dim_ESG':                 [8]        # Q8: Community/Give-back
    }

    # Helper function to find actual column name for a question number
    def get_col(q_num):
        # Looks for columns starting with "Q1_" or exact match "Q1" or "Q01"
        candidates = [c for c in data.columns if c.startswith(f"Q{q_num}_") or c == f"Q{q_num}"]
        return candidates[0] if candidates else None

    # Calculate Score for each Dimension (Average of relevant questions)
    for dim_name, q_nums in dimension_map.items():
        cols = [get_col(n) for n in q_nums]
        cols = [c for c in cols if c is not None] # Filter missing columns
        
        if cols:
            # Calculate mean of these columns row-by-row
            data[dim_name] = data[cols].mean(axis=1).round(2)
        else:
            data[dim_name] = None

    # ---------------------------------------------------------
    # 2. CALCULATE DERIVED RISK METRICS
    # ---------------------------------------------------------

    # --- A. Stress Level ---
    # Logic: Stress is high when Enablement is Low (no tools) and Culture is Low (no respect).
    # Formula: Inverse of Average(Enablement Score + Culture Score)
    # Scale: 1 (Low Stress) to 5 (High Stress)
    if 'Dim_Enablement' in data.columns and 'Dim_Culture_Values' in data.columns:
        # We average the "Good" scores
        support_score = (data['Dim_Enablement'] + data['Dim_Culture_Values']) / 2
        # Invert it: 6 - Score (Assuming 1-5 scale)
        data['Stress_Score'] = (6 - support_score).round(2)
        # Convert to % for reporting
        data['stress_rate'] = ((data['Stress_Score'] - 1) / 4 * 100).clip(0, 100).round(1)
    else:
        data['Stress_Score'] = None
        data['stress_rate'] = None

    # --- B. Engagement Rate ---
    # Using the specific Employee Engagement dimension
    if 'Dim_Employee_Engagement' in data.columns:
        # Convert 1-5 scale to 0-100%
        # Formula: ((Score - 1) / 4) * 100  -> Maps 1 to 0% and 5 to 100%
        # Alternatively simple multiplication x20 if strict 0-5 assumption, but standard Likert is (x-1)/4
        data['engagement_rate'] = ((data['Dim_Employee_Engagement'] - 1) / 4 * 100).clip(0, 100).round(1)
    else:
        data['engagement_rate'] = None

    # --- C. Attrition/Turnover Risk ---
    # Logic: High Risk if Engagement is Low AND Development is Low
    q1_col = get_col(1)
    q12_col = get_col(12)
    
    if q1_col and q12_col:
        # Numeric Probability of Attrition (Inverse of Engagement + Development)
        # If Eng=1 and Dev=1, Retention Score is 1. Attrition Risk is High (5).
        retention_driver = (data[q1_col] + data[q12_col]) / 2
        attrition_score = 6 - retention_driver
        data['attrition_rate'] = ((attrition_score - 1) / 4 * 100).clip(0, 100).round(1)
        
        # Labels
        conditions = [
            (data['attrition_rate'] >= 75), # High Risk
            (data['attrition_rate'] >= 50)  # Medium Risk
        ]
        choices = ['High', 'Medium']
        data['Turnover_Risk_Label'] = np.select(conditions, choices, default='Low')
    else:
        data['attrition_rate'] = None

    # ---------------------------------------------------------
    # 3. TEMPORAL FIELDS (Quarter, Season, etc)
    # ---------------------------------------------------------
    date_col = 'submission_date' if 'submission_date' in data.columns else 'Submission_Date'
    
    if date_col in data.columns:
        def safe_quarter(d):
            try: return get_quarter(str(d))
            except: return None
        
        def safe_season(d):
            try: 
                res = classify_festival_date(str(d))
                return ", ".join(res) if isinstance(res, list) else str(res)
            except: return "normal day"

        data['quarter'] = data[date_col].apply(lambda x: safe_quarter(x) if pd.notna(x) else None)
        data['event_season'] = data[date_col].apply(lambda x: safe_season(x) if pd.notna(x) else "normal day")
        
        try:
            dt_series = pd.to_datetime(data[date_col], errors='coerce')
            data['month'] = dt_series.dt.month_name()
            data['year'] = dt_series.dt.year
        except:
            data['month'] = None
            data['year'] = None
    else:
        for c in ['quarter', 'event_season', 'month', 'year']:
            data[c] = None

    return data

import pandas as pd
import numpy as np
from decimal import Decimal

def calculate_survey_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes raw survey data, calculates Dimensions and Risk Metrics.
    Returns a DataFrame with one row per survey submission.
    """
    data = df.copy()
    
    # 1. Handle Column Name Normalization
    # The prompt mentioned a typo 'mployee_id' in survey data
    if 'mployee_id' in data.columns:
        data.rename(columns={'mployee_id': 'employee_id'}, inplace=True)
    if 'Employee_ID' in data.columns:
        data.rename(columns={'Employee_ID': 'employee_id'}, inplace=True)

    # 2. Dimension Mapping (Based on the 15-question structure provided previously)
    # Questions: Q1-Q15. 
    dimension_map = {
        'Dim_Employee_Engagement': ['Q1_Recommend', 'Q9_Proud_Work'],
        'Dim_Leadership':          ['Q2_Sup_Feedback', 'Q10_Sup_Informed'],
        'Dim_Enablement':          ['Q3_Enablement_Tools', 'Q11_Systems_Process'],
        'Dim_Development':         ['Q4_Sup_Career_Interest', 'Q12_Career_Opp'],
        'Dim_Delight_Customer':    ['Q5_Quality_Services', 'Q13_Great_Service'],
        'Dim_Company_Confidence':  ['Q6_Trust_Top_Mgmt', 'Q14_Future_Success'],
        'Dim_Culture_Values':      ['Q7_Diversity_Inclusion', 'Q15_Respect'],
        'Dim_ESG':                 ['Q8_ESG_Community']
    }

    # Helper to find columns loosely (in case names vary slightly)
    def get_col_val(row, potential_names):
        for name in potential_names:
            # Check if column exists strictly or via prefix
            matching = [c for c in row.index if name in c]
            if matching:
                return row[matching[0]]
        return np.nan

    # Calculate Dimensions
    for dim, queries in dimension_map.items():
        # We process this row by row or vectorized. Vectorized is safer for col existence.
        relevant_cols = []
        for q in queries:
            # Find the actual column name in the DF that matches the partial string
            match = [c for c in data.columns if q in c or c.startswith(q.split('_')[0])]
            if match:
                relevant_cols.append(match[0])
        
        if relevant_cols:
            data[dim] = data[relevant_cols].mean(axis=1).round(2)
        else:
            data[dim] = 0.0

    # 3. Calculate Risk Rates (0-100 scale)
    
    # Engagement Rate (Based on Dimension)
    if 'Dim_Employee_Engagement' in data.columns:
        data['engagement_rate'] = ((data['Dim_Employee_Engagement'] - 1) / 4 * 100).clip(0, 100).round(1)
    
    # Stress Rate (Inverse of Enablement + Culture)
    if 'Dim_Enablement' in data.columns and 'Dim_Culture_Values' in data.columns:
        avg_support = (data['Dim_Enablement'] + data['Dim_Culture_Values']) / 2
        data['Stress_Score'] = (6 - avg_support) # High score = High stress
        data['stress_rate'] = ((data['Stress_Score'] - 1) / 4 * 100).clip(0, 100).round(1)
        
    # Attrition Rate (Inverse of Engagement + Career Opps)
    # Using specific cols Q1 and Q12 if possible, else dimensions
    try:
        # Find Q1 and Q12 cols
        q1 = [c for c in data.columns if 'Q1_' in c or c=='Q1'][0]
        q12 = [c for c in data.columns if 'Q12_' in c or c=='Q12'][0]
        retention = (data[q1] + data[q12]) / 2
        data['attrition_rate'] = (( (6-retention) - 1) / 4 * 100).clip(0, 100).round(1)
    except:
        data['attrition_rate'] = 0.0

    return data