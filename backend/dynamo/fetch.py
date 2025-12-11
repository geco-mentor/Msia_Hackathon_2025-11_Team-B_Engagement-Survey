import boto3
import os
import pandas as pd
from decimal import Decimal
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables to ensure AWS credentials/region are set
load_dotenv()

def get_dynamodb_resource():
    """
    Initialize and return the DynamoDB resource.
    """
    return boto3.resource(
        "dynamodb",
        region_name=os.getenv("AWS_REGION", "us-east-1") 
    )

def decimal_to_float(obj: Any) -> Any:
    """
    Recursively convert Decimal objects to float/int for JSON serialization.
    """
    if isinstance(obj, list):
        return [decimal_to_float(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        # Return int if it's a whole number, else float
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    return obj

def fetch_all_items(table_name: str) -> List[Dict[str, Any]]:
    """
    Fetch all items from a DynamoDB table (Scan operation).
    Handles pagination automatically.
    
    Args:
        table_name (str): The name of the DynamoDB table.
        
    Returns:
        List[Dict[str, Any]]: List of all items in the table.
    """
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)
    
    try:
        response = table.scan()
        items = response.get('Items', [])
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
            
        # Convert Decimals to native Python types
        return decimal_to_float(items)
        
    except Exception as e:
        print(f"Error fetching all items from {table_name}: {e}")
        return []

def fetch_item(table_name: str, key: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Fetch a single item by Primary Key.
    
    Args:
        table_name (str): THe name of the DynamoDB table.
        key (Dict[str, Any]): The Primary Key (Partition Key + Sort Key if applicable).
                              Example: {'user_id': '123'}
                              
    Returns:
        Optional[Dict[str, Any]]: The item if found, else None.
    """
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)
    
    try:
        response = table.get_item(Key=key)
        item = response.get('Item')
        if item:
            return decimal_to_float(item)
        return None
        
    except Exception as e:
        print(f"Error fetching item from {table_name} with key {key}: {e}")
        return None

# Example usage function to fetch survey data specifically 
# (Based on user context of "metrics" and "survey")
def fetch_survey_data() -> pd.DataFrame:
    """
    Fetches data from the Survey_Response table and returns a Pandas DataFrame.
    """
    # Assuming the table name is 'Survey_Response' based on previous context, 
    # or 'PulseSurveyResponses' based on add_table.py comments.
    # Let's try 'Survey_Response' first as that's what risk_engine.py uses.
    table_name = "Survey_Response" 
    
    data = fetch_all_items(table_name)
    if not data:
        print(f"Warning: No data found in {table_name}")
        return pd.DataFrame()
        
    return pd.DataFrame(data)

if __name__ == "__main__":
    # Test execution
    print("Fetching generic survey data sample...")
    df = fetch_survey_data()
    print(f"Fetched {len(df)} records.")
    if not df.empty:
        print("Columns:", df.columns.tolist())
        print(df.head(2))
