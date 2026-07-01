#!/usr/bin/env node
// theme-from-url / apply.mjs
// extract.mjs 가 만든 raw.json(dembrandt BrandingResult)을 읽어
// 브랜드 색을 골라 shadcn HSL CSS 변수(styles/globals.css :root)에 적용한다.
//
// 설계 포인트(불변식/게이트):
//   1) 색 선택은 dembrandt 의 semantic → palette(score/count) → rawColors 순으로 폴백.
//      arvindrk 스킬의 버그(top-level colors.primary 만 읽어 색 유실)를 우회한다.
//   2) 불변식: "raw 에 색이 있으면 최종 선택도 반드시 있어야 한다."
//      raw 에 색이 있는데 선택 0개면 에러로 중단(조용한 유실 방지).
//   3) 경고 게이트: 후보 색이 0~1개뿐이면(동적/캔버스 사이트 가능성) 경고하고
//      --force 없이는 globals.css 를 건드리지 않는다.
//   4) 기본은 미리보기(dry-run). 실제 파일 수정은 --write 일 때만.
//
// 사용:
//   node apply.mjs --raw <raw.json> [--css <globals.css>] [--write] [--force]
//
// 미적용시(기본): 선택 결과 + 만들 :root 블록을 출력만 한다.

import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    raw: '.theme-from-url/raw.json',
    css: 'styles/globals.css',
    write: false,
    force: false,
  };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--raw') args.raw = rest[++i];
    else if (a === '--css') args.css = rest[++i];
    else if (a === '--write') args.write = true;
    else if (a === '--force') args.force = true;
  }
  return args;
}

// ---------- 색 변환 ----------

function normalizeHex(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  // #rgb → #rrggbb
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (m3) s = `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`;
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  // rgb(a) → hex
  const mr = /^rgba?\(([^)]+)\)$/.exec(s);
  if (mr) {
    const parts = mr[1].split(',').map(x => x.trim());
    const [r, g, b] = parts.map(Number);
    if ([r, g, b].every(v => Number.isFinite(v))) {
      const hx = v =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0');
      return `#${hx(r)}${hx(g)}${hx(b)}`;
    }
  }
  return null;
}

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

// shadcn 은 "H S% L%" 문자열(hsl() 래핑 없이)을 쓴다.
function hexToHslTriplet(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}

// 상대 휘도(WCAG) — 배경색에 맞는 전경색(흰/검) 판단용
function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function foregroundFor(hex) {
  // 밝으면 어두운 글자, 어두우면 흰 글자
  return relLuminance(hex) > 0.4 ? '222.2 47.4% 11.2%' : '0 0% 100%';
}

// 무채색(회색/검/흰) 여부 — 브랜드색 후보에서 배제할 때 사용
function isNeutral(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat < 0.12; // 채도 12% 미만이면 사실상 회색 계열
}

// ---------- 색 선택 (핵심) ----------

// dembrandt 결과에서 브랜드색 후보를 점수순으로 뽑는다.
// semantic.primary 를 최우선, 그다음 palette(무채색 제외, score/count 순),
// 그래도 없으면 rawColors 로 폴백.
function selectBrandColors(colors) {
  const candidates = [];

  const push = (hex, reason, extra = {}) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    candidates.push({ hex: norm, reason, ...extra });
  };

  // 1) semantic (dembrandt 가 의미부여한 색) — 최우선.
  //    단, dembrandt semantic.primary 는 종종 "지배적 텍스트색(검정 계열)"이라
  //    무채색이면 브랜드색으로 보지 않고 건너뛴다(유채색만 채택).
  const semantic = colors?.semantic ?? {};
  for (const key of ['primary', 'brand', 'accent', 'cta', 'main']) {
    const hex = normalizeHex(semantic[key]);
    if (hex && !isNeutral(hex)) push(hex, `semantic.${key}`);
  }

  // 2) palette — score(문맥 관련도) 우선, 무채색 제외
  const palette = (colors?.palette ?? [])
    .map(c => ({ ...c, hex: normalizeHex(c.normalized || c.color) }))
    .filter(c => c.hex);
  const chromatic = palette.filter(c => !isNeutral(c.hex));
  chromatic
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.count ?? 0) - (a.count ?? 0))
    .forEach(c =>
      push(c.hex, `palette(score:${c.score ?? '-'},count:${c.count ?? '-'})`, {
        score: c.score,
        count: c.count,
        confidence: c.confidence,
      })
    );

  // 3) rawColors 폴백 (palette 가 비었을 때만)
  if (candidates.length === 0) {
    (colors?.rawColors ?? [])
      .map(c => ({ ...c, hex: normalizeHex(c.normalized || c.color) }))
      .filter(c => c.hex && !isNeutral(c.hex))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.count ?? 0) - (a.count ?? 0))
      .forEach(c => push(c.hex, `rawColors(count:${c.count ?? '-'})`));
  }

  // 중복 hex 제거(첫 등장 우선 = 가장 높은 우선순위 유지)
  const seen = new Set();
  const unique = candidates.filter(c => {
    if (seen.has(c.hex)) return false;
    seen.add(c.hex);
    return true;
  });
  return unique;
}

// raw 에 "색이 존재하는가"의 판정 — 불변식 검사에 사용.
// palette/rawColors/semantic 중 하나라도 유효 hex 가 있으면 true.
function rawHasColors(colors) {
  const pools = [colors?.palette, colors?.rawColors].filter(Boolean);
  for (const pool of pools) {
    for (const c of pool) {
      if (normalizeHex(c.normalized || c.color)) return true;
    }
  }
  for (const v of Object.values(colors?.semantic ?? {})) {
    if (normalizeHex(v)) return true;
  }
  return false;
}

// ---------- globals.css 패치 ----------

// :root 블록 안의 특정 변수 값만 치환. 없으면 건드리지 않음.
function patchRootVar(css, name, value) {
  const re = new RegExp(`(:root[\\s\\S]*?--${name}:\\s*)([^;]+)(;)`);
  if (!re.test(css)) return { css, changed: false };
  return { css: css.replace(re, `$1${value}$3`), changed: true };
}

async function main() {
  const args = parseArgs(process.argv);
  const rawPath = resolve(process.cwd(), args.raw);
  const cssPath = resolve(process.cwd(), args.css);

  let raw;
  try {
    raw = JSON.parse(await readFile(rawPath, 'utf8'));
  } catch (e) {
    console.error(`[apply] raw.json 을 읽지 못했습니다: ${rawPath}\n`, e?.message || e);
    process.exit(1);
  }

  const colors = raw?.colors ?? {};
  const selected = selectBrandColors(colors);

  // --- 불변식: raw 에 색이 있는데 선택 0개면 버그로 간주하고 중단 ---
  if (rawHasColors(colors) && selected.length === 0) {
    console.error(
      '[apply] 불변식 위반: raw.json 에는 색이 있는데 브랜드색 선택이 0개입니다.\n' +
        '        (색 유실 버그) 선택 로직을 점검하세요. 파일은 수정하지 않았습니다.'
    );
    process.exit(3);
  }

  // --- 경고 게이트 ---
  //   · 후보 0개  → 하드 블록(동적/캔버스 사이트로 간주, --force 없이는 중단)
  //   · 후보 1개  → 그 하나가 강신호(high 신뢰도 또는 count≥50)면 경고만 하고 진행,
  //                약신호면 --force 요구
  //   · 후보 2개+ → 정상 진행
  const top = selected[0];
  const strongSingle =
    !!top && (top.confidence === 'high' || (top.count ?? 0) >= 50);
  const lowSignal =
    selected.length === 0 || (selected.length === 1 && !strongSingle);

  const primary = selected[0]?.hex ?? null;
  // accent 는 primary 와 다른 두 번째 유채색 우선
  const accent = selected.find(c => c.hex !== primary)?.hex ?? primary;

  // 반경(radius): 단일 px 값만 후보로. 제외 대상 —
  //   · "0px 0px 16px 16px" 같은 네 모서리 shorthand(공백 포함)
  //   · "0px"(반경 없음), "50%"·"100px" 같은 pill/원형(%·과대값)
  // 남은 것 중 최빈값을 base radius 로 채택.
  const radiusVal = (raw?.borderRadius?.values ?? [])
    .filter(v => {
      const s = v?.value?.trim();
      if (!s || /\s/.test(s) || s.includes('%')) return false;
      const px = /^(\d+(?:\.\d+)?)px$/.exec(s);
      if (!px) return false;
      const n = parseFloat(px[1]);
      return n > 0 && n <= 24; // 0 제외, 24px 초과(pill성)는 base 로 부적합
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0]?.value;

  // 미리보기 출력
  console.error('');
  console.error(`[apply] 대상 CSS : ${cssPath}`);
  console.error(`[apply] 후보 색   : ${selected.length}개`);
  selected.slice(0, 6).forEach((c, i) =>
    console.error(`   ${i === 0 ? '★' : ' '} ${c.hex}  (${c.reason})  → hsl ${hexToHslTriplet(c.hex)}`)
  );
  console.error('');
  console.error('[apply] 적용 예정 값:');
  if (primary) {
    console.error(`   --primary            : ${hexToHslTriplet(primary)}   (${primary})`);
    console.error(`   --primary-foreground : ${foregroundFor(primary)}`);
    console.error(`   --ring               : ${hexToHslTriplet(primary)}`);
    console.error(`   --accent             : ${hexToHslTriplet(accent)}   (${accent})`);
    console.error(`   --accent-foreground  : ${foregroundFor(accent)}`);
  }
  if (radiusVal) console.error(`   --radius             : ${radiusVal}`);

  if (lowSignal && !args.force) {
    console.error('');
    if (selected.length === 0) {
      console.error(
        '[apply] ⚠ 브랜드색 후보가 0개입니다(동적/캔버스 사이트 가능성). ' +
          '적용하려면 --force 를 붙이세요. 지금은 파일을 수정하지 않습니다.'
      );
      process.exit(4);
    } else {
      console.error(
        '[apply] ⚠ 후보 색이 1개뿐이고 신호가 약합니다. ' +
          '적용하려면 --force 를 붙이세요. 지금은 파일을 수정하지 않습니다.'
      );
      process.exit(0);
    }
  }

  // 단일이지만 강신호면 경고만 남기고 진행
  if (selected.length === 1 && strongSingle) {
    console.error(
      '[apply] ℹ 후보 색이 1개이지만 신호가 강해(high/충분한 빈도) 진행합니다.'
    );
  }

  if (!args.write) {
    console.error('');
    console.error('[apply] (미리보기) 실제 적용하려면 --write 를 붙이세요.');
    return;
  }

  // --- 실제 적용 ---
  let css = await readFile(cssPath, 'utf8');
  await copyFile(cssPath, cssPath + '.bak'); // 원복용 백업
  const changes = [];
  const apply = (name, value) => {
    if (value == null) return;
    const r = patchRootVar(css, name, value);
    css = r.css;
    changes.push(`--${name}: ${value}${r.changed ? '' : '  (미발견, 건너뜀)'}`);
  };

  apply('primary', hexToHslTriplet(primary));
  apply('primary-foreground', foregroundFor(primary));
  apply('ring', hexToHslTriplet(primary));
  apply('accent', hexToHslTriplet(accent));
  apply('accent-foreground', foregroundFor(accent));
  if (radiusVal) apply('radius', radiusVal);

  await writeFile(cssPath, css, 'utf8');
  console.error('');
  console.error(`[apply] 적용 완료 → ${cssPath} (백업: ${cssPath}.bak)`);
  changes.forEach(c => console.error('   ' + c));
}

main().catch(e => {
  console.error('[apply] 실패:', e?.stack || e);
  process.exit(1);
});
