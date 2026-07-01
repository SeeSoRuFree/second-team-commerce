// components/postcode-search.tsx
// 카카오(다음) 우편번호 검색 — 공식 스크립트를 직접 로드해 open() 팝업(새 창) 방식으로 사용.
// 무료·API 키 불필요. 공식 스크립트: //t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
// open() 방식은 별도 브라우저 창으로 떠서 iframe(CSP/X-Frame/Referrer) 제약을 우회한다.

'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';

const POSTCODE_SCRIPT_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

// 공식 스크립트가 window.daum.Postcode 를 주입한다.
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: {
          zonecode: string;
          roadAddress: string;
          jibunAddress: string;
          [key: string]: unknown;
        }) => void;
        onclose?: (state: string) => void;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}

interface PostcodeSearchProps {
  onComplete: (data: { postcode: string; address: string }) => void;
  buttonLabel?: string;
  className?: string;
}

export function PostcodeSearch({
  onComplete,
  buttonLabel = '주소 검색',
  className,
}: PostcodeSearchProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 스크립트가 이미 로드돼 있으면(다른 인스턴스가 로드) 바로 준비 완료 처리
  useEffect(() => {
    if (typeof window !== 'undefined' && window.daum?.Postcode) {
      setScriptLoaded(true);
    }
  }, []);

  const handleClick = () => {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: data => {
        const address = data.roadAddress || data.jibunAddress;
        onComplete({ postcode: data.zonecode, address });
      },
    }).open();
  };

  return (
    <>
      {/* 공식 우편번호 스크립트 (전역 1회 로드) */}
      <Script
        src={POSTCODE_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
      />
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={handleClick}
        disabled={!scriptLoaded}
      >
        {scriptLoaded ? buttonLabel : '불러오는 중...'}
      </Button>
    </>
  );
}
