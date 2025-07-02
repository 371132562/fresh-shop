import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/zh_CN'; // 使用中文 locale

const prisma = new PrismaClient();

const NUM_RECORDS = 35; // 每个模型生成的数据条数

async function main() {
  console.log('开始生成模拟数据...');

  // --- 1. 生成 CustomerAddress ---
  const customerAddresses = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    customerAddresses.push({
      id: faker.string.uuid(),
      name: faker.location.streetAddress(),
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.customerAddress.createMany({
    data: customerAddresses,
  });
  console.log(`生成了 ${customerAddresses.length} 条 CustomerAddress 数据.`);

  // --- 2. 生成 Supplier ---
  const suppliers = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const images = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.image.urlLoremFlickr({ category: 'business' }));
    suppliers.push({
      id: faker.string.uuid(),
      name: faker.company.name(),
      phone: faker.phone.number('1#########'),
      wechat: faker.internet.userName(),
      description: faker.lorem.sentence(),
      rating: faker.helpers.arrayElement(['A+', 'A', 'B', 'C']),
      images: JSON.stringify(images), // 存储为 JSON 字符串
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.supplier.createMany({
    data: suppliers,
  });
  console.log(`生成了 ${suppliers.length} 条 Supplier 数据.`);

  // --- 3. 生成 ProductType ---
  const productTypes = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    productTypes.push({
      id: faker.string.uuid(),
      name: faker.commerce.department(),
      description: faker.lorem.sentence(),
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.productType.createMany({
    data: productTypes,
  });
  console.log(`生成了 ${productTypes.length} 条 ProductType 数据.`);

  // --- 4. 生成 Product (依赖 ProductType) ---
  const products = [];
  const existingProductTypes = await prisma.productType.findMany({ select: { id: true } });
  if (existingProductTypes.length === 0) {
    console.error('错误：没有 ProductType 数据，无法生成 Product。');
    return;
  }
  const productTypeIds = existingProductTypes.map(pt => pt.id);

  for (let i = 0; i < NUM_RECORDS; i++) {
    products.push({
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.lorem.paragraph(),
      productTypeId: faker.helpers.arrayElement(productTypeIds),
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.product.createMany({
    data: products,
  });
  console.log(`生成了 ${products.length} 条 Product 数据.`);

  // --- 5. 生成 Customer (依赖 CustomerAddress) ---
  const customers = [];
  const existingCustomerAddresses = await prisma.customerAddress.findMany({ select: { id: true } });
  if (existingCustomerAddresses.length === 0) {
    console.error('错误：没有 CustomerAddress 数据，无法生成 Customer。');
    return;
  }
  const customerAddressIds = existingCustomerAddresses.map(ca => ca.id);

  for (let i = 0; i < NUM_RECORDS; i++) {
    customers.push({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      phone: faker.phone.number('1#########'),
      wechat: faker.internet.userName(),
      address: faker.location.streetAddress(),
      description: faker.lorem.sentence(),
      customerAddressId: faker.helpers.arrayElement(customerAddressIds),
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.customer.createMany({
    data: customers,
  });
  console.log(`生成了 ${customers.length} 条 Customer 数据.`);

  // --- 6. 生成 GroupBuy (依赖 Supplier 和 Product) ---
  const groupBuys = [];
  const existingSuppliers = await prisma.supplier.findMany({ select: { id: true } });
  const existingProducts = await prisma.product.findMany({ select: { id: true } });

  if (existingSuppliers.length === 0 || existingProducts.length === 0) {
    console.error('错误：没有 Supplier 或 Product 数据，无法生成 GroupBuy。');
    return;
  }
  const supplierIds = existingSuppliers.map(s => s.id);
  const productIds = existingProducts.map(p => p.id);

  for (let i = 0; i < NUM_RECORDS; i++) {
    const units = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => ({
      unit: faker.commerce.productAdjective() + faker.helpers.arrayElement(['袋', '盒', '个', '份']),
      price: faker.number.float({ min: 10, max: 100, precision: 0.01 }),
      costPrice: faker.number.float({ min: 5, max: 80, precision: 0.01 }),
    }));
    const images = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.image.urlLoremFlickr({ category: 'food' }));

    groupBuys.push({
      id: faker.string.uuid(),
      name: faker.commerce.productName() + ' 团购',
      description: faker.lorem.paragraph(),
      groupBuyStartDate: faker.date.future(),
      supplierId: faker.helpers.arrayElement(supplierIds),
      productId: faker.helpers.arrayElement(productIds),
      units: JSON.stringify(units), // 存储为 JSON 字符串
      images: JSON.stringify(images), // 存储为 JSON 字符串
      delete: 0,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    });
  }
  await prisma.groupBuy.createMany({
    data: groupBuys,
  });
  console.log(`生成了 ${groupBuys.length} 条 GroupBuy 数据.`);

}

main()
.catch((e) => {
  console.error('生成数据时发生错误:', e);
  process.exit(1);
})
.finally(async () => {
  await prisma.$disconnect();
  console.log('数据生成完成，Prisma 连接已断开。');
});