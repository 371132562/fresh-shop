import { PrismaClient, OrderStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid'; // 用于生成单位ID

const prisma = new PrismaClient();
const NUM_RECORDS = 35; // 每张表生成的数据条数

async function main() {
  console.log('开始生成假数据...');

  // --- 1. CustomerAddress (客户地址) ---
  const customerAddresses = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const address = await prisma.customerAddress.create({
      data: {
        id: faker.string.uuid(),
        name: faker.location.streetAddress(),
        delete: 0,
        
      },
    });
    customerAddresses.push(address);
  }
  console.log(`生成了 ${customerAddresses.length} 条 CustomerAddress 数据.`);

  // --- 2. Supplier (供货商) ---
  const suppliers = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const supplier = await prisma.supplier.create({
      data: {
        id: faker.string.uuid(),
        name: faker.company.name(),
        phone: faker.phone.number(),
        wechat: faker.internet.username(),
        description: faker.lorem.sentence(),
        rating: faker.helpers.arrayElement(['好评', '中评', '差评']),
        images: JSON.parse(
          JSON.stringify([
            faker.image.urlLoremFlickr({ category: 'business' }),
            faker.image.urlLoremFlickr({ category: 'company' }),
          ])
        ),
        delete: 0,
        
      },
    });
    suppliers.push(supplier);
  }
  console.log(`生成了 ${suppliers.length} 条 Supplier 数据.`);

  // --- 3. ProductType (商品类型) ---
  const productTypes = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const productType = await prisma.productType.create({
      data: {
        id: faker.string.uuid(),
        name: faker.commerce.department(),
        description: faker.lorem.sentence(),
        delete: 0,
        
      },
    });
    productTypes.push(productType);
  }
  console.log(`生成了 ${productTypes.length} 条 ProductType 数据.`);

  // --- 4. Product (商品) ---
  const products = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const randomProductType = faker.helpers.arrayElement(productTypes);
    const product = await prisma.product.create({
      data: {
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        productTypeId: randomProductType.id,
        delete: 0,
        
      },
    });
    products.push(product);
  }
  console.log(`生成了 ${products.length} 条 Product 数据.`);

  // --- 5. Customer (客户) ---
  const customers = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const randomAddress = faker.helpers.arrayElement(customerAddresses);
    const customer = await prisma.customer.create({
      data: {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        wechat: faker.internet.username(),
        address: faker.location.streetAddress(true),
        description: faker.lorem.sentence(),
        customerAddressId: randomAddress.id,
        delete: 0,
        
      },
    });
    customers.push(customer);
  }
  console.log(`生成了 ${customers.length} 条 Customer 数据.`);

  // --- 6. GroupBuy (团购单) ---
  const groupBuys = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const randomSupplier = faker.helpers.arrayElement(suppliers);
    const randomProduct = faker.helpers.arrayElement(products);

    // 生成随机的 units 数组
    const units = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => ({
      id: uuidv4(), // 为每个单位生成一个唯一的ID
      unit: faker.commerce.productMaterial(),
      price: parseFloat(faker.commerce.price({ min: 10, max: 100, dec: 2 })),
      costPrice: parseFloat(faker.commerce.price({ min: 100, max: 200, dec: 2 })),
    }));

    const groupBuy = await prisma.groupBuy.create({
      data: {
        id: faker.string.uuid(),
        name: faker.commerce.productName() + ' 团购',
        description: faker.lorem.paragraph(),
        groupBuyStartDate: faker.date.past({ years: 0.5 }),
        supplierId: randomSupplier.id,
        productId: randomProduct.id,
        units: JSON.parse(JSON.stringify(units)), // 确保JSON存储
        images: JSON.parse(
          JSON.stringify([
            faker.image.urlLoremFlickr({ category: 'food' }),
            faker.image.urlLoremFlickr({ category: 'fruit' }),
          ])
        ),
        delete: 0,
        
      },
    });
    groupBuys.push(groupBuy);
  }
  console.log(`生成了 ${groupBuys.length} 条 GroupBuy 数据.`);

  // --- 7. Order (订单) ---
  const orders = [];
  for (let i = 0; i < NUM_RECORDS; i++) {
    const randomCustomer = faker.helpers.arrayElement(customers);
    const randomGroupBuy = faker.helpers.arrayElement(groupBuys);

    // 随机选择一个 unitId，如果 units 存在
    let unitId = undefined;
    if (Array.isArray(randomGroupBuy.units) && randomGroupBuy.units.length > 0) {
      const randomUnit = faker.helpers.arrayElement(randomGroupBuy.units);
      unitId = randomUnit.id;
    }

    const order = await prisma.order.create({
      data: {
        id: faker.string.uuid(),
        customerId: randomCustomer.id,
        groupBuyId: randomGroupBuy.id,
        unitId: unitId,
        quantity: faker.number.int({ min: 1, max: 10 }),
        description: faker.lorem.sentence(),
        status: faker.helpers.arrayElement([OrderStatus.COMPLETED, OrderStatus.REFUNDED]),
        delete: 0,
        
      },
    });
    orders.push(order);
  }
  console.log(`生成了 ${orders.length} 条 Order 数据.`);

  // --- 8. GlobalSetting (全局设置) ---
  // 通常全局设置不会有很多条，这里我们生成几条示例
  const globalSettings = [
    { key: 'site_name', value: { name: faker.company.name() + ' 团购平台' } },
    { key: 'contact_email', value: { email: faker.internet.email() } },
    { key: 'default_currency', value: { currency: faker.finance.currencyCode() } },
  ];

  for (const setting of globalSettings) {
    await prisma.globalSetting.upsert({
      where: { key: setting.key },
      update: {
        value: JSON.parse(JSON.stringify(setting.value)),
      },
      create: {
        id: faker.string.uuid(),
        key: setting.key,
        value: JSON.parse(JSON.stringify(setting.value)),
        
      },
    });
  }
  console.log(`生成或更新了 ${globalSettings.length} 条 GlobalSetting 数据.`);

  console.log('所有数据生成完毕！');
}

main()
.catch((e) => {
  console.error(e);
  process.exit(1);
})
.finally(async () => {
  await prisma.$disconnect();
});