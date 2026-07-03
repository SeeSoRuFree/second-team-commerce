import { CsDesk } from '@/components/admin/cs-desk';

export default function CsDeskPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI CS 데스크</h1>
        <p className="mt-1 text-sm text-gray-500">
          문의를 AI 멀티에이전트가 분류 → 답변 / 환불판정으로 처리합니다. 환불은 사람 승인이 필요합니다.
        </p>
      </div>
      <CsDesk />
    </div>
  );
}
