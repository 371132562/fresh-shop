import { PrismaClient } from '@prisma/client';
import { Faker, zh_CN, base ,en} from '@faker-js/faker';

export const customFaker = new Faker({
  locale: [zh_CN,en, base],
});

// 创建 Prisma 客户端实例
const prisma = new PrismaClient();

async function main() {
  const NUM_RECORDS = 35; // 每个模型生成的数据条数

  console.log('开始生成数据...');

  // --- 1. 生成 ProductType 数据 ---
  const productTypesData = Array.from({ length: NUM_RECORDS }).map(() => ({
    name: customFaker.commerce.department(), // 商品部门名称通常是英文，但这里为了示例保持不变，实际可自定义
    description: customFaker.lorem.sentence(), // 句子将是中文
  }));
  const productTypes = await prisma.productType.createManyAndReturn({
    data: productTypesData,
  });
  console.log(`生成了 ${productTypes.length} 条 ProductType 数据.`);

  // --- 2. 生成 CustomerAddress 数据 ---
  const customerAddressesData = Array.from({ length: NUM_RECORDS }).map(() => ({
    name: customFaker.location.streetAddress(true), // 生成中文街道地址
  }));
  const customerAddresses = await prisma.customerAddress.createManyAndReturn({
    data: customerAddressesData,
  });
  console.log(`生成了 ${customerAddresses.length} 条 CustomerAddress 数据.`);

  // --- 3. 生成 Supplier 数据 ---
  const suppliersData = Array.from({ length: NUM_RECORDS }).map(() => ({
    name: customFaker.company.name() + ' 供应商', // 公司名将是中文，加上“供应商”后缀
    phone: customFaker.phone.number('###########'), // 电话号码格式不变
    wechat: customFaker.internet.userName(), // 用户名通常是英文或拼音
    description: customFaker.lorem.paragraph(), // 段落将是中文
    rating: customFaker.helpers.arrayElement(['五星好评', '四星', '三星']), // 评价是中文
    images: JSON.stringify([
      customFaker.image.urlLoremFlickr({ category: 'business' }),
    ]), // 图片 URL 不受语言影响
  }));
  const suppliers = await prisma.supplier.createManyAndReturn({
    data: suppliersData,
  });
  console.log(`生成了 ${suppliers.length} 条 Supplier 数据.`);

  // --- 4. 生成 Product 数据 ---
  const productsData = Array.from({ length: NUM_RECORDS }).map(() => ({
    name: customFaker.commerce.productName(), // 商品名称将是中文
    description: customFaker.commerce.productDescription(), // 商品描述将是中文
    productTypeId: customFaker.helpers.arrayElement(productTypes).id, // 随机绑定商品类型
  }));
  const products = await prisma.product.createManyAndReturn({
    data: productsData,
  });
  console.log(`生成了 ${products.length} 条 Product 数据.`);

  // --- 5. 生成 Customer 数据 ---
  const customersData = Array.from({ length: NUM_RECORDS }).map(() => ({
    name: customFaker.person.fullName(), // 客户姓名将是中文
    phone: customFaker.phone.number('###########'), // 电话号码格式不变
    wechat: customFaker.internet.userName(), // 用户名通常是英文或拼音
    address: customFaker.location.secondaryAddress(), // 补充地址将是中文
    description: customFaker.lorem.sentence(), // 句子将是中文
    customerAddressId: customFaker.helpers.arrayElement(customerAddresses).id, // 随机绑定客户地址
  }));
  const customers = await prisma.customer.createManyAndReturn({
    data: customersData,
  });
  console.log(`生成了 ${customers.length} 条 Customer 数据.`);

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
