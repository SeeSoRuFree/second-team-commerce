# 세컨팀 커머스 (교육용 쇼핑몰 베이스)

AI 에이전트 실습을 위한 **한국식 커머스 베이스 쇼핑몰**입니다.
Next.js 15 + Prisma + SQLite 기반이라 별도 DB 설치(PostgreSQL/Docker)나 외부 계정 없이
**clone → 설치 → 실행** 3단계로 바로 뜹니다. 이 코드 위에 AI 에이전트 기능(상품등록 자동화,
추천·상담 챗봇, CS 멀티에이전트 등)을 붙여 나가는 것이 목표입니다.

## 필요 환경
- **Node.js 18 이상** (권장 20)
- npm

## 빠른 시작 (5분)

```bash
# 1) 클론 후 이동
git clone <이-저장소-주소> second-team-commerce
cd second-team-commerce

# 2) 패키지 설치
npm install

# 3) 환경변수 파일 준비 (그대로 복사하면 바로 실행됩니다)
cp .env.example .env

# 4) 데이터베이스 생성 + 샘플 데이터 넣기
npm run db:push      # SQLite DB(prisma/dev.db) 생성
npm run db:seed      # 상품·카테고리·주문·리뷰·문의 샘플 삽입

# 5) 개발 서버 실행
npm run dev
```

브라우저에서 **http://localhost:3000** 접속.

> `.env.example`에는 SQLite 경로와 토스페이먼츠 **테스트 키**가 기본값으로 들어있어,
> 복사만 하면 추가 설정 없이 실행됩니다.
>
> 교육 현장에서는 포트를 바꿔 실행하기도 합니다: `npm run dev -- -p 2444`
> (이때 `.env`의 `NEXTAUTH_URL`·`NEXT_PUBLIC_APP_URL`도 같은 포트로 맞추세요.)

## 로그인 계정 (샘플)
| 구분 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | `admin@example.com` | `admin123` |
| 고객 | `customer@example.com` | `customer123` |

- 관리자로 로그인하면 헤더에 **관리자** 링크가 뜹니다 (`/admin`).
- 회원가입도 됩니다 (`/auth/signup`).

## 주요 기능
- **상품**: 목록/상세, 카테고리, 검색, 리뷰·문의(Q&A) 게시판
- **장바구니 · 주문**: DB 기반 장바구니, 바로구매, 한국식 주문상태(입금대기→배송준비중→배송중→배송완료)
- **결제**: 토스페이먼츠 결제위젯(테스트) — 실제 차감 없이 결제 흐름 실습
- **배송지**: 카카오 우편번호 검색(도로명주소), 조건부 무료배송(5만원↑)
- **관리자**: 상품/주문/재고/문의 관리 (한글)

## 결제 · 주소 검색 (외부 서비스)
- **토스페이먼츠**: `.env.example`에 토스가 공개한 **테스트 키**가 들어있어 그대로 실습 가능합니다.
  결제창에서 카드번호를 넣어도 실제 결제는 되지 않습니다. 운영 시
  [토스페이먼츠 개발자센터](https://developers.tosspayments.com)에서 발급한 키로 교체하세요.
- **카카오 우편번호**: 무료 공개 서비스라 API 키가 필요 없습니다.

## 자주 쓰는 명령어
| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run db:push` | 스키마를 DB에 반영 |
| `npm run db:seed` | 샘플 데이터 삽입 |
| `npm run db:studio` | Prisma Studio(DB 뷰어) |
| `npm run build` | 프로덕션 빌드 |
| `npm run type-check` | 타입 검사 |

## 데이터 초기화
데이터가 꼬였을 때는 DB 파일을 지우고 다시 만들면 됩니다.
```bash
rm -f prisma/dev.db
npm run db:push && npm run db:seed
```

## 기술 스택
Next.js 15 (App Router) · React · TypeScript · Prisma · **SQLite** · NextAuth · Tailwind CSS ·
토스페이먼츠 SDK · 카카오 우편번호

---
교육용 프로젝트입니다. 실제 서비스 운영을 위해서는 DB(PostgreSQL 등)·결제(실 PG 계약)·보안
설정을 별도로 갖춰야 합니다.
