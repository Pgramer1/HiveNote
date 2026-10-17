-- Google OAuth sign-in was removed; NextAuth now uses credentials + JWT sessions only,
-- so the adapter's Account and Session tables are unused. This deletes any rows in them.

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";
