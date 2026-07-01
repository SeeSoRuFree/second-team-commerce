'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function PasswordChangeForm() {
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const newPassword = watch('newPassword');

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      setIsSuccess(false);
      setMessage('비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setMessage('비밀번호가 변경되었습니다');
        reset();
      } else {
        setIsSuccess(false);
        setMessage('비밀번호 변경에 실패했습니다');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('비밀번호 변경 중 오류가 발생했습니다');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">현재 비밀번호</Label>
        <Input
          {...register('currentPassword')}
          type="password"
          placeholder="현재 비밀번호를 입력하세요"
        />
      </div>
      <div>
        <Label htmlFor="newPassword">새 비밀번호</Label>
        <Input
          {...register('newPassword')}
          type="password"
          placeholder="새 비밀번호를 입력하세요"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
        <Input
          {...register('confirmPassword')}
          type="password"
          placeholder="새 비밀번호를 다시 입력하세요"
        />
      </div>
      {message && (
        <p
          className={`text-sm ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  );
}
