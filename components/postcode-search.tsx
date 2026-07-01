// components/postcode-search.tsx
// 카카오(다음) 우편번호 검색 — 공식 스크립트를 직접 로드해 embed 방식으로 삽입.
// 무료·API 키 불필요. 공식 스크립트: //t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
// "주소 검색" 버튼 → 모달 안에 우편번호 검색 iframe을 embed, 선택 시 우편번호+도로명주소 콜백.

'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { X } from 'lucide-react';
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
        onclose?: () => void;
        width?: string | number;
        height?: string | number;
      }) => { embed: (element: HTMLElement) => void };
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
  const [open, setOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const embedRef = useRef<HTMLDivElement | null>(null);

  // 모달이 열리고 스크립트가 준비되면 우편번호 검색 UI를 embed
  useEffect(() => {
    if (!open || !scriptLoaded || !embedRef.current || !window.daum) return;

    // 재오픈 시 이전 iframe 정리
    embedRef.current.innerHTML = '';

    new window.daum.Postcode({
      oncomplete: data => {
        const address = data.roadAddress || data.jibunAddress;
        onComplete({ postcode: data.zonecode, address });
        setOpen(false);
      },
      width: '100%',
      height: '100%',
    }).embed(embedRef.current);
  }, [open, scriptLoaded, onComplete]);

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
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex h-[500px] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">주소 검색</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* 우편번호 검색 iframe이 이 div 안에 embed됨 */}
            <div ref={embedRef} className="flex-1">
              {!scriptLoaded && (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  주소 검색을 불러오는 중...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
