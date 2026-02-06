import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

/**
 * Generate S3 key with date partitioning for efficient querying
 */
function generateS3Key(data) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');

  const participantId = data.participantId || 'unknown';
  const submissionType = data.submissionType || 'unknown';
  const timestamp = now.toISOString().replace(/[:.]/g, '-');

  // Organize by submission type and date
  // submissions/complete/2026/02/06/participantId_timestamp.json
  // submissions/partial/2026/02/06/participantId_timestamp_trial_N.json
  const filename = submissionType === 'partial'
    ? `${participantId}_${timestamp}_trial_${data.trialsCompleted || 0}.json`
    : `${participantId}_${timestamp}_complete.json`;

  return `submissions/${submissionType}/${year}/${month}/${day}/${filename}`;
}

/**
 * Validate required fields in submission data
 */
function validateSubmission(data) {
  const errors = [];

  if (!data.participantId) {
    errors.push('participantId is required');
  }

  if (!data.submissionType) {
    errors.push('submissionType is required');
  }

  if (data.submissionType && !['partial', 'final', 'complete', 'unknown'].includes(data.submissionType)) {
    errors.push('submissionType must be "partial", "final", "complete", or "unknown"');
  }

  return errors;
}

/**
 * CORS headers for API Gateway responses
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/**
 * Lambda handler for experiment data submission
 */
export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: '',
    };
  }

  try {
    // Parse request body
    let data;
    try {
      data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(),
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
      };
    }

    // Validate required fields
    const validationErrors = validateSubmission(data);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(),
        },
        body: JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        }),
      };
    }

    // Add server-side metadata
    const enrichedData = {
      ...data,
      serverMetadata: {
        receivedAt: new Date().toISOString(),
        sourceIp: event.requestContext?.identity?.sourceIp || 'unknown',
        userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'] || 'unknown',
        requestId: event.requestContext?.requestId || 'unknown',
      },
    };

    // Generate S3 key
    const s3Key = generateS3Key(data);
    console.log('Writing to S3:', BUCKET_NAME, s3Key);

    // Write to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: JSON.stringify(enrichedData, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'participant-id': data.participantId || 'unknown',
        'submission-type': data.submissionType || 'unknown',
        'trials-completed': String(data.trialsCompleted || 0),
      },
    });

    await s3Client.send(putCommand);

    console.log('Successfully wrote to S3:', s3Key);

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
      body: JSON.stringify({
        success: true,
        message: 'Data submitted successfully',
        submissionId: s3Key,
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (error) {
    console.error('Error processing submission:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(),
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
