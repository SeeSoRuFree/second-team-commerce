// File: app/(account)/profile/page.tsx
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProfileForm } from '@/components/profile-form';
import { AddressBook } from '@/components/address-book';
import { PasswordChangeForm } from '@/components/password-change-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your account settings and personal information.',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  // For now, we'll just show a basic profile without fetching detailed info
  // In a real app, you'd get the user ID from the session

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              내 정보
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              계정 설정과 개인정보를 관리하세요
            </p>
          </div>
          <Badge variant="default">{session.user.email}</Badge>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">기본정보</TabsTrigger>
          <TabsTrigger value="addresses">배송지</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
          <TabsTrigger value="preferences">알림설정</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">기본정보</h3>
            <p className="text-sm text-muted-foreground">
              회원 정보와 연락처를 수정할 수 있습니다.
            </p>
          </div>
          <Separator />
          <ProfileForm />
        </TabsContent>

        <TabsContent value="addresses" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">배송지 관리</h3>
            <p className="text-sm text-muted-foreground">
              배송지를 추가하고 관리할 수 있습니다.
            </p>
          </div>
          <Separator />
          <AddressBook />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">보안 설정</h3>
            <p className="text-sm text-muted-foreground">
              비밀번호와 보안 설정을 변경할 수 있습니다.
            </p>
          </div>
          <Separator />
          <PasswordChangeForm />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">알림 설정</h3>
            <p className="text-sm text-muted-foreground">
              알림과 개인정보 수신 설정을 관리할 수 있습니다.
            </p>
          </div>
          <Separator />
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-base font-medium">이메일 알림</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">주문 알림</p>
                    <p className="text-sm text-muted-foreground">
                      주문 상태에 대한 이메일을 받습니다
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    title="주문 알림"
                    defaultChecked
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">마케팅 이메일</p>
                    <p className="text-sm text-muted-foreground">
                      프로모션과 새 소식을 받습니다
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    title="마케팅 이메일"
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">신상품 알림</p>
                    <p className="text-sm text-muted-foreground">
                      새로 입고된 상품 소식을 받습니다
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    title="신상품 알림"
                    className="rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
