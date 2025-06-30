import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 开始 seeding ---');

  // 可选：清空现有数据，确保每次运行都是干净的状态
  // 注意：在生产环境请谨慎使用此操作
  // await prisma.product.deleteMany({});
  // await prisma.productType.deleteMany({});
  // await prisma.supplier.deleteMany({});
  // console.log('已清空现有 Product, ProductType, Supplier 数据。');

  // --- 1. 创建供货商数据 ---
  const supplier1 = await prisma.supplier.create({
    data: {
      name: '供货商A',
      phone: '13800001111',
      wechat: 'supplierA_wechat',
      description: '一家提供新鲜水果的供货商。',
      rating: '优秀',
      images: JSON.stringify(['http://example.com/supplierA_img1.jpg', 'http://example.com/supplierA_img2.jpg']),
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: '供货商B',
      phone: '13900002222',
      wechat: 'supplierB_wechat',
      description: '提供各类零食和饮料。',
      rating: '良好',
      images: JSON.stringify(['http://example.com/supplierB_img1.jpg']),
    },
  });

  console.log('已创建供货商数据:', { supplier1, supplier2 });

  // --- 2. 创建商品类型数据 ---
  const fruitType = await prisma.productType.create({
    data: {
      name: '水果',
      description: '新鲜水果分类',
    },
  });

  const snackType = await prisma.productType.create({
    data: {
      name: '零食',
      description: '各种美味零食',
    },
  });

  const drinkType = await prisma.productType.create({
    data: {
      name: '饮料',
      description: '解渴饮品',
    },
  });

  console.log('已创建商品类型数据:', { fruitType, snackType, drinkType });

  // --- 3. 创建商品数据 ---
  const product1 = await prisma.product.create({
    data: {
      name: '苹果',
      description: '红富士苹果，香甜可口',
      productTypeId: fruitType.id,
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: '香蕉',
      description: '菲律宾进口香蕉',
      productTypeId: fruitType.id,
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: '薯片',
      description: '乐事原味薯片',
      productTypeId: snackType.id,
    },
  });

  const product4 = await prisma.product.create({
    data: {
      name: '可乐',
      description: '可口可乐',
      productTypeId: drinkType.id,
    },
  });

  console.log('已创建商品数据:', { product1, product2, product3, product4 });

  console.log('--- Seeding 完成 ---');
}

main()
.catch((e) => {
  console.error('Seeding 失败:', e);
  process.exit(1);
})
.finally(async () => {
  await prisma.$disconnect();
});