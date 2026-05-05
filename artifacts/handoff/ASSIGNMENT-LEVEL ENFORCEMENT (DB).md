\-- =========================================

\-- 0. ASSIGNMENTS TABLE (NEW)

\-- =========================================

CREATE TABLE IF NOT EXISTS assignments (

&#x20; id uuid PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; project\_id uuid NOT NULL,

&#x20; entity\_type text NOT NULL,      -- 'SUBMITTAL' | 'DOCUMENT'

&#x20; entity\_id uuid NOT NULL,

&#x20; assigned\_user\_id uuid NOT NULL,

&#x20; assigned\_by uuid,

&#x20; created\_at timestamptz DEFAULT now()

);



\-- Optional index for performance

CREATE INDEX IF NOT EXISTS idx\_assignments\_lookup

ON assignments(entity\_type, entity\_id, assigned\_user\_id);





\-- =========================================

\-- 1. HELPER: CHECK ASSIGNMENT

\-- =========================================

CREATE OR REPLACE FUNCTION is\_assigned\_user(

&#x20; p\_entity\_type text,

&#x20; p\_entity\_id uuid

)

RETURNS boolean AS $$

BEGIN

&#x20; RETURN EXISTS (

&#x20;   SELECT 1 FROM assignments a

&#x20;   WHERE a.entity\_type = p\_entity\_type

&#x20;     AND a.entity\_id = p\_entity\_id

&#x20;     AND a.assigned\_user\_id = auth.uid()

&#x20; );

END;

$$ LANGUAGE plpgsql STABLE;





\-- =========================================

\-- 2. ENFORCE ASSIGNMENT ON SUBMITTALS

\-- =========================================

CREATE OR REPLACE FUNCTION enforce\_assignment\_submittal()

RETURNS trigger AS $$

BEGIN

&#x20; -- Only assigned user OR L3/L5 can change state

&#x20; IF NOT is\_assigned\_user('SUBMITTAL', NEW.id) THEN

&#x20;   -- allow override for higher roles

&#x20;   IF NOT EXISTS (

&#x20;     SELECT 1 FROM project\_users pu

&#x20;     WHERE pu.user\_id = auth.uid()

&#x20;       AND pu.project\_id = (

&#x20;         SELECT pc.project\_id

&#x20;         FROM credit\_stages cs

&#x20;         JOIN project\_credits pc ON cs.project\_credit\_id = pc.id

&#x20;         WHERE cs.id = NEW.credit\_stage\_id

&#x20;       )

&#x20;       AND pu.role IN ('L3','L5')

&#x20;   ) THEN

&#x20;     RAISE EXCEPTION 'Only assigned user can act on this submittal';

&#x20;   END IF;

&#x20; END IF;



&#x20; RETURN NEW;

END;

$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg\_assignment\_submittal ON submittals;



CREATE TRIGGER trg\_assignment\_submittal

BEFORE UPDATE ON submittals

FOR EACH ROW

EXECUTE FUNCTION enforce\_assignment\_submittal();





\-- =========================================

\-- 3. ENFORCE ASSIGNMENT ON DOCUMENTS

\-- =========================================

CREATE OR REPLACE FUNCTION enforce\_assignment\_document()

RETURNS trigger AS $$

BEGIN

&#x20; -- Only assigned user OR L3/L5 can upload/update

&#x20; IF NOT is\_assigned\_user('DOCUMENT', NEW.id) THEN

&#x20;   IF NOT EXISTS (

&#x20;     SELECT 1 FROM project\_users pu

&#x20;     WHERE pu.user\_id = auth.uid()

&#x20;       AND pu.project\_id = NEW.project\_id

&#x20;       AND pu.role IN ('L3','L5')

&#x20;   ) THEN

&#x20;     RAISE EXCEPTION 'Only assigned user can act on this document';

&#x20;   END IF;

&#x20; END IF;



&#x20; RETURN NEW;

END;

$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg\_assignment\_document\_insert ON documents;



CREATE TRIGGER trg\_assignment\_document\_insert

BEFORE INSERT ON documents

FOR EACH ROW

EXECUTE FUNCTION enforce\_assignment\_document();





\-- =========================================

\-- 4. ENFORCE ON DOCUMENT VERSIONING

\-- =========================================

CREATE OR REPLACE FUNCTION enforce\_assignment\_version()

RETURNS trigger AS $$

DECLARE

&#x20; doc\_project\_id uuid;

BEGIN

&#x20; SELECT project\_id INTO doc\_project\_id

&#x20; FROM documents

&#x20; WHERE id = NEW.document\_id;



&#x20; IF NOT is\_assigned\_user('DOCUMENT', NEW.document\_id) THEN

&#x20;   IF NOT EXISTS (

&#x20;     SELECT 1 FROM project\_users pu

&#x20;     WHERE pu.user\_id = auth.uid()

&#x20;       AND pu.project\_id = doc\_project\_id

&#x20;       AND pu.role IN ('L3','L5')

&#x20;   ) THEN

&#x20;     RAISE EXCEPTION 'Only assigned user can version this document';

&#x20;   END IF;

&#x20; END IF;



&#x20; RETURN NEW;

END;

$$ LANGUAGE plpgsql;



DROP TRIGGER IF EXISTS trg\_assignment\_version ON document\_versions;



CREATE TRIGGER trg\_assignment\_version

BEFORE INSERT ON document\_versions

FOR EACH ROW

EXECUTE FUNCTION enforce\_assignment\_version();





\-- =========================================

\-- 5. OPTIONAL: RLS FOR ASSIGNMENTS TABLE

\-- =========================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS assignments\_access ON assignments;



CREATE POLICY assignments\_access

ON assignments

FOR ALL

USING (

&#x20; project\_id IN (

&#x20;   SELECT project\_id FROM project\_users

&#x20;   WHERE user\_id = auth.uid()

&#x20; )

)

WITH CHECK (

&#x20; project\_id IN (

&#x20;   SELECT project\_id FROM project\_users

&#x20;   WHERE user\_id = auth.uid()

&#x20; )

);

