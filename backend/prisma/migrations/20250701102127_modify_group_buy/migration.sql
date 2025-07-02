/*
  Warnings:

  - Added the required column `ProductId` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `SupplierId` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupBuy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupBuyStartDate" DATETIME,
    "SupplierId" TEXT NOT NULL,
    "ProductId" TEXT NOT NULL,
    "variants" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupBuy_SupplierId_fkey" FOREIGN KEY ("SupplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupBuy_ProductId_fkey" FOREIGN KEY ("ProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GroupBuy" ("createdAt", "delete", "description", "groupBuyStartDate", "id", "images", "name", "updatedAt", "variants") SELECT "createdAt", "delete", "description", "groupBuyStartDate", "id", "images", "name", "updatedAt", "variants" FROM "GroupBuy";
DROP TABLE "GroupBuy";
ALTER TABLE "new_GroupBuy" RENAME TO "GroupBuy";
CREATE INDEX "GroupBuy_id_idx" ON "GroupBuy"("id");
CREATE INDEX "GroupBuy_name_idx" ON "GroupBuy"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
