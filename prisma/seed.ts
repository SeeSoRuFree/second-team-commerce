// Location: prisma/seed.ts
// 한국식 커머스 베이스 — 샘플 데이터 (카테고리·상품·주문·리뷰). 가격은 원(KRW) 단위.

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { calculateShippingFee, generateOrderNumber } from '../lib/utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 데이터 시딩 시작...');

  // 관리자 계정
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = await hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: '관리자',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log(`👤 관리자 생성: ${admin.email}`);

  // 테스트 고객
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: '홍길동',
      password: await hash('customer123', 12),
      role: 'USER',
    },
  });

  console.log(`👤 고객 생성: ${customer.email}`);

  // 대분류 카테고리
  const electronicsCategory = await prisma.category.create({
    data: {
      name: '디지털/가전',
      slug: 'electronics',
      description: '스마트폰, 노트북, 이어폰 등 디지털 기기',
      image: '/images/categories/electronics.svg',
    },
  });

  const clothingCategory = await prisma.category.create({
    data: {
      name: '패션의류',
      slug: 'clothing',
      description: '남성·여성 의류와 패션 아이템',
      image: '/images/categories/clothing.svg',
    },
  });

  const homeCategory = await prisma.category.create({
    data: {
      name: '홈/리빙',
      slug: 'home-living',
      description: '생활용품과 인테리어 소품',
      image: '/images/categories/home-garden.svg',
    },
  });

  console.log('📂 대분류 카테고리 생성');

  // 소분류 카테고리
  const smartphonesCategory = await prisma.category.create({
    data: {
      name: '스마트폰',
      slug: 'smartphones',
      description: '최신 스마트폰과 모바일 기기',
      parentId: electronicsCategory.id,
    },
  });

  const laptopsCategory = await prisma.category.create({
    data: {
      name: '노트북',
      slug: 'laptops',
      description: '노트북과 태블릿',
      parentId: electronicsCategory.id,
    },
  });

  const mensClothingCategory = await prisma.category.create({
    data: {
      name: '남성의류',
      slug: 'mens-clothing',
      description: '남성 의류',
      parentId: clothingCategory.id,
    },
  });

  console.log('📂 소분류 카테고리 생성');

  // 상품 (가격: 원 단위)
  const products = [
    {
      name: '아이폰 15 Pro',
      slug: 'iphone-15-pro',
      description: '티타늄 디자인의 최신 아이폰',
      content:
        '아이폰 15 Pro는 티타늄 소재의 견고한 디자인, A17 Pro 칩, 프로급 카메라 시스템을 갖춘 최신 플래그십입니다.',
      price: 1550000,
      comparePrice: 1690000,
      costPrice: 1200000,
      categoryId: smartphonesCategory.id,
      status: 'PUBLISHED',
      sku: 'IPH15PRO-128-NT',
      tags: '스마트폰,애플,아이폰,프리미엄',
      seoTitle: '아이폰 15 Pro - 프리미엄 스마트폰 | 세컨팀 커머스',
      seoDescription: '티타늄 디자인과 프로급 카메라의 아이폰 15 Pro를 만나보세요.',
    },
    {
      name: '맥북 에어 M2',
      slug: 'macbook-air-m2',
      description: 'M2 칩을 탑재한 가벼운 노트북',
      content:
        'M2 칩을 탑재한 맥북 에어는 얇고 가벼운 디자인에 강력한 성능을 담았습니다. 하루 종일 가는 배터리로 어디서든 작업이 가능합니다.',
      price: 1690000,
      comparePrice: 1890000,
      costPrice: 1350000,
      categoryId: laptopsCategory.id,
      status: 'PUBLISHED',
      sku: 'MBA-M2-256-SG',
      tags: '노트북,애플,맥북,M2',
      seoTitle: '맥북 에어 M2 - 초경량 노트북 | 세컨팀 커머스',
      seoDescription: 'M2 칩의 강력한 성능을 맥북 에어에서 경험하세요.',
    },
    {
      name: '삼성 갤럭시 S24',
      slug: 'samsung-galaxy-s24',
      description: '갤럭시 AI를 탑재한 플래그십 스마트폰',
      content:
        '갤럭시 S24는 갤럭시 AI 카메라, 오래가는 배터리, 선명한 디스플레이를 갖춘 플래그십 안드로이드 스마트폰입니다.',
      price: 1155000,
      comparePrice: 1298000,
      costPrice: 900000,
      categoryId: smartphonesCategory.id,
      status: 'PUBLISHED',
      sku: 'SGS24-256-PH',
      tags: '스마트폰,삼성,갤럭시,안드로이드',
      seoTitle: '삼성 갤럭시 S24 - 갤럭시 AI 스마트폰 | 세컨팀 커머스',
      seoDescription: '갤럭시 AI가 탑재된 갤럭시 S24를 만나보세요.',
    },
    {
      name: '프리미엄 코튼 티셔츠',
      slug: 'premium-cotton-tshirt',
      description: '편안하고 스타일리시한 코튼 티셔츠',
      content:
        '100% 유기농 순면으로 제작되어 부드러운 촉감과 편안한 착용감을 제공합니다. 데일리룩으로 활용하기 좋습니다.',
      price: 29000,
      comparePrice: 39000,
      costPrice: 12000,
      categoryId: mensClothingCategory.id,
      status: 'PUBLISHED',
      sku: 'TSHIRT-COT-M-BLU',
      tags: '의류,코튼,캐주얼,유기농',
      seoTitle: '프리미엄 코튼 티셔츠 - 유기농 순면 | 세컨팀 커머스',
      seoDescription: '유기농 순면으로 만든 편안한 프리미엄 티셔츠.',
    },
    {
      name: '무선 노이즈캔슬링 헤드폰',
      slug: 'wireless-headphones',
      description: '노이즈캔슬링 무선 헤드폰',
      content:
        '액티브 노이즈캔슬링과 30시간 배터리를 갖춘 프리미엄 무선 헤드폰으로 뛰어난 음질을 경험하세요.',
      price: 259000,
      comparePrice: 329000,
      costPrice: 160000,
      categoryId: electronicsCategory.id,
      status: 'PUBLISHED',
      sku: 'WH-NC-BLK-BT',
      tags: '헤드폰,무선,블루투스,노이즈캔슬링',
      seoTitle: '무선 노이즈캔슬링 헤드폰 | 세컨팀 커머스',
      seoDescription: '액티브 노이즈캔슬링을 갖춘 프리미엄 무선 헤드폰.',
    },
  ];

  // 상품 이미지 매핑 (로컬 이미지)
  const productImages: Record<string, string[]> = {
    'iphone-15-pro': [
      '/images/products/iphone-15-pro.svg',
      '/images/products/iphone-15-pro-alt.svg',
    ],
    'macbook-air-m2': [
      '/images/products/macbook-air-m2.svg',
      '/images/products/macbook-air-m2-alt.svg',
    ],
    'samsung-galaxy-s24': [
      '/images/products/samsung-galaxy-s24.svg',
      '/images/products/samsung-galaxy-s24-alt.svg',
    ],
    'premium-cotton-tshirt': [
      '/images/products/premium-cotton-tshirt.svg',
      '/images/products/premium-cotton-tshirt-alt.svg',
    ],
    'wireless-headphones': [
      '/images/products/wireless-headphones.svg',
      '/images/products/wireless-headphones-alt.svg',
    ],
  };

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData,
    });

    const images = productImages[product.slug] || [
      '/images/placeholder.svg',
      '/images/placeholder.svg',
    ];

    await prisma.productImage.createMany({
      data: [
        {
          productId: product.id,
          url: images[0]!,
          altText: `${product.name} - 대표 이미지`,
          position: 0,
        },
        {
          productId: product.id,
          url: images[1]!,
          altText: `${product.name} - 추가 이미지`,
          position: 1,
        },
      ],
    });

    // 재고
    const qty = Math.floor(Math.random() * 100) + 10;
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: qty,
        reserved: 0,
        available: qty,
      },
    });

    // 옵션(변형) — 일부 상품
    if (product.slug === 'iphone-15-pro') {
      await prisma.productVariant.createMany({
        data: [
          { productId: product.id, name: '용량', value: '128GB', position: 0 },
          {
            productId: product.id,
            name: '용량',
            value: '256GB',
            price: 150000,
            position: 1,
          },
          {
            productId: product.id,
            name: '용량',
            value: '512GB',
            price: 400000,
            position: 2,
          },
          {
            productId: product.id,
            name: '색상',
            value: '내추럴 티타늄',
            position: 0,
          },
          {
            productId: product.id,
            name: '색상',
            value: '블루 티타늄',
            position: 1,
          },
          {
            productId: product.id,
            name: '색상',
            value: '화이트 티타늄',
            position: 2,
          },
        ],
      });
    }

    if (product.slug === 'premium-cotton-tshirt') {
      await prisma.productVariant.createMany({
        data: [
          { productId: product.id, name: '사이즈', value: 'S', position: 0 },
          { productId: product.id, name: '사이즈', value: 'M', position: 1 },
          { productId: product.id, name: '사이즈', value: 'L', position: 2 },
          {
            productId: product.id,
            name: '사이즈',
            value: 'XL',
            price: 3000,
            position: 3,
          },
          { productId: product.id, name: '색상', value: '블루', position: 0 },
          { productId: product.id, name: '색상', value: '블랙', position: 1 },
          { productId: product.id, name: '색상', value: '화이트', position: 2 },
        ],
      });
    }

    console.log(`📦 상품 생성: ${product.name}`);
  }

  // 리뷰 샘플
  const reviewProducts = await prisma.product.findMany({ take: 3 });
  const reviewSamples = [
    { rating: 5, title: '정말 만족스러워요!', content: '배송도 빠르고 품질도 좋습니다. 재구매 의사 있어요.' },
    { rating: 4, title: '가성비 좋네요', content: '가격 대비 괜찮은 제품입니다. 추천합니다.' },
    { rating: 5, title: '포장 꼼꼼하고 좋아요', content: '기대 이상이었습니다. 잘 쓰고 있어요!' },
  ];

  for (let i = 0; i < reviewProducts.length; i++) {
    const product = reviewProducts[i]!;
    const r = reviewSamples[i]!;
    await prisma.review.create({
      data: {
        rating: r.rating,
        title: r.title,
        content: r.content,
        verified: true,
        userId: customer.id,
        productId: product.id,
      },
    });
  }

  console.log('⭐ 리뷰 샘플 생성');

  // 장바구니 샘플
  const customerCart = await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });

  const sampleProducts = await prisma.product.findMany({ take: 2 });

  for (const product of sampleProducts) {
    await prisma.cartItem.create({
      data: {
        quantity: Math.floor(Math.random() * 3) + 1,
        cartId: customerCart.id,
        productId: product.id,
      },
    });
  }

  console.log('🛒 장바구니 샘플 생성');

  // 주문 샘플 (한국식 배송지 + 조건부 배송비)
  const orderProducts = await prisma.product.findMany({ take: 2 });
  const subtotal = orderProducts.reduce((sum, p) => sum + Number(p.price), 0);
  const shipping = calculateShippingFee(subtotal);

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      status: 'CONFIRMED',
      subtotal,
      tax: 0, // 부가세 상품가 포함
      shipping,
      total: subtotal + shipping,
      currency: 'KRW',
      customerEmail: customer.email,
      customerPhone: '010-1234-5678',
      shippingName: customer.name || '홍길동',
      shippingPostcode: '04524',
      shippingAddress: '서울특별시 중구 세종대로 110',
      shippingAddressDetail: '서울시청 5층',
      deliveryRequest: '부재 시 경비실에 맡겨주세요',
      paymentMethod: '카드',
      paidAt: new Date(),
      userId: customer.id,
    },
  });

  for (const product of orderProducts) {
    await prisma.orderItem.create({
      data: {
        quantity: 1,
        price: product.price,
        productName: product.name,
        productSku: product.sku,
        orderId: order.id,
        productId: product.id,
      },
    });
  }

  console.log(`📋 주문 샘플 생성: ${order.orderNumber}`);

  console.log('✅ 데이터 시딩 완료!');
  console.log('\n📊 요약:');
  console.log(`👤 회원: ${await prisma.user.count()}명`);
  console.log(`📂 카테고리: ${await prisma.category.count()}개`);
  console.log(`📦 상품: ${await prisma.product.count()}개`);
  console.log(`📋 주문: ${await prisma.order.count()}건`);
  console.log(`⭐ 리뷰: ${await prisma.review.count()}개`);
  console.log('\n🔐 관리자 로그인:');
  console.log(`이메일: ${adminEmail}`);
  console.log('비밀번호: admin123');
}

main()
  .catch(e => {
    console.error('❌ 시딩 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
