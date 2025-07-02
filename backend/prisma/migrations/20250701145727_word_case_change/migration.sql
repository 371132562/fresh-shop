/*
  Warnings:

  - You are about to drop the column `ProductId` on the `GroupBuy` table. All the data in the column will be lost.
  - You are about to drop the column `SupplierId` on the `GroupBuy` table. All the data in the column will be lost.
  - You are about to drop the column `Units` on the `GroupBuy` table. All the data in the column will be lost.
  - Added the required column `productId` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierId` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `units` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupBuy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupBuyStartDate" DATETIME,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupBuy_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GroupBuy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GroupBuy" ("createdAt", "delete", "description", "groupBuyStartDate", "id", "images", "name", "updatedAt") SELECT "createdAt", "delete", "description", "groupBuyStartDate", "id", "images", "name", "updatedAt" FROM "GroupBuy";
DROP TABLE "GroupBuy";
ALTER TABLE "new_GroupBuy" RENAME TO "GroupBuy";
CREATE INDEX "GroupBuy_id_idx" ON "GroupBuy"("id");
CREATE INDEX "GroupBuy_name_idx" ON "GroupBuy"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
