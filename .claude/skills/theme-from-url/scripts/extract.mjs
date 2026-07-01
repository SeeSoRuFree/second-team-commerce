#!/usr/bin/env node
// theme-from-url / extract.mjs
// 공개 웹사이트의 디자인 토큰(색·타이포·여백·반경)을 추출한다.
// dembrandt를 CLI로 shell-out 하지 않고 "라이브러리"로 직접 import 한다.
//   - extractBranding(url, spinner, browser, options) 를 그대로 호출
//   - includeRawColors: true 로 colors.rawColors 까지 채운다(브랜드색 원본 보존)
// 산출물: <outDir>/raw.json  (dembrandt 원본 BrandingResult 전체)
//
// 사용: node extract.mjs <url> [--out <dir>]
// 요구: 프로젝트에 dembrandt + playwright-core 설치되어 있어야 함
//        (SKILL.md의 설치 절차 참고)

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

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

// dembrandt 내부 spinner 인터페이스(Spinner)를 no-op 으로 충족.
// text setter/getter 와 start/stop/succeed/fail/warn/info 만 있으면 된다.
function makeSilentSpinner() {
  const spinner = {
    text: '',
    start() {
      return spinner;
    },
    stop() {
      return spinner;
    },
    succeed() {
      return spinner;
    },
    fail() {
      return spinner;
    },
    warn(t) {
      if (t) console.error('[dembrandt:warn]', t);
      return spinner;
    },
    info() {
      return spinner;
    },
  };
  return spinner;
}

async function main() {
  const { url, out } = parseArgs(process.argv);
  if (!url) {
    console.error('사용법: node extract.mjs <url> [--out <dir>]');
    process.exit(2);
  }

  // 라이브러리로 import — 실제 함수가 있는 모듈 파일을 직접 참조한다.
  // dembrandt 의 package.json "exports" 맵은 extractors 서브패스를 노출하지 않으므로
  // (메인 index.js 는 CLI 전용, export 없음) node_modules 안의 물리 경로를 직접 resolve 한다.
  let extractBranding, loadBrowserEngines;
  try {
    // dembrandt 의 package.json "exports" 맵이 내부 파일/`./package.json` 노출을 막으므로
    // node_modules/dembrandt 디렉터리를 cwd 에서 위로 걸어 올라가며 찾아 물리 경로로 import 한다.
    const { existsSync } = await import('node:fs');
    const { pathToFileURL } = await import('node:url');
    const path = await import('node:path');
    let dir = process.cwd();
    let pkgDir = null;
    for (;;) {
      const cand = path.join(dir, 'node_modules', 'dembrandt');
      if (existsSync(path.join(cand, 'dist', 'lib', 'extractors', 'index.js'))) {
        pkgDir = cand;
        break;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!pkgDir) throw new Error('node_modules/dembrandt 를 찾지 못했습니다.');
    const extractorsUrl = pathToFileURL(
      path.join(pkgDir, 'dist/lib/extractors/index.js')
    ).href;
    const browserUrl = pathToFileURL(
      path.join(pkgDir, 'dist/lib/browser.js')
    ).href;
    ({ extractBranding } = await import(extractorsUrl));
    ({ loadBrowserEngines } = await import(browserUrl));
  } catch (e) {
    console.error(
      '[extract] dembrandt 라이브러리를 불러오지 못했습니다. 설치 여부를 확인하세요.\n' +
        '  npm i -D dembrandt playwright-core && npx playwright install chromium\n' +
        '원인:',
      e?.message || e
    );
    process.exit(1);
  }

  const { chromium } = await loadBrowserEngines();
  const spinner = makeSilentSpinner();

  console.error(`[extract] 브라우저 실행 → ${url}`);
  const browser = await chromium.launch({ headless: true });

  let result;
  try {
    result = await extractBranding(url, spinner, browser, {
      navigationTimeout: 90000,
      verbose: false,
      includeRawColors: true, // colors.rawColors 까지 채움(브랜드색 원본 보존)
      _version: 'theme-from-url',
    });
  } finally {
    await browser.close();
  }

  const outDir = resolve(process.cwd(), out);
  await mkdir(outDir, { recursive: true });
  const rawPath = resolve(outDir, 'raw.json');
  await writeFile(rawPath, JSON.stringify(result, null, 2), 'utf8');

  // 사람이 읽을 요약을 stderr 로(파이프 오염 방지). raw.json 경로는 stdout 으로.
  const palette = result?.colors?.palette ?? [];
  const rawColors = result?.colors?.rawColors ?? [];
  const semantic = result?.colors?.semantic ?? {};
  console.error('');
  console.error(`[extract] 완료: ${rawPath}`);
  console.error(`  site        : ${result?.siteName ?? '(unknown)'}`);
  console.error(`  palette     : ${palette.length}개`);
  console.error(`  rawColors   : ${rawColors.length}개`);
  console.error(
    `  semantic    : ${Object.keys(semantic).length ? JSON.stringify(semantic) : '(없음)'}`
  );
  const top = [...palette]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 6)
    .map(
      c =>
        `${c.normalized}(score:${c.score ?? '-'},count:${c.count ?? '-'},${c.confidence})`
    );
  console.error(`  top colors  : ${top.join('  ') || '(없음)'}`);
  const styles = result?.typography?.styles ?? [];
  const heading = styles.find(s => /heading|display/.test(s.context)) ?? styles[0];
  const body = styles.find(s => s.context === 'body') ?? styles[0];
  console.error(`  font(head)  : ${heading?.family ?? '(미검출)'}`);
  console.error(`  font(body)  : ${body?.family ?? '(미검출)'}`);
  const radii = (result?.borderRadius?.values ?? [])
    .slice(0, 4)
    .map(v => `${v.value}(${v.count})`);
  console.error(`  radius      : ${radii.join('  ') || '(미검출)'}`);

  // raw.json 경로만 stdout 으로 → apply.mjs 가 받아쓰기 좋게
  process.stdout.write(rawPath + '\n');
}

main().catch(e => {
  console.error('[extract] 실패:', e?.stack || e);
  process.exit(1);
});
