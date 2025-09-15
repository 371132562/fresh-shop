-- CreateIndex
CREATE INDEX "Customer_customerAddressId_delete_idx" ON "Customer"("customerAddressId", "delete");

-- CreateIndex
CREATE INDEX "CustomerAddress_id_delete_idx" ON "CustomerAddress"("id", "delete");

-- CreateIndex
CREATE INDEX "CustomerAddress_name_delete_idx" ON "CustomerAddress"("name", "delete");

-- CreateIndex
CREATE INDEX "GroupBuy_groupBuyStartDate_delete_idx" ON "GroupBuy"("groupBuyStartDate", "delete");

-- CreateIndex
CREATE INDEX "GroupBuy_supplierId_delete_idx" ON "GroupBuy"("supplierId", "delete");

-- CreateIndex
CREATE INDEX "GroupBuy_productId_delete_idx" ON "GroupBuy"("productId", "delete");

-- CreateIndex
CREATE INDEX "Order_status_delete_idx" ON "Order"("status", "delete");

-- CreateIndex
CREATE INDEX "Order_groupBuyId_status_delete_idx" ON "Order"("groupBuyId", "status", "delete");

-- CreateIndex
CREATE INDEX "Order_createdAt_delete_idx" ON "Order"("createdAt", "delete");
