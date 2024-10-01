import json
import boto3
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TransactionSplitTable')

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))

        # Check if body exists in the event
        if event.get('body') is None:
            raise ValueError("Request body is missing")

        # Parse the incoming updates from the frontend
        updates = json.loads(event['body'])
        logger.info("Parsed updates: %s", updates)

        # Iterate over the updates and apply them to DynamoDB
        for update in updates:
            transaction_hash = update['hash']  # Use 'hash' field as the key
            split_value = update['split']
            status = update['status']

            logger.info(f"Processing transaction with hash: {transaction_hash}, split: {split_value}, status: {status}")

            # Only update if split_value is either "yes" or "no" (i.e., valid selections)
            if split_value in ["yes", "no"]:
                # Convert "yes" to True and "no" to False for the DynamoDB boolean value
                split_bool = split_value == "yes"

                # Update the item in DynamoDB
                logger.info(f"Updating transaction {transaction_hash} with split={split_bool} and status={status}")
                table.update_item(
                    Key={
                        'hash': transaction_hash  # Use 'hash' as the partition key
                    },
                    UpdateExpression="SET #split = :split_value, #status = :status",
                    ExpressionAttributeNames={
                        '#split': 'split',
                        '#status': 'status'
                    },
                    ExpressionAttributeValues={
                        ':split_value': split_bool,  # Store as a boolean
                        ':status': status
                    }
                )
            else:
                logger.warning(f"Invalid split value for transaction {transaction_hash}: {split_value}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Allow cross-origin requests if needed
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps('Transactions updated successfully')
        }

    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Ensure CORS headers are included on error
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(f"Error: {str(ve)}")
        }
    except Exception as e:
        logger.error(f"Error updating transactions: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Ensure CORS headers are included on error
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(f"Error updating transactions: {str(e)}")
        }
