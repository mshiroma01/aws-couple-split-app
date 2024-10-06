import json
import boto3
import logging

# Initialize logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize S3 client
s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        # Log the event
        logger.info(f"Received event: {json.dumps(event)}")

        # Handle preflight CORS (OPTIONS request)
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',  # Allow all origins, or set to specific domains
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': 'CORS preflight response'
            }

        # Process POST request (upload file)
        body = json.loads(event['body'])
        file_name = body['file_name']
        user_id = body['user_id']

        # S3 bucket where the file will be uploaded
        bucket_name = 'couple-split-app-project'

        # New filename with the user_id prepended
        new_file_name = f"{user_id}_{file_name}"
        destination_key = f"input_csv/{new_file_name}"

        # Assuming the file content is also passed in the body (adjust based on actual file handling)
        file_content = body['file_content']  # For example, Base64-encoded file content

        # Upload the file directly to S3 with the new name
        s3.put_object(
            Bucket=bucket_name,
            Key=destination_key,
            Body=file_content,
            ContentType='text/csv'
        )

        # Respond with success and CORS headers
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*', 
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(f"File successfully uploaded as {new_file_name}")
        }

    except Exception as e:
        logger.error(f"Error processing CSV file: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(f"Error processing CSV file: {str(e)}")
        }
