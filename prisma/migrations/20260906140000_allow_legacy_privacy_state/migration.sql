-- A current registration must carry complete consent evidence. Historical
-- records may instead explicitly state that no consent evidence was recorded.
ALTER TABLE "WaitingListEntry"
  DROP CONSTRAINT "WaitingListEntry_privacy_check",
  ADD CONSTRAINT "WaitingListEntry_privacy_check" CHECK (
    (
      "privacyAccepted" = TRUE
      AND "privacyAcceptedAt" IS NOT NULL
      AND "privacyPolicyVersion" IS NOT NULL
    )
    OR
    (
      "privacyAccepted" = FALSE
      AND "privacyAcceptedAt" IS NULL
      AND "privacyPolicyVersion" IS NULL
    )
  );
