// L01 실습 — 상품 등록 MCP 서버
// AI(Claude Code/Codex)가 이 서버의 도구(create_product)를 호출해 상품을 DB에 등록한다.
// 가드레일: 항상 status='DRAFT'로 등록 → AI가 만든 상품이 바로 공개되지 않는다(사람이 검수 후 PUBLISHED).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = new McpServer({ name: 'product-server', version: '1.0.0' });

// 도구 1: 카테고리 목록 (AI가 categoryId를 알아야 상품을 넣을 수 있음)
server.tool(
  'list_categories',
  '상품 등록에 필요한 카테고리 id/이름 목록을 반환한다.',
  {},
  async () => {
    const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
    return { content: [{ type: 'text', text: JSON.stringify(cats, null, 2) }] };
  },
);

// 도구 2: 상품 등록 (핵심). AI가 name/price/description/categoryId를 채워 호출.
server.tool(
  'create_product',
  '새 상품을 DB에 등록한다. 가드레일로 항상 DRAFT 상태로 등록되며, 공개는 사람이 별도로 한다.',
  {
    name: z.string().describe('상품명'),
    price: z.number().describe('가격(원)'),
    description: z.string().describe('상품 설명(10자 이상)'),
    categoryId: z.string().describe('list_categories로 얻은 카테고리 id'),
    sku: z.string().optional().describe('상품 코드(선택)'),
  },
  async ({ name, price, description, categoryId, sku }) => {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')}-${Date.now()}`;
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        categoryId,
        sku: sku ?? `AI-${Date.now()}`,
        status: 'DRAFT', // ← 가드레일: AI 등록은 항상 초안
      },
    });
    return {
      content: [
        {
          type: 'text',
          text: `등록 완료(초안): id=${product.id}, name=${product.name}, status=${product.status}. /admin/products 에서 검수 후 공개하세요.`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
