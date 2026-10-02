-- Curiosity analytics for CURIO.
-- Run once, then set BIGQUERY_DATASET=curio on Cloud Run.
--
--   bq query --use_legacy_sql=false < infra/curiosity_events.sql

CREATE SCHEMA IF NOT EXISTS curio
OPTIONS (location = "US");

CREATE TABLE IF NOT EXISTS curio.curiosity_events (
  insert_id STRING,
  event_time TIMESTAMP,
  student_name STRING,
  question STRING,
  concept STRING,
  event_type STRING,
  language STRING,
  source STRING
);
