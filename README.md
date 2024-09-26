# Couple Split App

### Overview

The **Couple Split App** is an ETL (Extract, Transform, Load) application that helps couples manage their shared expenses by splitting costs automatically based on user-defined categories and split ratios. The application ingests bank CSV records, processes the transactions, and stores the resulting data in AWS DynamoDB. A static website interacts with the stored data to assist couples with budgeting and provides insights on the split expenses.

### Features

- **CSV Upload**: Upload bank transaction CSV files for automatic processing.
- **Automated Splitting**: Automatically splits expenses based on categories like `Groceries`, `Shopping`, and `Bills & Utilities`, with user-defined split ratios (e.g., 50/50, 60/40).
- **DynamoDB Storage**: Stores processed transactions and user-specified split rules in AWS DynamoDB.
- **ETL Pipeline**: Extracts data from CSV, transforms it by applying user-defined splits, and loads the processed data into DynamoDB.
- **REST API**: Exposes data through an API to be consumed by a frontend static website for displaying insights to the user.

---

### Architecture

- **AWS Lambda**: Executes the ETL logic by processing the CSV records and performing the transformations.
- **Amazon S3**: Stores the uploaded CSV files. Once uploaded, S3 triggers the Lambda function to start the processing.
- **DynamoDB**: Stores the transformed data, including transactions and split information.
- **Static Website**: A simple frontend allows users to upload CSV files, view the split results, and interact with the data.

---

### AWS Resources

- **S3 Bucket**: Stores CSV files uploaded by the user.
- **AWS Lambda**: Processes CSV files to extract transaction data and applies user-defined split rules.
- **DynamoDB**:
  - **TransactionSplitTable**: Stores split transactions between the couple.
  - **HashTable**: Stores file hashes to prevent duplicate processing of the same file.
  - **SplitTable**: Stores user-defined category splits (e.g., 50/50 for Groceries).

---

### Setup and Installation

1. **Clone the Repository**:
```
git clone https://github.com/mshiroma01/aws-couple-split-app.git
cd aws-couple-split-app
```

2. **Install AWS SAM CLI**:
Ensure you have the AWS SAM CLI installed. Follow the [official installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

3. **Initialize AWS SAM Project**:
```
sam build
sam deploy --guided
```

Follow the prompts to configure your AWS region, stack name, and other parameters.

4. **Create S3 Bucket**:
The S3 bucket is where the CSV files will be uploaded. You can either create the bucket manually via the AWS Console or automate it via the SAM template.

5. **Configure DynamoDB Tables**:
The SAM template automatically creates the required DynamoDB tables:
- `TransactionSplitTable` for storing processed transactions.
- `HashTable` for checking file duplicates based on the MD5 hash.
- `SplitTable` for storing user-defined split configurations for categories.

6. **Frontend Setup** (Optional):
- Host the static website on S3 or another platform to provide an interface for uploading CSV files and viewing the split results.

---

### CSV File Structure

The following bank CSV file are support:
1. Bank of America - Checking and Credit card
2. Chase - Credit card
3. Discover - Credit card and checking/saving

Upon upload, the system will process these transactions and apply the user-defined split rules. Each transaction will be stored in DynamoDB, and the system will keep track of how much each person has paid based on the split ratio.

---

### Lambda Function

The **AWS Lambda** function performs the following steps:
1. **Extract**: Reads the CSV file from S3.
2. **Transform**:
- Calculates the `split_percent` based on user input for each category.
- Applies the `split_percent` to the transaction amounts and calculates how much each user owes or is owed.
3. **Load**: Saves the processed data into the `TransactionSplitTable` in DynamoDB.

---

### DynamoDB Table Schema

#### `TransactionSplitTable`
- **userid**: Partition key (user identifier).
- **category**: Sort key (expense category).
- **amount**: The total amount of the transaction.
- **after_split_amount**: The amount each person owes after applying the split.
- **split_percent**: The user-defined split ratio for the category (e.g., 50/50).
  and other information from the bank csv

#### `HashTable`
- **hash**: Partition key (MD5 hash of the uploaded file).
- **filename**: The name of the CSV file.
- **date_added**: The date the file was added
- **mapping_config**: The bank the csv file is mapped to

#### `SplitTable`
- **userid**: Partition key (user identifier).
- **category**: Sort key (expense category).
- **split_percent**: The percentage split defined by the user (e.g., 50, 60).
- **need**: To quanitify this as a need vs want expense


