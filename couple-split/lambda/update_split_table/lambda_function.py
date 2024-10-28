import json
import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SplitTable')  # Replace with your actual table name

def lambda_handler(event, context):
    # Handle preflight CORS (OPTIONS request)
    if event['httpMethod'] == 'OPTIONS':
        return generate_response(200, 'CORS preflight response', cors=True)

    try:
        # Parse the request body
        body = json.loads(event['body'])
        
        if body.get('action') == 'delete':
            user_id = body.get('userid')
            category = body.get('category')
            # Delete the item from the table
            table.delete_item(
                Key={
                    'userid': user_id,
                    'category': category
                }
            )
            
        changes = body.get('changes', [])

        if not changes:
            return generate_response(400, 'No changes provided', cors=True)

        # Loop through all the changes and apply the appropriate action
        for change in changes:
            print(f"SplitTable: {change}")
            user_id = change.get('userid')
            category = change.get('category')
            need = change.get('need')
            split_percent = change.get('split_percent')
            action = change.get('action', 'update')  # Default to update

            if not all([user_id, category, need is not None, split_percent]):
                return generate_response(400, f'Missing required fields for {category}', cors=True)

            if action == 'add':
                # Check if the item already exists
                response = table.get_item(
                    Key={
                        'userid': user_id,
                        'category': category
                    }
                )
                if 'Item' not in response:
                    # If the item does not exist, add it
                    table.put_item(
                        Item={
                            'userid': user_id,
                            'category': category,
                            'need': need,
                            'split_percent': split_percent
                        }
                    )
                else:
                    return generate_response(200, 'Item already exists: user_id={user_id}, category={category}', cors=True)
            elif action == 'update':
                # Update the existing item or add a new one
                table.put_item(
                    Item={
                        'userid': user_id,
                        'category': category,
                        'need': need,
                        'split_percent': split_percent
                    }
                )

        return generate_response(200, 'All actions performed successfully', cors=True)
    
    except Exception as e:
        print(f"Error updating SplitTable: {e}")
        return generate_response(500, f"Error: {str(e)}", cors=True)

# Function to generate response with optional CORS headers
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
        'body': json.dumps(body)
    }
