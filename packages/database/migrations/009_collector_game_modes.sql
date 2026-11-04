-- Preserve the populated-upgrade path when earlier backfills ran in this transaction.
SET CONSTRAINTS collectors_valid_survivor IMMEDIATE;
ALTER TABLE collectors ADD COLUMN game_mode text
  CHECK(game_mode IN('normal','ironman','ultimate_ironman','hardcore_ironman','group_ironman','hardcore_group_ironman','unranked_group_ironman')),
  ADD COLUMN game_mode_version bigint NOT NULL DEFAULT 1 CHECK(game_mode_version>0),
  ADD COLUMN game_mode_reviewed boolean NOT NULL DEFAULT false;
SET CONSTRAINTS collectors_valid_survivor DEFERRED;
ALTER TABLE submissions ADD COLUMN submitted_game_mode text
  CHECK(submitted_game_mode IN('normal','ironman','ultimate_ironman','hardcore_ironman','group_ironman','hardcore_group_ironman','unranked_group_ironman'));
CREATE FUNCTION preserve_submitted_game_mode() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.submitted_game_mode IS DISTINCT FROM OLD.submitted_game_mode THEN
    RAISE EXCEPTION 'Submitted game mode provenance is immutable.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER submissions_original_game_mode BEFORE UPDATE OF submitted_game_mode ON submissions
  FOR EACH ROW EXECUTE FUNCTION preserve_submitted_game_mode();
CREATE TRIGGER collector_mode_public_revision AFTER UPDATE OF game_mode ON collectors
  FOR EACH ROW WHEN(OLD.game_mode IS DISTINCT FROM NEW.game_mode)
  EXECUTE FUNCTION advance_projection_revision('collections');
CREATE TRIGGER collector_mode_review_revision AFTER UPDATE OF game_mode_version ON collectors
  FOR EACH ROW WHEN(OLD.game_mode_version IS DISTINCT FROM NEW.game_mode_version)
  EXECUTE FUNCTION advance_review_revision();
CREATE OR REPLACE VIEW collection_credits AS
SELECT s.id AS submission_id,s.item_id,COALESCE(c.display_name,s.collector_name) AS collector_name,
  s.collected_on,s.hardcore,s.collection_type,s.event_page_id,s.event_page_assignment_pending,c.game_mode
FROM submissions s LEFT JOIN collectors original ON original.id=s.collector_id
LEFT JOIN collectors c ON c.id=COALESCE(original.merged_into,original.id)
WHERE s.status='approved';
CREATE TABLE collector_game_mode_audit (
  operation_id uuid PRIMARY KEY,
  collector_id uuid NOT NULL REFERENCES collectors(id),
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  old_mode text CHECK(old_mode IN('normal','ironman','ultimate_ironman','hardcore_ironman','group_ironman','hardcore_group_ironman','unranked_group_ironman')),
  new_mode text CHECK(new_mode IN('normal','ironman','ultimate_ironman','hardcore_ironman','group_ironman','hardcore_group_ironman','unranked_group_ironman')),
  origin text NOT NULL CHECK(origin IN('staff','merge')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX collector_game_mode_history ON collector_game_mode_audit(collector_id,created_at,operation_id);
CREATE TABLE collector_game_mode_requests (
  actor_id text NOT NULL,
  request_key uuid NOT NULL,
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  response jsonb NOT NULL CHECK(jsonb_typeof(response)='object'),
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(actor_id,request_key)
);
ALTER TABLE collector_name_audit ADD COLUMN source_game_mode text,
  ADD COLUMN target_game_mode text,ADD COLUMN resolved_game_mode text;
