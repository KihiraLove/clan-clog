-- The migration runner backfills collector_id with the shared normalizePlayerName()
-- after this SQL and before recording/committing migration 007. Original names,
-- existing audits and exact source receipts are never rewritten by that backfill.
CREATE TABLE collectors (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  normalized_name text COLLATE "C" NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),
  history_version bigint NOT NULL DEFAULT 1 CHECK(history_version>0),
  merged_into uuid REFERENCES collectors(id),
  CHECK(merged_into IS NULL OR merged_into<>id)
);
CREATE UNIQUE INDEX collectors_current_name ON collectors(normalized_name) WHERE merged_into IS NULL;
CREATE INDEX collectors_search ON collectors(normalized_name text_pattern_ops) WHERE merged_into IS NULL;
CREATE INDEX collectors_survivor ON collectors(merged_into) WHERE merged_into IS NOT NULL;
ALTER TABLE submissions ADD COLUMN collector_id uuid REFERENCES collectors(id),
  ADD COLUMN original_collector_name text;
CREATE INDEX submissions_collector_history ON submissions(collector_id,status);
CREATE INDEX submissions_approved_collector_identity ON submissions(item_id,hardcore,collector_id) WHERE status='approved';
CREATE FUNCTION preserve_original_collector_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN NEW.original_collector_name=NEW.collector_name;
  ELSIF OLD.original_collector_name IS NOT NULL AND NEW.original_collector_name IS DISTINCT FROM OLD.original_collector_name THEN
    RAISE EXCEPTION 'Original collector provenance is immutable.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER submissions_original_collector BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION preserve_original_collector_name();

-- Merges remain one hop, including when a surviving identity is merged again.
CREATE FUNCTION protect_collector_survivor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM collectors c LEFT JOIN collectors t ON t.id=c.merged_into
    WHERE c.id=NEW.id AND c.merged_into IS NOT NULL AND
      (t.id IS NULL OR t.merged_into IS NOT NULL OR EXISTS(
        SELECT 1 FROM collectors a WHERE a.merged_into=c.id))) THEN
    RAISE EXCEPTION 'A merged collector must point directly to an active survivor.' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER collectors_valid_survivor AFTER INSERT OR UPDATE ON collectors
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION protect_collector_survivor();

CREATE FUNCTION advance_collector_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_id uuid; new_id uuid; identity_id uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN
    SELECT COALESCE(merged_into,id) INTO old_id FROM collectors WHERE id=OLD.collector_id;
  END IF;
  IF TG_OP<>'DELETE' THEN
    SELECT COALESCE(merged_into,id) INTO new_id FROM collectors WHERE id=NEW.collector_id;
  END IF;
  FOR identity_id IN SELECT id FROM collectors WHERE id IN(old_id,new_id) ORDER BY id FOR UPDATE LOOP
    UPDATE collectors SET history_version=history_version+1 WHERE id=identity_id;
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER submissions_collector_history AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION advance_collector_history();
CREATE TRIGGER collector_public_revision AFTER UPDATE OF display_name,merged_into ON collectors
  FOR EACH STATEMENT EXECUTE FUNCTION advance_projection_revision('collections');
CREATE TRIGGER collector_review_revision AFTER UPDATE OF display_name,merged_into ON collectors
  FOR EACH STATEMENT EXECUTE FUNCTION advance_review_revision();

CREATE OR REPLACE VIEW collection_credits AS
SELECT s.id AS submission_id,s.item_id,COALESCE(c.display_name,s.collector_name) AS collector_name,
  s.collected_on,s.hardcore,s.collection_type,s.event_page_id,s.event_page_assignment_pending
FROM submissions s LEFT JOIN collectors original ON original.id=s.collector_id
LEFT JOIN collectors c ON c.id=COALESCE(original.merged_into,original.id)
WHERE s.status='approved';

CREATE TABLE collector_name_previews (
  token uuid PRIMARY KEY,
  actor_id text NOT NULL,
  snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '15 minutes')
);
CREATE INDEX collector_name_preview_expiry ON collector_name_previews(expires_at);
CREATE TABLE collector_name_requests (
  actor_id text NOT NULL,
  request_key uuid NOT NULL,
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  response jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(actor_id,request_key)
);
CREATE TABLE collector_name_audit (
  operation_id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  operation text NOT NULL CHECK(operation IN('rename','merge')),
  source_id uuid NOT NULL REFERENCES collectors(id),
  target_id uuid NOT NULL REFERENCES collectors(id),
  original_name text NOT NULL,
  target_name text NOT NULL,
  affected_counts jsonb NOT NULL CHECK(jsonb_typeof(affected_counts)='object'),
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
