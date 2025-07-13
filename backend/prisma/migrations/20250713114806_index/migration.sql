-- DropIndex
DROP INDEX "Customer_name_idx";

-- DropIndex
DROP INDEX "Customer_id_idx";

-- DropIndex
DROP INDEX "GroupBuy_name_idx";

-- DropIndex
DROP INDEX "GroupBuy_id_idx";

-- DropIndex
DROP INDEX "Order_groupBuyId_idx";

-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_id_idx";

-- DropIndex
DROP INDEX "Product_name_idx";

-- DropIndex
DROP INDEX "Product_id_idx";

-- DropIndex
DROP INDEX "ProductType_id_idx";

-- DropIndex
DROP INDEX "Supplier_name_idx";

-- DropIndex
DROP INDEX "Supplier_id_idx";

-- CreateIndex
CREATE INDEX "Customer_id_delete_idx" ON "Customer"("id", "delete");

-- CreateIndex
CREATE INDEX "Customer_name_delete_idx" ON "Customer"("name", "delete");

-- CreateIndex
CREATE INDEX "GroupBuy_id_delete_idx" ON "GroupBuy"("id", "delete");

-- CreateIndex
CREATE INDEX "GroupBuy_name_delete_idx" ON "GroupBuy"("name", "delete");

-- CreateIndex
CREATE INDEX "Order_id_delete_idx" ON "Order"("id", "delete");

-- CreateIndex
CREATE INDEX "Order_customerId_delete_idx" ON "Order"("customerId", "delete");

-- CreateIndex
CREATE INDEX "Order_groupBuyId_delete_idx" ON "Order"("groupBuyId", "delete");

-- CreateIndex
CREATE INDEX "Product_id_delete_idx" ON "Product"("id", "delete");

-- CreateIndex
CREATE INDEX "Product_name_delete_idx" ON "Product"("name", "delete");

-- CreateIndex
CREATE INDEX "ProductType_id_delete_idx" ON "ProductType"("id", "delete");

-- CreateIndex
CREATE INDEX "Supplier_id_delete_idx" ON "Supplier"("id", "delete");

-- CreateIndex
CREATE INDEX "Supplier_name_delete_idx" ON "Supplier"("name", "delete");
