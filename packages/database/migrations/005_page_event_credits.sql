-- One obtain retains its submission identity; Event ownership adds one stable page.
ALTER TABLE submissions ADD COLUMN event_page_id text REFERENCES pages(id);
ALTER TABLE submissions ADD COLUMN event_page_assignment_pending boolean NOT NULL DEFAULT false;

-- Only an unambiguous current membership can assign an existing approved credit.
-- Scheduling evidence is retained unchanged and is advisory for shared legacy items.
UPDATE submissions s SET event_page_id=p.page_id
FROM (
  SELECT pi.item_id,min(pi.page_id) AS page_id FROM page_items pi
  JOIN pages p ON p.id=pi.page_id
  GROUP BY pi.item_id HAVING count(*)=1 AND bool_and(p.active)
) p
WHERE s.item_id=p.item_id AND s.collection_type='event' AND NOT s.hardcore
  AND s.status='approved';
UPDATE submissions SET event_page_assignment_pending=true
WHERE status='approved' AND collection_type='event' AND event_page_id IS NULL;

ALTER TABLE submissions ADD CONSTRAINT submissions_event_page_type
  CHECK (event_page_id IS NULL OR (collection_type='event' AND NOT hardcore));
ALTER TABLE submissions ADD CONSTRAINT submissions_event_page_required
  CHECK (status<>'approved' OR collection_type<>'event' OR
    event_page_id IS NOT NULL OR event_page_assignment_pending);
DROP INDEX submissions_one_event_credit;
CREATE UNIQUE INDEX submissions_one_event_credit ON submissions(item_id,event_page_id)
  WHERE status='approved' AND collection_type='event' AND NOT hardcore;
CREATE INDEX submissions_unassigned_event_pages ON submissions(item_id)
  WHERE status='approved' AND event_page_assignment_pending;

-- Guard old binaries/direct concurrent writers as well as application checks.
CREATE FUNCTION protect_page_event_credit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_page_assignment_pending AND
    (TG_OP='INSERT' OR NOT OLD.event_page_assignment_pending OR
      NEW.item_id IS DISTINCT FROM OLD.item_id OR NEW.event_page_id IS NOT NULL OR
      NEW.collection_type IS DISTINCT FROM OLD.collection_type) THEN
    RAISE EXCEPTION 'Legacy Event page assignments require migration review.' USING ERRCODE='23514';
  END IF;
  IF NEW.status='approved' AND NEW.collection_type='event' THEN
    PERFORM id FROM items WHERE id=NEW.item_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM submissions WHERE item_id=NEW.item_id AND id<>NEW.id
      AND status='approved' AND event_page_assignment_pending) THEN
      RAISE EXCEPTION 'Resolve the legacy Event page assignment first.' USING ERRCODE='23514';
    END IF;
    IF NEW.event_page_id IS NOT NULL AND
      (TG_OP='INSERT' OR OLD.status<>'approved' OR
        NEW.item_id IS DISTINCT FROM OLD.item_id OR
        NEW.event_page_id IS DISTINCT FROM OLD.event_page_id) AND
      NOT EXISTS(SELECT 1 FROM page_items pi JOIN pages p ON p.id=pi.page_id
        WHERE pi.item_id=NEW.item_id AND pi.page_id=NEW.event_page_id AND p.active) THEN
      RAISE EXCEPTION 'Choose an active page containing the item.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER submissions_page_event_credit BEFORE INSERT OR UPDATE ON submissions
FOR EACH ROW EXECUTE FUNCTION protect_page_event_credit();

CREATE OR REPLACE VIEW collection_credits AS
SELECT id AS submission_id,item_id,collector_name,collected_on,hardcore,collection_type,
  event_page_id,event_page_assignment_pending
FROM submissions WHERE status='approved';

CREATE TABLE event_page_assignment_requests (
  actor_id text NOT NULL,
  request_key uuid NOT NULL,
  payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,request_key)
);
