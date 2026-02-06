# Code Detection Experiment - Backend

AWS Serverless backend for handling experiment data submissions via S3.

## Architecture

```
React Frontend → API Gateway → Lambda → S3 Bucket
     │               │            │         │
     │               │            │         └── JSON files per submission
     │               │            └── Validates & writes to S3
     │               └── API key authentication + rate limiting
     └── POST JSON data with retry logic
```

## Prerequisites

1. **AWS CLI** configured with credentials:
   ```bash
   aws configure
   ```

2. **AWS SAM CLI** installed:
   ```bash
   brew install aws-sam-cli
   # or
   pip install aws-sam-cli
   ```

## Deployment

### 1. Build the Lambda function

```bash
cd backend
sam build
```

### 2. Deploy (first time - guided)

```bash
sam deploy --guided
```

You'll be prompted for:
- Stack name: `code-detection-experiment-prod`
- AWS Region: `us-east-1` (or your preferred region)
- Environment: `prod` (or `dev`/`staging`)
- CorsOrigin: `*` (or your specific domain)

### 3. Deploy (subsequent times)

```bash
sam deploy
```

### 4. Get the API endpoint and key

After deployment, the outputs will show:
- `ApiEndpoint`: The URL to use for submissions
- `ApiKeyId`: The API key ID

To get the actual API key value:
```bash
aws apigateway get-api-key --api-key <ApiKeyId> --include-value --query 'value' --output text
```

### 5. Update frontend .env

Add to your `.env`:
```
VITE_API_ENDPOINT=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/submit
VITE_API_KEY=your-api-key-value
```

## S3 Bucket Structure

```
experiment-data-code-detection-prod/
├── submissions/
│   ├── partial/
│   │   └── 2026/02/06/{participantId}_{timestamp}_trial_{n}.json
│   └── complete/
│       └── 2026/02/06/{participantId}_{timestamp}_complete.json
```

## Testing

### Test the endpoint directly

```bash
curl -X POST https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/submit \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-api-key" \
  -d '{
    "participantId": "test-participant",
    "submissionType": "complete",
    "trialsCompleted": 0,
    "trialData": []
  }'
```

### Expected response

```json
{
  "success": true,
  "message": "Data submitted successfully",
  "submissionId": "submissions/complete/2026/02/06/test-participant_2026-02-06T12-00-00-000Z_complete.json",
  "timestamp": "2026-02-06T12:00:00.000Z"
}
```

## Monitoring

- **CloudWatch Logs**: Check Lambda function logs
- **S3 Console**: Browse submissions by date
- **API Gateway Console**: View request metrics and errors

## Data Retrieval

Use the Python script to download and merge submissions:

```bash
cd scripts

# Download all complete submissions for a date
python download_experiment_data.py --date 2026-02-06

# Download date range
python download_experiment_data.py --date-range 2026-02-01 2026-02-06

# Download all data
python download_experiment_data.py --all

# Include trial-level data
python download_experiment_data.py --all --expand-trials
```

## Cleanup

To delete all resources:

```bash
sam delete --stack-name code-detection-experiment-prod
```

Note: This will NOT delete the S3 bucket if it contains data. You'll need to empty it first:

```bash
aws s3 rm s3://experiment-data-code-detection-prod --recursive
aws s3 rb s3://experiment-data-code-detection-prod
```

## Cost Estimate

- **API Gateway**: ~$3.50 per million requests
- **Lambda**: ~$0.20 per million invocations (at 256MB, 100ms avg)
- **S3**: ~$0.023 per GB/month storage
- **Total for 10,000 submissions**: < $1/month
