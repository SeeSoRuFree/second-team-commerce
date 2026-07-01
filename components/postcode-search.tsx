// components/postcode-search.tsx
// 카카오(다음) 우편번호 검색 — 무료 공개 서비스(API 키 불필요).
// "주소 검색" 버튼을 누르면 오버레이 모달로 우편번호 검색 팝업을 띄우고,
// 선택 시 우편번호 + 도로명주소를 콜백으로 돌려준다. 회원가입/마이페이지에도 재사용 가능.

'use client';

import { useState } from 'react';
import DaumPostcode, { type Address } from 'react-daum-postcode';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const handleComplete = (data: Address) => {
    // 도로명주소 우선, 없으면 지번주소
    const address = data.roadAddress || data.jibunAddress;
    onComplete({ postcode: data.zonecode, address });
    setOpen(false);
  };

  return (
    <>
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
            className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
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
            <DaumPostcode
              onComplete={handleComplete}
              style={{ height: 470 }}
              autoClose={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
