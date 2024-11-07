import boto3

def get_split_data(table_name, user_id):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)
    response = table.query(
        KeyConditionExpression='userid = :userid',
        ExpressionAttributeValues={
            ':userid': user_id  
        }
    )
    return response['Items']


def split_percent(item, table_data):
    if 'category' in item:
        for row in table_data:
            if row['userid'] == item['userid'] and row['category'] == item['category']:
                item['need'] = row['need']
                
                # only do this for items that cost money not once that were refunds or payments
                if(item['amount'] < 0):
                    item['split_percent'] = row['split_percent']
                    
                    # Calculate amount after a split
                    if item['split_percent'] == 0:
                        item['after_split_amount'] = item['amount']
                        item['partner_split_amount'] = 0
                    elif item['split_percent'] == 100:
                        item['after_split_amount'] = 0
                        item['partner_split_amount'] = item['amount']
                    else:
                        item['after_split_amount'] = item['amount'] * (item['split_percent'] / 100)
                        item['partner_split_amount'] = item['amount'] * ((100 - item['split_percent']) / 100)

    else:
        # Dont store the other values in the item to save space in table
        item['split_percent'] = 0
    
    return item
