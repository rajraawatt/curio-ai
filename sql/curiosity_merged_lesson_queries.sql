-- BigQuery: metrics for the full merged lesson only (item_id = 'lesson-merged').
-- Requires curio.curiosity_events from curiosity_events.sql and BIGQUERY_DATASET=curio.

-- Language mix (same as Video languages tab)
-- SELECT
--   item_label AS lesson_video,
--   language,
--   COUNT(*) AS plays
-- FROM `curio.curiosity_events`
-- WHERE event_type = 'video_play'
--   AND item_id = 'lesson-merged'
-- GROUP BY 1, 2
-- ORDER BY plays DESC;

-- Self-paced time on merged lesson (seconds)
-- SELECT student_name, SUM(value_num) AS seconds
-- FROM `curio.curiosity_events`
-- WHERE event_type = 'time_spent'
--   AND (item_id = 'lesson-merged' OR item_id IS NULL OR item_id = '')
-- GROUP BY 1
-- ORDER BY seconds DESC;

-- Rewinds on merged lesson
-- SELECT student_name, COUNT(*) AS rewinds, SUM(value_num) AS seconds_back
-- FROM `curio.curiosity_events`
-- WHERE event_type = 'rewind' AND item_id = 'lesson-merged'
-- GROUP BY 1;

-- Live vs self-paced plays
-- SELECT mode, language, COUNT(*) AS plays
-- FROM `curio.curiosity_events`
-- WHERE event_type = 'video_play' AND item_id = 'lesson-merged'
-- GROUP BY 1, 2;
