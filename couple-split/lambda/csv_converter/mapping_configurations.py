# Mapping configurations for different CSV formats
mapping_configs = {
    'chase_credit': {
        'name': 'chase_credit',
        'transaction_date': 'Transaction Date',
        'post_date': 'Post Date',
        'description': 'Description',
        'category': 'Category',
        'transaction_type': 'Type',
        'amount': 'Amount',
        'memo': 'Memo',
        'date_format': '%m/%d/%Y'
    },
    'amex_credit': {
        'name': 'amex_credit',
        'transaction_date': 'Date',
        'description': 'Description',
        'amount': 'Amount',
        'date_format': '%m/%d/%Y'
    },
    'discover_credit': {
        'name': 'discover_credit',
        'transaction_date': 'Trans. Date',
        'post_date': 'Post Date',
        'description': 'Description',
        'amount': 'Amount',
        'category': 'Category',
        'date_format': '%m/%d/%Y'
    },
    'discover_checking': {
        'name': 'discover_checking',
        'transaction_date': 'Transaction Date',
        'description': 'Transaction Description',
        'transaction_type': 'Transaction Type',
        'debit': 'Debit',
        'credit': 'Credit',
        'balance': 'Balance',
        'date_format': '%m/%d/%Y'
    },
    'bofa_checking': {
        'name': 'bofa_checking',
        'transaction_date': 'Date',
        'description': 'Description',
        'amount': 'Amount',
        'balance': 'Running Bal.',
        'date_format': '%m/%d/%Y'
    },
    'bofa_credit': {
        'name': 'bofa_credit',
        'transaction_date': 'Posted Date',
        'reference_number': 'Reference Number',
        'payee': 'Payee',
        'address': 'Address',
        'amount': 'Amount',
        'date_format': '%m/%d/%Y'
    }
}
