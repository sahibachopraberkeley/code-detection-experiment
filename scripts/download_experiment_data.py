#!/usr/bin/env python3
"""
Download and merge experiment data from S3.

Usage:
    python download_experiment_data.py --date 2026-02-06
    python download_experiment_data.py --date-range 2026-02-01 2026-02-06
    python download_experiment_data.py --all
    python download_experiment_data.py --participant P_abc123

Output:
    data/{date}_merged.csv
    data/{date}_merged.parquet
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

try:
    import boto3
    import pandas as pd
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install boto3 pandas pyarrow")
    sys.exit(1)


# Configuration
BUCKET_NAME = os.environ.get('EXPERIMENT_BUCKET', 'experiment-data-code-detection-prod')
OUTPUT_DIR = Path(__file__).parent.parent / 'data'


def get_s3_client():
    """Get S3 client using default credentials."""
    return boto3.client('s3')


def list_submissions(s3_client, prefix='submissions/', submission_type=None):
    """List all submission files in the bucket."""
    paginator = s3_client.get_paginator('list_objects_v2')

    if submission_type:
        prefix = f'submissions/{submission_type}/'

    files = []
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get('Contents', []):
            if obj['Key'].endswith('.json'):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                })

    return files


def download_submission(s3_client, key):
    """Download and parse a single submission file."""
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
        content = response['Body'].read().decode('utf-8')
        return json.loads(content)
    except Exception as e:
        print(f"  Error downloading {key}: {e}")
        return None


def flatten_submission(data):
    """Flatten nested submission data for CSV export."""
    flat = {
        'participant_id': data.get('participantId'),
        'submission_id': data.get('submissionId'),
        'submission_type': data.get('submissionType'),
        'passed_screener': data.get('passedScreener'),
        'trials_completed': data.get('trialsCompleted'),
        'years_experience': data.get('yearsExperience'),
        'ai_tool_usage': data.get('aiToolUsage'),
        'start_time': data.get('startTime'),
        'end_time': data.get('endTime'),
    }

    # Metadata
    metadata = data.get('metadata', {})
    flat['study_name'] = metadata.get('studyName')
    flat['study_version'] = metadata.get('studyVersion')
    flat['submitted_at'] = metadata.get('submittedAt')
    flat['user_agent'] = metadata.get('userAgent')
    flat['screen_width'] = metadata.get('screenWidth')
    flat['screen_height'] = metadata.get('screenHeight')
    flat['timezone'] = metadata.get('timezone')

    # Server metadata
    server_meta = data.get('serverMetadata', {})
    flat['received_at'] = server_meta.get('receivedAt')
    flat['source_ip'] = server_meta.get('sourceIp')
    flat['request_id'] = server_meta.get('requestId')

    # Demographics
    demo = data.get('demographicResponses', {})
    flat['demo_years_experience'] = demo.get('yearsExperience')
    flat['demo_primary_languages'] = json.dumps(demo.get('primaryLanguages', []))
    flat['demo_ai_tool_usage'] = demo.get('aiToolUsage')
    github = demo.get('github', {})
    flat['demo_has_github'] = github.get('hasGitHub')
    flat['demo_github_url'] = github.get('githubUrl')

    # Code screener
    screener = data.get('codeScreenerResponses', {})
    flat['screener_passed'] = screener.get('passed')
    flat['screener_correct_count'] = screener.get('correctCount')

    # Post survey
    post = data.get('postSurveyResponses', {})
    flat['post_detection_cues'] = post.get('detectionCues')

    # Bonus info
    bonus = data.get('bonusInfo', {})
    flat['bonus_total'] = bonus.get('totalBonus')
    flat['bonus_score'] = bonus.get('totalScore')
    flat['bonus_max_score'] = bonus.get('maxPossibleScore')

    # Session tracking summary
    session = data.get('sessionTracking', {})
    flat['session_duration'] = session.get('totalDuration')
    flat['session_blur_count'] = session.get('blurCount')
    flat['session_time_away'] = session.get('totalTimeAway')

    # Trial data as JSON (for detailed analysis)
    flat['trial_data_json'] = json.dumps(data.get('trialData', []))
    flat['num_trials'] = len(data.get('trialData', []))

    return flat


def expand_trials(data):
    """Expand trial data into separate rows for trial-level analysis."""
    rows = []
    participant_id = data.get('participantId')
    trial_data = data.get('trialData', [])

    for trial in trial_data:
        row = {
            'participant_id': participant_id,
            'stimulus_id': trial.get('stimulusId'),
            'condition': trial.get('condition'),
            'presentation_order': trial.get('presentationOrder'),
            'question_order': trial.get('questionOrder'),
        }

        responses = trial.get('responses', {})
        row['ai_detection'] = responses.get('aiDetection')
        row['ai_confidence'] = responses.get('aiConfidence')
        row['effort_estimate'] = responses.get('effortEstimate')
        row['effort_confidence'] = responses.get('effortConfidence')

        behavior = trial.get('behaviorLog', {})
        row['view_duration'] = behavior.get('stimulusViewEnd', 0) - behavior.get('stimulusViewStart', 0)
        row['time_to_first_interaction'] = behavior.get('timeToFirstInteraction')
        row['copy_attempts'] = len(behavior.get('copyAttempts', []))
        row['response_changes'] = len(behavior.get('responseChanges', []))

        rows.append(row)

    return rows


def filter_files_by_date(files, start_date, end_date):
    """Filter files by date range based on S3 key structure."""
    filtered = []
    for f in files:
        key = f['key']
        # Extract date from key: submissions/type/YYYY/MM/DD/filename.json
        parts = key.split('/')
        if len(parts) >= 5:
            try:
                year = int(parts[2])
                month = int(parts[3])
                day = int(parts[4])
                file_date = datetime(year, month, day).date()
                if start_date <= file_date <= end_date:
                    filtered.append(f)
            except (ValueError, IndexError):
                continue
    return filtered


def main():
    parser = argparse.ArgumentParser(description='Download experiment data from S3')
    parser.add_argument('--date', type=str, help='Single date (YYYY-MM-DD)')
    parser.add_argument('--date-range', nargs=2, metavar=('START', 'END'),
                        help='Date range (YYYY-MM-DD YYYY-MM-DD)')
    parser.add_argument('--all', action='store_true', help='Download all data')
    parser.add_argument('--participant', type=str, help='Filter by participant ID')
    parser.add_argument('--type', choices=['complete', 'partial', 'final'],
                        help='Filter by submission type')
    parser.add_argument('--bucket', type=str, default=BUCKET_NAME,
                        help=f'S3 bucket name (default: {BUCKET_NAME})')
    parser.add_argument('--output', type=str, help='Output directory')
    parser.add_argument('--expand-trials', action='store_true',
                        help='Create separate trial-level CSV')

    args = parser.parse_args()

    global BUCKET_NAME
    BUCKET_NAME = args.bucket

    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    # Determine date range
    if args.date:
        start_date = datetime.strptime(args.date, '%Y-%m-%d').date()
        end_date = start_date
        date_label = args.date
    elif args.date_range:
        start_date = datetime.strptime(args.date_range[0], '%Y-%m-%d').date()
        end_date = datetime.strptime(args.date_range[1], '%Y-%m-%d').date()
        date_label = f"{args.date_range[0]}_to_{args.date_range[1]}"
    elif args.all:
        start_date = datetime(2020, 1, 1).date()
        end_date = datetime.now().date()
        date_label = 'all'
    else:
        print("Error: Must specify --date, --date-range, or --all")
        sys.exit(1)

    print(f"Downloading experiment data from S3...")
    print(f"  Bucket: {BUCKET_NAME}")
    print(f"  Date range: {start_date} to {end_date}")
    if args.type:
        print(f"  Submission type: {args.type}")
    if args.participant:
        print(f"  Participant filter: {args.participant}")

    s3_client = get_s3_client()

    # List files
    print("\nListing files...")
    files = list_submissions(s3_client, submission_type=args.type)
    print(f"  Found {len(files)} total submission files")

    # Filter by date
    files = filter_files_by_date(files, start_date, end_date)
    print(f"  {len(files)} files in date range")

    if len(files) == 0:
        print("No files found matching criteria.")
        return

    # Download and process
    print("\nDownloading submissions...")
    submissions = []
    trial_rows = []

    for i, f in enumerate(files):
        if (i + 1) % 50 == 0:
            print(f"  Downloaded {i + 1}/{len(files)}")

        data = download_submission(s3_client, f['key'])
        if data is None:
            continue

        # Filter by participant if specified
        if args.participant and data.get('participantId') != args.participant:
            continue

        submissions.append(flatten_submission(data))

        if args.expand_trials:
            trial_rows.extend(expand_trials(data))

    print(f"\nProcessed {len(submissions)} submissions")

    if len(submissions) == 0:
        print("No submissions to export.")
        return

    # Create DataFrames
    df = pd.DataFrame(submissions)

    # Keep only complete submissions for main analysis (avoid duplicates)
    df_complete = df[df['submission_type'].isin(['complete', 'final'])]
    df_partial = df[df['submission_type'] == 'partial']

    print(f"  Complete submissions: {len(df_complete)}")
    print(f"  Partial submissions: {len(df_partial)}")

    # Save outputs
    base_name = f"{date_label}_merged"

    # All submissions
    csv_path = output_dir / f"{base_name}.csv"
    df.to_csv(csv_path, index=False)
    print(f"\nSaved: {csv_path}")

    parquet_path = output_dir / f"{base_name}.parquet"
    df.to_parquet(parquet_path, index=False)
    print(f"Saved: {parquet_path}")

    # Complete only
    if len(df_complete) > 0:
        complete_path = output_dir / f"{date_label}_complete.csv"
        df_complete.to_csv(complete_path, index=False)
        print(f"Saved: {complete_path}")

    # Trial-level data
    if args.expand_trials and len(trial_rows) > 0:
        df_trials = pd.DataFrame(trial_rows)
        trials_path = output_dir / f"{date_label}_trials.csv"
        df_trials.to_csv(trials_path, index=False)
        print(f"Saved: {trials_path}")
        print(f"  Total trial rows: {len(df_trials)}")

    # Summary stats
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Total submissions: {len(df)}")
    print(f"Unique participants: {df['participant_id'].nunique()}")
    if 'screener_passed' in df.columns:
        print(f"Passed screener: {df['screener_passed'].sum()}")
    if 'num_trials' in df.columns:
        print(f"Avg trials per submission: {df['num_trials'].mean():.1f}")


if __name__ == '__main__':
    main()
