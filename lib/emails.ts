// lib/emails.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { OrderConfirmation } from '@/emails/OrderConfirmation';
import { ResetPassword } from '@/emails/ResetPassword';

// 교육 베이스: 이메일은 선택 기능. RESEND_API_KEY가 없으면 발송을 조용히 스킵한다.
// (모듈 로드 시점에 new Resend()가 throw하지 않도록 lazy 생성)
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// resend.emails.send 를 대체 — 키 없으면 no-op(로그만)
const resend = {
  emails: {
    send: async (payload: Parameters<Resend['emails']['send']>[0]) => {
      const client = getResend();
      if (!client) {
        console.info('[emails] RESEND_API_KEY 미설정 — 메일 발송 스킵:', {
          to: (payload as { to?: unknown })?.to,
        });
        return { skipped: true } as const;
      }
      return client.emails.send(payload);
    },
  },
};

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderTotal: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: { url: string; altText?: string | null } | string | undefined;
  }>;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ResetPasswordEmailData {
  name: string;
  resetLink: string;
}

export const sendOrderConfirmation = async (data: OrderEmailData) => {
  try {
    const emailHtml = await render(OrderConfirmation(data));

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: data.customerEmail,
      subject: `Order Confirmation - #${data.orderId}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    return { success: false, error };
  }
};

// Alias for sendOrderConfirmation
export const sendOrderConfirmationEmail = sendOrderConfirmation;

export const sendResetPasswordEmail = async (
  email: string,
  data: ResetPasswordEmailData
) => {
  try {
    const emailHtml = await render(ResetPassword(data));

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: 'Reset your password',
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send reset password email:', error);
    return { success: false, error };
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: 'Welcome to our store!',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for creating an account with us. We're excited to have you as a customer.</p>
        <p>Start shopping now and enjoy exclusive deals and offers.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Start Shopping
        </a>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error };
  }
};

export const sendLowStockAlert = async (
  adminEmail: string,
  productName: string,
  currentStock: number
) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: adminEmail,
      subject: `Low Stock Alert: ${productName}`,
      html: `
        <h2>Low Stock Alert</h2>
        <p>The following product is running low on stock:</p>
        <ul>
          <li><strong>Product:</strong> ${productName}</li>
          <li><strong>Current Stock:</strong> ${currentStock}</li>
        </ul>
        <p>Please consider restocking this item soon.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/inventory" style="background-color: #f59e0b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Manage Inventory
        </a>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send low stock alert:', error);
    return { success: false, error };
  }
};
