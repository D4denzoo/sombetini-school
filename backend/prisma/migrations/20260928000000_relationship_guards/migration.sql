-- Link one-time codes and result approvals to the rows they name.

ALTER TABLE "otp_tokens"
  ADD CONSTRAINT "otp_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "result_approvals"
  ADD CONSTRAINT "result_approvals_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "result_approvals"
  ADD CONSTRAINT "result_approvals_term_id_fkey"
  FOREIGN KEY ("term_id") REFERENCES "terms"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- One current year, one current term, and one school profile.
CREATE UNIQUE INDEX "academic_years_single_current"
  ON "academic_years" ("is_current")
  WHERE "is_current";

CREATE UNIQUE INDEX "terms_single_current"
  ON "terms" ("is_current")
  WHERE "is_current";

CREATE UNIQUE INDEX "school_settings_single_row"
  ON "school_settings" ((true));

-- An examination's term must belong to that examination's academic year.
CREATE OR REPLACE FUNCTION examinations_term_matches_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "terms" t
    WHERE t.id = NEW.term_id
      AND t.academic_year_id = NEW.academic_year_id
  ) THEN
    RAISE EXCEPTION 'The selected term does not belong to the selected academic year';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "examinations_term_year_chk"
  BEFORE INSERT OR UPDATE OF "term_id", "academic_year_id"
  ON "examinations"
  FOR EACH ROW
  EXECUTE FUNCTION examinations_term_matches_year();

-- Marks must use the same year and term as their examination, and the pupil's class.
CREATE OR REPLACE FUNCTION student_marks_match_examination()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "terms" t
    WHERE t.id = NEW.term_id
      AND t.academic_year_id = NEW.academic_year_id
  ) THEN
    RAISE EXCEPTION 'The mark term does not belong to the mark academic year';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "examinations" e
    WHERE e.id = NEW.examination_id
      AND e.academic_year_id = NEW.academic_year_id
      AND e.term_id = NEW.term_id
  ) THEN
    RAISE EXCEPTION 'The mark year and term do not match the examination';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "examinations" e
    JOIN "students" s ON s.id = NEW.student_id
    WHERE e.id = NEW.examination_id
      AND e.class_id IS NOT NULL
      AND e.class_id <> s.class_id
  ) THEN
    RAISE EXCEPTION 'This pupil is not in the class for this examination';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "student_marks_examination_chk"
  BEFORE INSERT OR UPDATE OF "student_id", "examination_id", "academic_year_id", "term_id"
  ON "student_marks"
  FOR EACH ROW
  EXECUTE FUNCTION student_marks_match_examination();

-- A payment can only be recorded for a parent who is linked to that pupil.
CREATE OR REPLACE FUNCTION payments_parent_linked_to_student()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "parent_students" ps
    WHERE ps.parent_id = NEW.parent_id
      AND ps.student_id = NEW.student_id
  ) THEN
    RAISE EXCEPTION 'This parent is not linked to this pupil';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "payments_parent_student_chk"
  BEFORE INSERT OR UPDATE OF "parent_id", "student_id"
  ON "payments"
  FOR EACH ROW
  EXECUTE FUNCTION payments_parent_linked_to_student();
