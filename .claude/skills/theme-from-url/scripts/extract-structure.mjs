#!/usr/bin/env node
// ⚠️ 실험/재검토 대상 (2026-07-01): 아래 body-직계-자식 휴리스틱은 중첩이 깊은
//    현대 사이트(LG=전체 래퍼를 섹션으로 오탐, 무신사=SPA로 2섹션만)에서 실패 확인.
//    사용자 목표가 "섹션 순서 참고"→"레퍼런스 레이아웃을 거의 100% 카피"로 상향되어,
//    이 분류기 접근은 다음 세션에서 재설계 예정(스크린샷+DOM 기반 등). 그대로 쓰지 말 것.
// theme-from-url / extract-structure.mjs
// 참조 사이트의 "메인 섹션 구성·순서"를 추출한다(2단계).
// dembrandt(색·토큰)와 별개로, 같은 Playwright 로 페이지를 열고 DOM 을 분석해
// 섹션 시퀀스를 규칙 기반으로 분류한다. 픽셀 복제가 아니라 "무엇을 어떤 순서로" 만 뽑는다.
//
// 산출물: <outDir>/structure.json
//   { url, extractedAt(호출측 스탬프), viewport, sections:[{type, ...지표}], confidence, note? }
//
// 사용: node extract-structure.mjs <url> [--out <dir>]
// 요구: playwright-core + Chromium (extract.mjs 와 동일 전제)

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function parseArgs(argv) {
  const args = { url: null, out: '.theme-from-url' };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--out') args.out = rest[++i];
    else if (!a.startsWith('--') && !args.url) args.url = a;
  }
  return args;
}

// dembrandt 의 playwright-core 로더를 재사용(경로 우회 방식은 extract.mjs 와 동일)
async function loadChromium() {
  let dir = process.cwd();
  let pkgDir = null;
  for (;;) {
    const cand = path.join(dir, 'node_modules', 'dembrandt');
    if (existsSync(path.join(cand, 'dist', 'lib', 'browser.js'))) {
      pkgDir = cand;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!pkgDir) throw new Error('node_modules/dembrandt 를 찾지 못했습니다.');
  const browserUrl = pathToFileURL(path.join(pkgDir, 'dist/lib/browser.js')).href;
  const { loadBrowserEngines } = await import(browserUrl);
  const { chromium } = await loadBrowserEngines();
  return chromium;
}

// 페이지 안에서 실행될 섹션 분석기.
// body 하위의 "full-width 후보 블록"을 순서대로 훑어 지표를 뽑고 type 을 분류한다.
// 규칙은 보수적으로(오분류보다 unknown 을 택함).
function inPageAnalyzer() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 섹션 후보: <section>, <header>, 또는 body 직계~2depth 의 넓은 블록
  const candidates = [];
  const seen = new Set();
  const pushIf = el => {
    if (!el || seen.has(el)) return;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    // full-width 에 가깝고(뷰포트 폭의 70%+) 최소 높이가 있는 것만
    if (rect.width < vw * 0.7 || rect.height < 80) return;
    seen.add(el);
    candidates.push(el);
  };

  // 우선 명시적 시맨틱 태그
  document.querySelectorAll('body > *, body > * > *').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (['section', 'header', 'footer'].includes(tag)) pushIf(el);
  });
  // 그다음 body 직계 큰 div(위에서 안 잡힌 것)
  document.querySelectorAll('body > div, main > *').forEach(pushIf);

  // 문서 순서대로 정렬
  candidates.sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  function metrics(el) {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const heightRatio = rect.height / vh;
    const imgs = el.querySelectorAll('img, picture, [style*="background-image"]').length;
    const headings = el.querySelectorAll('h1, h2, h3').length;
    const buttons = el.querySelectorAll(
      'button, a[class*="btn"], a[class*="button"], [role="button"]'
    ).length;
    const links = el.querySelectorAll('a').length;
    const forms = el.querySelectorAll('form, input[type="email"], input[type="search"]').length;
    const inputs = el.querySelectorAll('input, textarea').length;
    // 반복 카드 감지: 동일 태그·유사 클래스의 형제 묶음 중 최대 개수
    let maxRepeat = 0;
    let repeatCols = 0;
    el.querySelectorAll('ul, ol, div').forEach(container => {
      const kids = Array.from(container.children);
      if (kids.length < 3) return;
      const byClass = {};
      kids.forEach(k => {
        const key = k.tagName + '|' + (k.className || '').toString().slice(0, 40);
        byClass[key] = (byClass[key] || 0) + 1;
      });
      const top = Math.max(...Object.values(byClass));
      if (top > maxRepeat) {
        maxRepeat = top;
        // 대략의 열 수: 컨테이너 폭 / 첫 카드 폭
        const first = kids[0]?.getBoundingClientRect?.();
        const cw = container.getBoundingClientRect().width;
        repeatCols = first && first.width > 0 ? Math.round(cw / first.width) : 0;
      }
    });
    const text = (el.textContent || '').trim().length;
    return {
      tag,
      top: Math.round(rect.top + window.scrollY),
      height: Math.round(rect.height),
      heightRatio: +heightRatio.toFixed(2),
      imgs,
      headings,
      buttons,
      links,
      forms,
      inputs,
      maxRepeat,
      repeatCols,
      textLen: text,
    };
  }

  function classify(m, index, total) {
    // footer 태그는 명시적으로
    if (m.tag === 'footer') return 'footer';
    // 뉴스레터/구독: 폼 + email/검색 input
    if (m.forms >= 1 && m.inputs >= 1 && m.maxRepeat < 3) return 'newsletter';
    // 히어로: 상단부(초반 인덱스) + 큰 높이 + 헤딩 있고 반복카드 적음
    if (index <= 1 && m.heightRatio >= 0.4 && m.headings >= 1 && m.maxRepeat < 3) {
      return 'hero';
    }
    // 상품 그리드: 반복 요소 4개 이상 + 이미지 다수
    if (m.maxRepeat >= 4 && m.imgs >= m.maxRepeat * 0.7) return 'product-grid';
    // 카테고리 내비: 반복 링크 6개+ 인데 이미지 적고 텍스트 짧음
    if (m.maxRepeat >= 6 && m.links >= 6 && m.textLen < 400) return 'category-nav';
    // 프로모 배너: 넓고 이미지 위주, 반복 적고 버튼 1~2
    if (m.imgs >= 1 && m.maxRepeat < 3 && m.heightRatio >= 0.2 && m.buttons <= 3) {
      return 'promo-banner';
    }
    // CTA 밴드: 헤딩 + 버튼, 이미지 거의 없음
    if (m.headings >= 1 && m.buttons >= 1 && m.imgs === 0) return 'cta';
    return 'unknown';
  }

  const raw = candidates.map(metrics);
  const sections = raw.map((m, i) => ({ type: classify(m, i, raw.length), ...m }));
  return { viewport: { width: vw, height: vh }, sections };
}

async function main() {
  const { url, out } = parseArgs(process.argv);
  if (!url) {
    console.error('사용법: node extract-structure.mjs <url> [--out <dir>]');
    process.exit(2);
  }

  const chromium = await loadChromium();
  console.error(`[structure] 브라우저 실행 → ${url}`);
  const browser = await chromium.launch({ headless: true });
  let analyzed;
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(async () => {
      // networkidle 실패 시 domcontentloaded 로 폴백
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    });
    await page.waitForTimeout(1500); // lazy 섹션 약간 대기
    analyzed = await page.evaluate(inPageAnalyzer);
  } finally {
    await browser.close();
  }

  // 신뢰도: unknown 비율이 높거나 섹션이 2개 이하면 저신호
  const total = analyzed.sections.length;
  const known = analyzed.sections.filter(s => s.type !== 'unknown').length;
  let confidence = 'high';
  let note;
  if (total <= 2) {
    confidence = 'low';
    note = '섹션이 2개 이하만 감지됨(동적/무한스크롤 사이트 가능성).';
  } else if (known / total < 0.5) {
    confidence = 'medium';
    note = 'unknown 섹션 비율이 높음. 분류 임계값 튜닝 필요 가능성.';
  }

  const result = {
    url,
    viewport: analyzed.viewport,
    sectionCount: total,
    sections: analyzed.sections,
    confidence,
    ...(note ? { note } : {}),
  };

  const outDir = resolve(process.cwd(), out);
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, 'structure.json');
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');

  console.error('');
  console.error(`[structure] 완료: ${outPath}`);
  console.error(`  섹션 ${total}개 (분류됨 ${known}, unknown ${total - known}), 신뢰도 ${confidence}`);
  if (note) console.error(`  ⚠ ${note}`);
  console.error('  시퀀스:');
  analyzed.sections.forEach((s, i) =>
    console.error(
      `   ${String(i + 1).padStart(2)}. ${s.type.padEnd(13)} h:${s.height}px(${s.heightRatio}vh) imgs:${s.imgs} repeat:${s.maxRepeat} btn:${s.buttons} form:${s.forms}`
    )
  );

  process.stdout.write(outPath + '\n');
}

main().catch(e => {
  console.error('[structure] 실패:', e?.stack || e);
  process.exit(1);
});
