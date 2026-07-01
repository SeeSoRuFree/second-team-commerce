// server/actions/auth.ts
'use server';

import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';

/** 회원가입 — 이메일 중복 검사 후 비밀번호 해시 저장. 로그인은 NextAuth Credentials로. */
export async function registerUser(formData: FormData) {
  try {
    const name = ((formData.get('name') as string) || '').trim();
    const email = ((formData.get('email') as string) || '').trim().toLowerCase();
    const password = (formData.get('password') as string) || '';
    const passwordConfirm = (formData.get('passwordConfirm') as string) || '';

    if (!name) return { success: false, error: '이름을 입력해 주세요.' };
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { success: false, error: '올바른 이메일을 입력해 주세요.' };
    }
    if (password.length < 6) {
      return { success: false, error: '비밀번호는 6자 이상이어야 합니다.' };
    }
    if (password !== passwordConfirm) {
      return { success: false, error: '비밀번호가 일치하지 않습니다.' };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: '이미 가입된 이메일입니다.' };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password: await hash(password, 12),
        role: 'USER',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('회원가입 오류:', error);
    return { success: false, error: '회원가입에 실패했습니다.' };
  }
}
