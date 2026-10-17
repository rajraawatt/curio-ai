-- Run this in the BigQuery SQL editor after selecting your CURIO GCP project.
-- Choose the dataset location to match BIGQUERY_LOCATION (default US).
CREATE SCHEMA IF NOT EXISTS `YOUR_PROJECT_ID.curio_analytics`
OPTIONS(location = "US", description = "CURIO product analytics and business impact events");

CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.curio_analytics.product_events` (
  event_timestamp TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,
  session_id STRING NOT NULL,
  lesson_id STRING NOT NULL,
  lesson_title STRING,
  chapter_id STRING,
  chapter_title STRING,
  video_timestamp_sec FLOAT64,
  event_type STRING NOT NULL,
  question_category STRING,
  answer_status STRING,
  ai_model STRING,
  estimated_ai_cost_usd FLOAT64,
  duration_sec FLOAT64,
  metadata_json STRING
)
PARTITION BY event_date
CLUSTER BY event_type, lesson_id
OPTIONS(
  description = "Structured CURIO interaction events. Do not store raw prompts, personal information, or full chat transcripts.",
  partition_expiration_days = 180
);

-- Optional view for easy reporting in the BigQuery console / Looker Studio.
CREATE OR REPLACE VIEW `YOUR_PROJECT_ID.curio_analytics.daily_content_impact` AS
SELECT
  event_date,
  COUNT(DISTINCT session_id) AS active_sessions,
  COUNTIF(event_type = 'lesson_started') AS lessons_started,
  COUNTIF(event_type = 'lesson_completed') AS lessons_completed,
  COUNTIF(event_type = 'question_asked') AS questions_asked,
  COUNTIF(event_type = 'moment_selected') AS moments_explored,
  SAFE_DIVIDE(COUNTIF(event_type = 'lesson_completed'), COUNTIF(event_type = 'lesson_started')) AS completion_rate,
  SUM(COALESCE(estimated_ai_cost_usd, 0)) AS estimated_ai_cost_usd
FROM `YOUR_PROJECT_ID.curio_analytics.product_events`
GROUP BY event_date;
