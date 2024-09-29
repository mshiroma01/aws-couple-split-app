import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TransactionSplitTable')

def lambda_handler(event, context):
    # Parse the incoming updates from the frontend
    updates = json.loads(event['body'])

    # Iterate over the updates and apply them to DynamoDB
    for update in updates:
        transaction_hash = update['hash']  # Use 'hash' field as the key
        split_value = update['split']
        status = update['status']

        # Update the item in DynamoDB
        table.update_item(
            Key={
                'hash': transaction_hash  # Use 'hash' as the partition key
            },
            UpdateExpression="set #split = :split_value, #status = :status",
            ExpressionAttributeNames={
                '#split': 'split',
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':split_value': split_value,
                ':status': status
            }
        )

    return {
        'statusCode': 200,
        'body': json.dumps('Transactions updated successfully')
    }
