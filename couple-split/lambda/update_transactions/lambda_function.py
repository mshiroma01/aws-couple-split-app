import json
import boto3
import logging
from decimal import Decimal

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TransactionSplitTable')
split_table = dynamodb.Table('SplitTable')

def decimal_to_float(value):
    """Convert Decimal objects to float, return as-is if already float/int."""
    if isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, (int, float)):
        return value
    raise TypeError(f"Unsupported type: {type(value)} for value: {value}")

def float_to_decimal(value):
    """Convert float or int to Decimal."""
    if isinstance(value, (float, int)):
        return Decimal(str(value))
    return value  # If it's already Decimal, return as-is

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))

        # Handle preflight CORS (OPTIONS request)
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                'body': json.dumps('CORS preflight')
            }

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
            category = update.get('category')

            logger.info(f"Processing transaction with hash: {transaction_hash}, split: {split_value}, status: {status}, category: {category}")

            # Check if category is provided and update accordingly
            if category:
                # Fetch the corresponding category details from SplitTable
                response = split_table.query(
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('userid').eq(update['userid']) & boto3.dynamodb.conditions.Key('category').eq(category)
                )
                if 'Items' not in response or len(response['Items']) == 0:
                    raise ValueError(f"Category '{category}' not found for userid: {update['userid']}")

                # Get category details from the fetched record
                category_details = response['Items'][0]
                need = category_details.get('need', False)
                split_percent = category_details.get('split_percent', Decimal(1))

                # Ensure 'split_percent' is converted to float for calculations
                split_percent = float(split_percent)

                # Calculate 'after_split_amount'
                amount = decimal_to_float(update['amount'])  # Ensure the amount is also a float
                after_split_amount = amount * (split_percent/100)

                logger.info(f"Category {category}: need={need}, split_percent={split_percent}, after_split_amount={after_split_amount}")

                # Convert float 'after_split_amount' back to Decimal for DynamoDB update
                after_split_amount = float_to_decimal(after_split_amount)

                # Update the transaction in DynamoDB with the new category, split, and other fields
                table.update_item(
                    Key={
                        'hash': transaction_hash  # Use 'hash' as the partition key
                    },
                    UpdateExpression="SET #split = :split_value, #status = :status, #category = :category, #after_split_amount = :after_split_amount, #need = :need",
                    ExpressionAttributeNames={
                        '#split': 'split',
                        '#status': 'status',
                        '#category': 'category',
                        '#after_split_amount': 'after_split_amount',
                        '#need': 'need'
                    },
                    ExpressionAttributeValues={
                        ':split_value': split_value == "yes",  # Convert 'yes'/'no' to boolean
                        ':status': status,
                        ':category': category,
                        ':after_split_amount': after_split_amount,  # Store as Decimal
                        ':need': need  # Store boolean value
                    }
                )
            else:
                # Only update split and status if category is not provided
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
                        ':split_value': split_value == "yes",  # Convert 'yes'/'no' to boolean
                        ':status': status
                    }
                )

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(f"Error: {str(ve)}")
        }
    except Exception as e:
        logger.error(f"Error updating transactions: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(f"Error updating transactions: {str(e)}")
        }
