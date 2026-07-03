#!/usr/bin/env node
// theme-from-url / extract-layout.mjs  (2단계 — 레이아웃 카피)
// ────────────────────────────────────────────────────────────────────────────
// 목표: 참조 사이트의 레이아웃을 "규칙기반 분류기로 라벨링"하는 대신(구버전
//   extract-structure.mjs 는 중첩 깊은 현대 사이트에서 오탐하여 폐기),
//   에이전트(LLM)가 직접 보고 우리 React+Tailwind 로 재현할 수 있도록
//   ① 풀페이지 스크린샷 ② 정제된 DOM 아웃라인(계산된 주요 스타일 포함)
//   두 산출물을 만든다. "분류"는 사람/에이전트가, 이 스크립트는 "충실한 관찰"만.
//
// 산출물: <outDir>/layout/
//   - screenshot.png        전체 페이지 풀샷(뷰포트 폭 고정, 세로 전체)
//   - screenshot-fold.png   첫 화면(above-the-fold)만
//   - dom-outline.json      섹션 후보 트리 + 각 노드의 핵심 계산 스타일·기하·요약
//   - meta.json             url·viewport·추출 요약(섹션 수 등)
//
// 사용: node extract-layout.mjs <url> [--out <dir>] [--width <px>] [--max-nodes <n>]
// 요구: playwright-core + Chromium (extract.mjs 와 동일 전제)
//
// 안전 경계: 이 스크립트는 관찰만 한다. 프로젝트 파일을 수정하지 않는다.
//   재현(우리 컴포넌트 재조립)은 에이전트가 산출물을 근거로 별도 수행하며,
//   그 단계에서 미리보기·백업·--write 게이트(1단계 철학)를 지킨다.

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function parseArgs(argv) {
  const args = { url: null, out: '.theme-from-url', width: 1440, maxNodes: 120 };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--out') args.out = rest[++i];
    else if (a === '--width') args.width = Number(rest[++i]) || args.width;
    else if (a === '--max-nodes') args.maxNodes = Number(rest[++i]) || args.maxNodes;
    else if (!a.startsWith('--') && !args.url) args.url = a;
  }
  return args;
}

// dembrandt 안의 playwright-core 를 재사용한다(extract.mjs 와 동일 전략).
// node_modules/dembrandt/dist/lib/browser.js 의 loadBrowserEngines() 가
// chromium 을 돌려준다. dembrandt 가 없으면 playwright-core 직접 폴백.
async function getChromium() {
  // 1) dembrandt 경유 시도(설치 절차가 이미 이 경로를 보장)
  try {
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
    if (pkgDir) {
      const browserUrl = pathToFileURL(
        path.join(pkgDir, 'dist/lib/browser.js')
      ).href;
      const { loadBrowserEngines } = await import(browserUrl);
      const { chromium } = await loadBrowserEngines();
      if (chromium) return chromium;
    }
  } catch {
    /* 폴백으로 진행 */
  }
  // 2) playwright-core 직접
  try {
    const { chromium } = await import('playwright-core');
    return chromium;
  } catch (e) {
    throw new Error(
      'Chromium 을 불러오지 못했습니다. 설치를 확인하세요.\n' +
        '  npm i -D dembrandt playwright-core && npx playwright install chromium\n' +
        '원인: ' + (e?.message || e)
    );
  }
}

// 브라우저 컨텍스트(page.evaluate) 안에서 실행되는 DOM 분석 함수.
// "섹션 후보"를 규칙으로 라벨링하지 않는다 — 큰 블록의 골격·핵심 스타일·요약을
// 충실히 수집만 하고, 판단은 에이전트에게 넘긴다.
function domOutlineInBrowser(maxNodes) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');
  const round = n => Math.round(n);

  // 섹션 후보 = body 하위에서 "뷰포트 폭의 상당 부분을 차지하는" 블록.
  // 깊이에 상관없이, 부모보다 의미있게 넓거나 <section>/<header>/<footer> 태그면 후보.
  const isBlockish = el => {
    const d = getComputedStyle(el).display;
    return /block|flex|grid|table|list-item|flow-root/.test(d);
  };

  const candidates = [];
  const seen = new Set();

  const collect = (el, depth) => {
    if (!el || depth > 6 || candidates.length > maxNodes * 4) return;
    for (const child of el.children) {
      const tag = child.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'template', 'svg'].includes(tag)) continue;
      const rect = child.getBoundingClientRect();
      const wideEnough = rect.width >= vw * 0.6;
      const tallEnough = rect.height >= 40;
      const semantic = /^(section|header|footer|main|nav|article|aside)$/.test(tag);
      if ((wideEnough && tallEnough) || semantic) {
        if (!seen.has(child)) {
          seen.add(child);
          candidates.push({ el: child, depth });
        }
        // 섹션 안쪽으로 한 단계 더 들어가 하위 섹션도 잡되, 이미 큰 섹션이면 얕게.
        collect(child, depth + 1);
      } else {
        collect(child, depth + 1);
      }
    }
  };
  collect(document.body, 0);

  // 문서 순서(위→아래) 정렬을 위해 top 좌표 기준 정렬. 그다음 상위 maxNodes 만.
  const withGeom = candidates.map(({ el, depth }) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // 화면 밖(음수 top이 매우 큰) 노드나 0높이 제외
    return { el, depth, rect, cs, top: rect.top + window.scrollY };
  });
  withGeom.sort((a, b) => a.top - b.top || a.depth - b.depth);

  const nodes = [];
  for (const { el, depth, rect, cs } of withGeom) {
    if (nodes.length >= maxNodes) break;
    const tag = el.tagName.toLowerCase();
    if (rect.height < 40 || rect.width < vw * 0.5) {
      // 작은 것도 <section>/<nav> 등 의미태그면 살림
      if (!/^(section|header|footer|nav|article)$/.test(tag)) continue;
    }
    // 뷰포트 3배를 초과하는 블록은 "섹션"이 아니라 전체를 감싸는 래퍼/컨테이너다.
    // (구버전 분류기가 이걸 hero/grid로 오탐했던 지점) — 에이전트 노이즈이므로 제외.
    // 단, <section>/<main> 의미태그는 참고용으로 남긴다.
    if (rect.height > vh * 3 && !/^(section|main|article)$/.test(tag)) continue;

    // 반복 자식 감지(그리드/카드 리스트 힌트) — 같은 태그·비슷한 크기의 자식 묶음.
    const kids = Array.from(el.children).filter(c => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const kidTags = {};
    for (const k of kids) {
      const t = k.tagName.toLowerCase();
      kidTags[t] = (kidTags[t] || 0) + 1;
    }
    const repeated = Object.entries(kidTags)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])[0];

    const imgCount = el.querySelectorAll('img, picture, [style*="background-image"]').length;
    const btnCount = el.querySelectorAll('a[class*="btn"], button, [role="button"]').length;
    const hasForm = !!el.querySelector('form, input, textarea');
    const headings = Array.from(el.querySelectorAll('h1,h2,h3'))
      .slice(0, 3)
      .map(h => clip(h.textContent.trim(), 60))
      .filter(Boolean);
    // 이 노드 "직접" 텍스트(자식 섹션 텍스트 제외 목적의 근사) 요약
    const ownText = clip((el.textContent || '').replace(/\s+/g, ' ').trim(), 120);

    const bg = cs.backgroundColor;
    const bgImg = cs.backgroundImage && cs.backgroundImage !== 'none' ? 'yes' : 'no';

    nodes.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      class: clip(el.className && typeof el.className === 'string' ? el.className : '', 120) || undefined,
      depth,
      box: {
        w: round(rect.width),
        h: round(rect.height),
        // 뷰포트 대비 높이 비율(히어로/풀블리드 판단에 유용)
        vhRatio: Math.round((rect.height / vh) * 100) / 100,
      },
      layout: {
        display: cs.display,
        flexDirection: /flex/.test(cs.display) ? cs.flexDirection : undefined,
        gridCols:
          /grid/.test(cs.display) && cs.gridTemplateColumns !== 'none'
            ? cs.gridTemplateColumns.split(' ').length
            : undefined,
        gap: cs.gap && cs.gap !== 'normal' ? cs.gap : undefined,
        padding: cs.padding,
        maxWidth: cs.maxWidth !== 'none' ? cs.maxWidth : undefined,
        textAlign: cs.textAlign,
      },
      style: {
        bg: bg === 'rgba(0, 0, 0, 0)' ? undefined : bg,
        bgImage: bgImg === 'yes' ? 'yes' : undefined,
        color: cs.color,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
      },
      content: {
        headings: headings.length ? headings : undefined,
        repeatedChild: repeated ? { tag: repeated[0], count: repeated[1] } : undefined,
        imgCount: imgCount || undefined,
        btnCount: btnCount || undefined,
        hasForm: hasForm || undefined,
        text: ownText || undefined,
      },
    });
  }

  return { viewport: { w: vw, h: vh }, sectionCount: nodes.length, nodes };
}

async function main() {
  const { url, out, width, maxNodes } = parseArgs(process.argv);
  if (!url) {
    console.error('사용법: node extract-layout.mjs <url> [--out <dir>] [--width <px>] [--max-nodes <n>]');
    process.exit(2);
  }

  const chromium = await getChromium();
  console.error(`[layout] 브라우저 실행 → ${url}  (width=${width})`);
  const browser = await chromium.launch({ headless: true });

  const outDir = resolve(process.cwd(), out, 'layout');
  await mkdir(outDir, { recursive: true });

  let outline;
  try {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(async () => {
      // networkidle 이 안 잡히는 동적 사이트 폴백
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    });
    // 지연 로드 콘텐츠를 위해 천천히 스크롤(레이지 이미지·섹션 트리거)
    await page.evaluate(async () => {
      await new Promise(res => {
        let y = 0;
        const step = () => {
          window.scrollTo(0, y);
          y += window.innerHeight;
          if (y < document.body.scrollHeight && y < 20000) setTimeout(step, 120);
          else {
            window.scrollTo(0, 0);
            setTimeout(res, 300);
          }
        };
        step();
      });
    });
    await page.waitForTimeout(500);

    // ① above-the-fold
    await page.screenshot({ path: resolve(outDir, 'screenshot-fold.png'), fullPage: false });
    // ② 풀페이지
    await page.screenshot({ path: resolve(outDir, 'screenshot.png'), fullPage: true });
    // ③ DOM 아웃라인
    outline = await page.evaluate(domOutlineInBrowser, maxNodes);

    await context.close();
  } finally {
    await browser.close();
  }

  const outlinePath = resolve(outDir, 'dom-outline.json');
  await writeFile(
    outlinePath,
    JSON.stringify({ url, width, ...outline }, null, 2),
    'utf8'
  );
  const metaPath = resolve(outDir, 'meta.json');
  await writeFile(
    metaPath,
    JSON.stringify(
      {
        url,
        width,
        viewport: outline.viewport,
        sectionCount: outline.sectionCount,
        files: {
          screenshotFull: 'screenshot.png',
          screenshotFold: 'screenshot-fold.png',
          domOutline: 'dom-outline.json',
        },
        note:
          '이 산출물은 관찰용이다. 재현은 에이전트가 screenshot.png(눈)와 ' +
          'dom-outline.json(골격·스타일)을 함께 근거로 우리 React+Tailwind 섹션을 ' +
          '재조립하여 수행한다. SKILL.md 2단계 워크플로우 참고.',
      },
      null,
      2
    ),
    'utf8'
  );

  console.error('');
  console.error(`[layout] 완료`);
  console.error(`  screenshot  : ${resolve(outDir, 'screenshot.png')}`);
  console.error(`  fold        : ${resolve(outDir, 'screenshot-fold.png')}`);
  console.error(`  dom-outline : ${outlinePath}`);
  console.error(`  섹션 후보   : ${outline.sectionCount}개  (viewport ${outline.viewport.w}×${outline.viewport.h})`);
  if (outline.sectionCount <= 2) {
    console.error(
      '  ⚠️ 섹션 후보가 2개 이하 — 동적/SPA 사이트일 수 있음. 스크린샷을 우선 근거로 삼을 것.'
    );
  }

  // 에이전트/후속 도구가 받아쓰기 좋게 outDir 경로만 stdout 으로
  process.stdout.write(outDir + '\n');
}

main().catch(e => {
  console.error('[layout] 실패:', e?.stack || e);
  process.exit(1);
});
