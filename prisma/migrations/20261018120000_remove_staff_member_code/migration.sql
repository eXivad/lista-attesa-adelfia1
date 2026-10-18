-- User and invitation IDs already provide stable unique identifiers.
ALTER TABLE "StaffInvitation" DROP COLUMN "pendingMemberCode", DROP COLUMN "memberCode";
ALTER TABLE "User" DROP COLUMN "memberCode";
