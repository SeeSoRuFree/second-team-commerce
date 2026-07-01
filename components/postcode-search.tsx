// components/postcode-search.tsx
// 카카오(다음) 우편번호 검색 — 공식 스크립트를 동적 로드해 embed 방식으로 삽입.
// 무료·API 키 불필요. 공식 스크립트: //t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js

'use client';

import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POSTCODE_SCRIPT_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

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
        width?: string | number;
        height?: string | number;
      }) => { open: () => void; embed: (el: HTMLElement) => void };
    };
  }
}

// 스크립트를 1회만 로드하고 Promise로 준비 완료를 알린다.
let scriptPromise: Promise<void> | null = null;
function loadPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('우편번호 스크립트 로드 실패'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
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
  const [loading, setLoading] = useState(false);
  const embedRef = useRef<HTMLDivElement | null>(null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      await loadPostcodeScript();
      setOpen(true);
      // 모달 DOM이 그려진 다음 embed
      requestAnimationFrame(() => {
        if (!embedRef.current || !window.daum?.Postcode) return;
        embedRef.current.innerHTML = '';
        new window.daum.Postcode({
          oncomplete: data => {
            const address = data.roadAddress || data.jibunAddress;
            onComplete({ postcode: data.zonecode, address });
            setOpen(false);
          },
          onclose: () => setOpen(false),
          width: '100%',
          height: '100%',
        }).embed(embedRef.current);
      });
    } catch {
      alert('주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [onComplete]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? '불러오는 중...' : buttonLabel}
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
            <div ref={embedRef} className="flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
