import json
import boto3
import decimal
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')

# Helper function to convert Decimal to a serializable format
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
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

    # Query for items where status is 'pending'
    response = table.scan(
        FilterExpression=Attr('status').eq('pending')
    )
    
    # Return the pending transactions with CORS headers
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',  # You can restrict to your domain if needed
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        'body': json.dumps(response['Items'], cls=DecimalEncoder)
    }
