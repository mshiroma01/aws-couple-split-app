import json
import boto3
import os
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from datetime import datetime

# Initialize S3 and DynamoDB clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('HashTable')  # Change this to your actual table name

# S3 bucket
BUCKET_NAME = 'couple-split-app-project'  # Change this to your actual bucket name

def lambda_handler(event, context):
    # Debug: Log the incoming event
    print(f"Event received: {json.dumps(event)}")
    
    # Handle preflight CORS (OPTIONS request)
    if event['httpMethod'] == 'OPTIONS':
        print("CORS preflight request")
        return generate_response(200, 'CORS preflight response', cors=True)

    # Extract user_id from query parameters
    user_id = event.get('queryStringParameters', {}).get('user_id')
    if not user_id:
        print("No user_id provided in request")
        return generate_response(400, 'user_id is required', cors=True)

    try:
        # List objects in the 'old_csv/' folder
        print(f"Listing objects in S3 bucket: {BUCKET_NAME}/old_csv/")
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix='old_csv/')
        
        if 'Contents' not in response:
            print("No contents found in 'old_csv/'")
            return generate_response(200, [], cors=True)
        
        # Convert datetime objects to strings before logging
        def convert_datetime_to_str(obj):
            """ Helper function to convert datetime objects in S3 metadata to strings. """
            if isinstance(obj, datetime):
                return obj.isoformat()  # Convert datetime to ISO format string
            raise TypeError("Object of type '%s' is not JSON serializable" % type(obj).__name__)

        # Log files while handling potential datetime objects
        print(f"Files found: {json.dumps(response['Contents'], default=convert_datetime_to_str)}")
        
        # Filter the CSV files based on user_id
        csv_files = filter_csv_files(response.get('Contents', []), user_id)

        # Debug: Log the result of the filtering
        print(f"Filtered CSV files for user {user_id}: {json.dumps(csv_files)}")
        
        return generate_response(200, csv_files, cors=True)

    except ClientError as e:
        print(f"Error interacting with S3 or DynamoDB: {str(e)}")
        return generate_response(500, f"Error listing files: {str(e)}", cors=True)


def filter_csv_files(contents, user_id):
    csv_files = []

    for obj in contents:
        file_key = obj['Key']
        if file_key.endswith('.csv'):
            # Extract the necessary parts from the filename
            file_key_parts = file_key.split('/')[-1].rsplit('-', 2)  # Split from the right

            mapping_config_name = file_key_parts[0]
            upload_date = file_key_parts[1]
            hash_value = file_key_parts[2].replace('.csv', '')

            # Debug: Log the hash value extracted
            print(f"Processing file with hash: {hash_value}")

            # Query DynamoDB to find the file associated with the correct user_id
            try:
                dynamo_response = table.query(KeyConditionExpression=Key('hash').eq(hash_value))

                # Debug: Log the response from DynamoDB
                print(f"DynamoDB response for hash {hash_value}: {json.dumps(dynamo_response)}")

                # Filter based on user_id
                if dynamo_response['Items'] and dynamo_response['Items'][0]['user_id'] == user_id:
                    item = dynamo_response['Items'][0]

                    # Generate pre-signed URL for download
                    presigned_url = s3.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': file_key},
                        ExpiresIn=3600  # URL expires in 1 hour
                    )

                    # Append relevant file info to the list
                    csv_files.append({
                        'file_name': file_key.split('/')[-1],
                        'mapping_config': item['mapping_config'],
                        'date_added': item.get('date_added', upload_date),  # Assuming date added in DynamoDB
                        'download_url': presigned_url
                    })
            except ClientError as e:
                print(f"Error querying DynamoDB for hash {hash_value}: {str(e)}")

    return csv_files


def generate_response(status_code, body, cors=False):
    headers = {
        'Content-Type': 'application/json',
    }
    if cors:
        headers.update({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        })

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body)
    }
