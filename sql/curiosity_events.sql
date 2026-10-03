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
  source STRING,
  mode STRING,
  item_id STRING,
  item_label STRING,
  value_num FLOAT64,
  pack_id STRING
);

-- If the table already exists, add columns once:
-- ALTER TABLE curio.curiosity_events ADD COLUMN IF NOT EXISTS mode STRING;
-- ALTER TABLE curio.curiosity_events ADD COLUMN IF NOT EXISTS item_id STRING;
-- ALTER TABLE curio.curiosity_events ADD COLUMN IF NOT EXISTS item_label STRING;
-- ALTER TABLE curio.curiosity_events ADD COLUMN IF NOT EXISTS value_num FLOAT64;
-- ALTER TABLE curio.curiosity_events ADD COLUMN IF NOT EXISTS pack_id STRING;
--
-- Merged-lesson metrics: filter item_id = 'lesson-merged' (see curiosity_merged_lesson_queries.sql).
