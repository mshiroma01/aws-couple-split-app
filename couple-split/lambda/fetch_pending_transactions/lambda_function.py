import json
import boto3
import decimal
import logging
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')

# Initialize logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Helper function to convert Decimal to a serializable format
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")  # Log the full event

    # Handle preflight CORS (OPTIONS request)
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps('Preflight response')
        }

    table = dynamodb.Table('TransactionSplitTable')

    # Check if queryStringParameters exist and handle NoneType issue
    if 'queryStringParameters' not in event or event['queryStringParameters'] is None:
        logger.info("No query string parameters provided.")
        start_date = None
        end_date = None
    else:
        query_params = event['queryStringParameters']
        logger.info(f"Query parameters: {query_params}")
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')

    logger.info(f"Start date: {start_date}, End date: {end_date}")  # Log date parameters

    # Base filter expression for pending transactions
    filter_expression = Attr('status').eq('pending')

    # Add date range filtering if both startDate and endDate are provided
    if start_date and end_date:
        filter_expression = filter_expression & Attr('transaction_date').gte(start_date) & Attr('transaction_date').lte(end_date)
        logger.info(f"Filter expression with dates: {filter_expression}")

    # Handle the GET request logic
    try:
        # Query the table with the filter expression
        response = table.scan(
            FilterExpression=filter_expression
        )
        logger.info(f"Query response: {response}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Allow any origin
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(response['Items'], cls=DecimalEncoder)  # Only returning the items part of the response
        }
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Ensure CORS headers are still returned on errors
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
