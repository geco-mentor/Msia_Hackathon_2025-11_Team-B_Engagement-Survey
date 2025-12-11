import boto3
from dotenv import load_dotenv
import os
import pandas as pd
load_dotenv()

dynamo = boto3.client(
    "dynamodb",
    region_name=os.getenv("AWS_REGION")
)
