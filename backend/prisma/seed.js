import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  /*   供应商生成   */
  const supplierCount=20
  const suppliers = [];
  for (let i = 0; i < supplierCount; i++) {
    suppliers.push({
      name: `测试供应商 ${i + 1}`,
      phone: `1380000${String(i).padStart(4, '0')}`, // 示例电话号码
      wechat: `wechat${i + 1}`,
      description: `这是关于测试供应商 ${i + 1} 的描述。`,
      rating: `五星好评`,
      images: JSON.stringify([`http://example.com/image${i + 1}.jpg`]), // 存储为JSON字符串的图片数组
    });
  }
  console.log(`正在创建 ${supplierCount} 条供应商数据...`);
  for (const supplierData of suppliers) {
    await prisma.supplier.create({
      data: supplierData,
    });
  }
  console.log(`${supplierCount} 条供应商数据创建成功！`);
  /*   供应商生成   */

  /*  商品类型生成  */
  const productTypeCount=20
  const productType = [];
  for (let i = 0; i < productTypeCount; i++) {
    productType.push({
      name: `测试商品类型 ${i + 1}`,
      description: `这是关于测试商品类型 ${i + 1} 的描述。`,
    });
  }
  console.log(`正在创建 ${supplierCount} 条 商品类型 数据...`);
  for (const productTypeData of productType) {
    await prisma.productType.create({
      data: productTypeData,
    });
  }
  console.log(`${supplierCount} 条 商品类型 创建成功！`);
  /*  商品类型生成  */
}

main()
.then(async () => {
  await prisma.$disconnect()
})
.catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})