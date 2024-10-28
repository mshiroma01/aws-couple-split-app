import json
import boto3
import decimal
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SplitTable')  # Update with your actual table name

# Helper function to convert Decimal to JSON serializable
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            # Convert to float if the number is not an integer
            if obj % 1:
                return float(obj)
            else:
                return int(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    # Handle preflight CORS (OPTIONS request)
    if event['httpMethod'] == 'OPTIONS':
        return generate_response(200, 'CORS preflight response', cors=True)

    # Extract user_id from query parameters
    user_id = event.get('queryStringParameters', {}).get('userid')
    if not user_id:
        return generate_response(400, 'userid is required', cors=True)

    try:
        # Query DynamoDB for rows matching the user_id
        response = table.query(
            KeyConditionExpression=Key('userid').eq(user_id)
        )

        items = response.get('Items', [])
        return generate_response(200, items, cors=True)

    except ClientError as e:
        print(f"Error: {e}")
        return generate_response(500, f"Error querying table: {str(e)}", cors=True)

def generate_response(status_code, body, cors=False):
    headers = {
        'Content-Type': 'application/json',
    }
    if cors:
        headers.update({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        })

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, cls=DecimalEncoder)  # Use the DecimalEncoder here
    }
