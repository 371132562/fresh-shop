/*
  Warnings:

  - You are about to drop the `GroupBuyVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `groupBuyVariantId` on the `Order` table. All the data in the column will be lost.
  - Added the required column `customerAddressId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variants` to the `GroupBuy` table without a default value. This is not possible if the table is not empty.
  - Made the column `groupBuyId` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "GroupBuyVariant_groupBuyId_idx";

-- DropIndex
DROP INDEX "GroupBuyVariant_name_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GroupBuyVariant";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" INTEGER,
    "wechat" TEXT,
    "address" TEXT,
    "description" TEXT,
    "customerAddressId" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_customerAddressId_fkey" FOREIGN KEY ("customerAddressId") REFERENCES "CustomerAddress" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "createdAt", "delete", "description", "id", "name", "phone", "updatedAt", "wechat") SELECT "address", "createdAt", "delete", "description", "id", "name", "phone", "updatedAt", "wechat" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_id_idx" ON "Customer"("id");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE TABLE "new_GroupBuy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME,
    "variants" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GroupBuy" ("createdAt", "delete", "description", "id", "images", "name", "startTime", "updatedAt") SELECT "createdAt", "delete", "description", "id", "images", "name", "startTime", "updatedAt" FROM "GroupBuy";
DROP TABLE "GroupBuy";
ALTER TABLE "new_GroupBuy" RENAME TO "GroupBuy";
CREATE INDEX "GroupBuy_id_idx" ON "GroupBuy"("id");
CREATE INDEX "GroupBuy_name_idx" ON "GroupBuy"("name");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "GroupBuy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerId", "delete", "groupBuyId", "id", "quantity", "status", "updatedAt") SELECT "createdAt", "customerId", "delete", "groupBuyId", "id", "quantity", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_id_idx" ON "Order"("id");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_groupBuyId_idx" ON "Order"("groupBuyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Product_id_idx" ON "Product"("id");

-- CreateIndex
CREATE INDEX "ProductType_id_idx" ON "ProductType"("id");

-- CreateIndex
CREATE INDEX "Supplier_id_idx" ON "Supplier"("id");
