'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ProfileForm() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: '',
      email: '',
      image: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        alert('정보가 수정되었습니다');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">이름</Label>
        <Input {...register('name')} placeholder="이름을 입력하세요" />
      </div>
      <div>
        <Label htmlFor="email">이메일</Label>
        <Input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <Label htmlFor="image">프로필 이미지 URL</Label>
        <Input {...register('image')} placeholder="https://..." />
      </div>
      <Button type="submit">정보 수정</Button>
    </form>
  );
}
