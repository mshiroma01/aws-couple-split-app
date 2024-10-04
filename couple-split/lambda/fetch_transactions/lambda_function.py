import json
import boto3
import decimal
import logging
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TransactionSplitTable')

# Helper function to convert Decimal to JSON serializable
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Lambda handler
def lambda_handler(event, context):
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.info(f"Received event: {json.dumps(event)}")

    # Handle preflight CORS (OPTIONS request)
    if event['httpMethod'] == 'OPTIONS':
        logger.info('Received OPTIONS request, returning CORS headers')
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': 'Preflight response'
        }

    try:
        query_params = event['queryStringParameters']
        userid = query_params.get('userid')
        status = query_params.get('status', 'pending')  # Default status is 'pending'
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')

        logger.info(f"Fetching transactions for user: {userid}, status: {status}, startDate: {start_date}, endDate: {end_date}")

        # Build the filter expression based on status and userid
        filter_expression = Attr('userid').eq(userid) & Attr('status').eq(status)

        # Add optional date filtering
        if start_date:
            filter_expression = filter_expression & Attr('transaction_date').gte(start_date)
        if end_date:
            filter_expression = filter_expression & Attr('transaction_date').lte(end_date)

        # Perform a scan operation with the filter expression
        response = table.scan(
            FilterExpression=filter_expression
        )

        logger.info(f"Scan response: {response}")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(response['Items'], cls=DecimalEncoder)
        }

    except Exception as e:
        logger.error(f"Error occurred: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
