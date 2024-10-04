import json
import boto3
import decimal
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
split_table = dynamodb.Table('SplitTable')

# Helper function to convert Decimal to a serializable format
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)  # Convert Decimal to float for JSON serialization
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))

        # Query to fetch categories, assume we are querying by userid if necessary
        query_params = event.get('queryStringParameters', {})
        userid = query_params.get('userid')

        if not userid:
            raise ValueError("UserID is required to fetch categories")

        # Query the DynamoDB table to get categories for the specified userid
        response = split_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userid').eq(userid)
        )

        categories = response.get('Items', [])
        if not categories:
            logger.info(f"No categories found for userid: {userid}")
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
                },
                'body': json.dumps([])  # Return empty list if no categories found
            }

        # Return the list of categories using DecimalEncoder for proper serialization
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Allow cross-origin requests if needed
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(categories, cls=DecimalEncoder)  # Use DecimalEncoder for serialization
        }

    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # Ensure CORS headers are included on error
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(f"Error: {str(ve)}")
        }
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            'body': json.dumps(f"Error fetching categories: {str(e)}")
        }
