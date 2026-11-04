-- An upgrade from <=006 also runs 007's backfill in this transaction. Drain its
-- deferred survivor checks before altering collectors, then restore that mode.
SET CONSTRAINTS collectors_valid_survivor IMMEDIATE;
CREATE TABLE collector_name_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  user_submissions_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO collector_name_settings(singleton) VALUES(true);
CREATE TABLE collector_name_settings_audit (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  version integer NOT NULL UNIQUE,
  old_enabled boolean NOT NULL,
  new_enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE collectors ADD COLUMN wom_player_id bigint CHECK(wom_player_id>0);
SET CONSTRAINTS collectors_valid_survivor DEFERRED;
CREATE UNIQUE INDEX collectors_active_wom_player ON collectors(wom_player_id)
  WHERE merged_into IS NULL AND wom_player_id IS NOT NULL;
CREATE INDEX collectors_wom_player ON collectors(wom_player_id) WHERE wom_player_id IS NOT NULL;
CREATE TABLE collector_name_wom_verifications (
  name_change_id bigint PRIMARY KEY CHECK(name_change_id>0),
  operation_id uuid NOT NULL REFERENCES collector_name_audit(operation_id),
  player_id bigint NOT NULL CHECK(player_id>0),
  evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='object'),
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX collector_name_wom_operation ON collector_name_wom_verifications(operation_id);
