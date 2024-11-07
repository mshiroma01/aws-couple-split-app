import boto3
import pandas as pd
import io
import hashlib
from dynamodb_utils import store_hash_in_dynamodb, check_duplicate_hash, update_dynamodb_from_csv
from utils import rename_file, get_csv_file_from_s3
from mapping_configurations import mapping_configs

def calculate_hash(data):
    # Calculate MD5 hash
    hash = hashlib.md5(data).hexdigest()
    return hash

def lambda_handler(event, context):
    s3 = boto3.client("s3")

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        file_content = get_csv_file_from_s3(s3, bucket, key)

        # Calculate hash
        hash = calculate_hash(file_content)

        # Check if hash already exists in DynamoDB
        if not check_duplicate_hash('HashTable', hash):
            df_headers = pd.read_csv(io.BytesIO(file_content), nrows=1)
            header = df_headers.columns.tolist()
            
            if header == ['Description', 'Unnamed: 1', 'Summary Amt.']:
                header = ['Date', 'Description', 'Amount', 'Running Bal.']
                df = pd.read_csv(io.BytesIO(file_content), skiprows=8, header=None, names=header)
            else:
                df = pd.read_csv(io.BytesIO(file_content))
                header = df.columns.tolist()  # Update header after reading the CSV

            # Initialize variables to keep track of the best match
            best_match = None
            max_matched_columns = 0

            for format_name, config in mapping_configs.items():
                # Get the required columns for this configuration
                required_cols = set(col for key, col in config.items() if key not in ['name', 'date_format'])
                # Check if all required columns are present in the header
                if required_cols.issubset(header):
                    matched_columns = len(required_cols)
                    # Prioritize configurations with more matched columns
                    if matched_columns > max_matched_columns:
                        best_match = config
                        max_matched_columns = matched_columns

            # Assign the best matching configuration
            if best_match:
                mapping_config = best_match
                update_dynamodb_from_csv(df, mapping_config, key)
                new_key = rename_file(key, mapping_config, hash)
                s3.copy_object(Bucket=bucket, Key=f'old_csv/{new_key}', CopySource=f'{bucket}/{key}')
                s3.delete_object(Bucket=bucket, Key=key)
                # Store the hash and date in DynamoDB
                store_hash_in_dynamodb('HashTable', hash, key, mapping_config['name'])
            else:
                print(f'No matching mapping configuration found for CSV file: {key}')
        else:
            print(f"File with hash '{hash}' has already been processed. Skipping further processing.")
            s3.delete_object(Bucket=bucket, Key=key)
            
    return {
        'statusCode': 200,
        'body': 'Successfully processed the S3 event'
    }
