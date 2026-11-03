ALTER TABLE submission_filter_settings ADD COLUMN repeat_collector_policy text NOT NULL DEFAULT 'separate'
  CHECK (repeat_collector_policy IN ('reject','separate','merge'));
ALTER TABLE submission_filter_audit
  ADD COLUMN old_repeat_collector_policy text NOT NULL DEFAULT 'separate'
    CHECK (old_repeat_collector_policy IN ('reject','separate','merge')),
  ADD COLUMN new_repeat_collector_policy text NOT NULL DEFAULT 'separate'
    CHECK (new_repeat_collector_policy IN ('reject','separate','merge'));
ALTER TABLE submissions ADD COLUMN admission_policy jsonb
  CHECK (admission_policy IS NULL OR jsonb_typeof(admission_policy)='object');
-- Narrow candidates by canonical identity/world before the shared Unicode name normalizer.
CREATE INDEX submissions_approved_collector_candidates ON submissions(item_id,hardcore)
  INCLUDE (collector_name) WHERE status='approved';
CREATE TRIGGER repeat_collector_projection AFTER UPDATE ON submission_filter_settings
  FOR EACH STATEMENT EXECUTE FUNCTION advance_projection_revision('collections');
