# theme-from-url 2단계 설계 — 페이지 구조 추출·적용

> 1단계(색·radius 토큰 → CSS 변수 + 메인 하드코딩 색 치환)는 완료됨.
> 이 문서는 **커머스 페이지의 레이아웃 구조까지** 참조 사이트를 따라가게 하는 2단계 설계다.
> 사용자 확정 방향: **"섹션 구성·순서 참고"** 수준(픽셀 복제 아님).

## 1. 문제 정의
- dembrandt는 색·폰트·여백·radius "값"만 준다. "이 사이트가 히어로 다음에 무엇을
  어떤 순서로 배치하는가" 같은 **페이지 구조/섹션 시퀀스**는 주지 않는다.
- 커머스에서 사용자가 원하는 것: 참조 사이트의 **메인 섹션 구성·순서**와,
  **상품 상세 페이지 레이아웃**이 메인과 **일관된 디자인 언어**를 갖는 것.

## 2. 산출물 목표
`extract.mjs` 실행 시 `raw.json`(기존)에 더해 `structure.json` 생성:

```jsonc
{
  "main": {
    "sections": [
      { "type": "hero",         "height": "full",  "hasCta": true },
      { "type": "category-nav", "cols": 6 },
      { "type": "product-grid", "cols": 4, "title": true },
      { "type": "promo-banner", "aspect": "wide" },
      { "type": "product-grid", "cols": 4, "title": true },
      { "type": "newsletter" }
    ]
  }
}
```
- `type` 분류 셋(최소): `hero | category-nav | product-grid | promo-banner | newsletter | cta | feature-row`
- 각 섹션의 판별 힌트: 자식 요소 패턴(이미지 그리드 수, 반복 카드 수), 높이 비율, 텍스트/버튼 밀도.

## 3. 추출 방식 (dembrandt 재사용 + 우리 분석 레이어)
- extract 단계에서 Playwright로 **이미 페이지를 열고 있으므로**, 같은 `page` 객체에
  `page.evaluate()`로 DOM 구조 분석 스크립트를 추가 주입한다. (별도 브라우저 기동 불필요)
- 분석 스크립트 로직:
  1. `body` 직계~2depth에서 full-width 블록(섹션 후보)을 수집(`<section>`, 큰 `<div>`).
  2. 각 후보의 지표 추출: viewport 대비 높이, 반복 자식 수(카드 그리드 감지),
     이미지:텍스트 비율, 버튼 수, `<form>`/input 유무(뉴스레터·검색 감지).
  3. 규칙 기반 분류기로 `type` 라벨링(임계값은 상수로, 튜닝 가능하게).
- **주의**: 동적 렌더링/무한스크롤 사이트는 첫 뷰포트만 잡힐 수 있음 → `structure.json`에
  `confidence`와 `note`를 달아 저신호를 표시(1단계 경고 게이트와 동일 철학).

## 4. 적용 방식 — "섹션 구성·순서 참고"
픽셀 복제가 아니라 **우리 기존 섹션 컴포넌트를 참조 순서로 재배치**한다.

- 우리 메인은 이미 섹션 컴포넌트 조립 구조(`app/page.tsx`):
  `Hero → Stats → FeaturedProducts → NewArrivals → Newsletter`.
- 매핑 테이블(참조 type → 우리 컴포넌트):
  | 참조 type | 우리 컴포넌트 |
  |---|---|
  | hero | `<Hero/>` 섹션 |
  | product-grid | `<ProductGrid/>` 섹션(추천/신상품 재사용) |
  | promo-banner | 신규 `<PromoBanner/>` (없으면 생략 or 플레이스홀더) |
  | newsletter | `<NewsletterForm/>` 섹션 |
  | category-nav | 신규 `<CategoryNav/>` |
- 재배치 산출물: `app/page.tsx`의 섹션 순서를 `structure.json.main.sections` 순서로
  재조립. **없는 섹션은 건너뛰고, 우리에 없는 type은 생성하지 않고 로그로 알림**(과잉구현 금지).

### 상품 상세 일관성
- 상세(`app/(store)/products/[slug]/page.tsx`)는 구조를 통째로 바꾸지 않고,
  **메인과 같은 토큰(색·radius·간격 스케일)**을 쓰는지 점검·정렬하는 수준.
- 상세 고유 레이아웃(이미지 갤러리 좌 / 정보·구매박스 우 / 하단 리뷰)은 유지.
  참조 사이트 상세를 크롤링해 좌우 배치·구매박스 sticky 여부 정도만 옵션으로 반영.

## 5. 안전장치 (1단계 철학 계승)
- **미리보기 우선**: 재배치 diff를 먼저 출력, `--write` 없이는 `page.tsx` 미수정.
- **백업**: 수정 전 `app/page.tsx.bak` 생성.
- **불변식**: 참조에 섹션이 N개 잡혔는데 매핑 결과 0개면 중단(구조 유실 방지).
- **저신호 게이트**: 섹션 1개 이하만 잡히면(동적 사이트) 경고 후 `--force` 요구.
- **생성 금지 원칙**: 우리에 없는 섹션 컴포넌트를 임의 생성하지 않음. 필요 시 사용자에게 물음.

## 6. 구현 단계 제안
1. `scripts/extract-structure.mjs` (또는 extract.mjs에 `--with-structure` 플래그) — DOM 분석 → `structure.json`.
2. 규칙 기반 섹션 분류기 + 임계값 상수 + 유닛 테스트(합성 DOM 스냅샷 몇 개).
3. `scripts/apply-structure.mjs` — `structure.json` → `page.tsx` 섹션 재조립(미리보기/‑‑write).
4. 매핑 테이블·미보유 섹션 처리 규칙을 SKILL.md에 문서화.
5. 검증: LG/무신사 각각으로 추출→재배치→메인 스크린샷 비교.

## 7. 리스크·미결
- 섹션 분류 정확도가 규칙 기반이라 사이트별 편차 큼 → 임계값 튜닝 필요, 저신호 표시로 방어.
- `page.tsx` 코드 재조립은 문자열 조작보다 **AST(예: 섹션 마커 주석 기반 블록 스왑)**가 안전할 수 있음 → 구현 시 재검토.
- 교육 베이스레포 특성상 **과잉구현 경계**: "섹션 순서 재배치 + 토큰 일관성"까지가 적정선.
  픽셀 복제·신규 섹션 대량 생성은 범위 밖.
