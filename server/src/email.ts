import nodemailer from 'nodemailer';
import { getSystemSetting } from './db.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  try {
    const host = getSystemSetting('smtp_host');
    const port = getSystemSetting('smtp_port');
    const secure = getSystemSetting('smtp_secure');
    const user = getSystemSetting('smtp_user');
    const pass = getSystemSetting('smtp_pass');
    const from = getSystemSetting('smtp_from');

    if (!host || !port || !user || !pass || !from) {
      return null;
    }

    return {
      host,
      port: parseInt(port, 10),
      secure: secure === 'true',
      user,
      pass,
      from,
    };
  } catch (error) {
    console.error('Failed to get SMTP config:', error);
    return null;
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const config = getSmtpConfig();
  if (!config) {
    console.error('SMTP not configured');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Midnight Atelier - 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">邮箱验证码</h2>
          <p>您的验证码是：</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">
            ${code}
          </div>
          <p style="color: #666; margin-top: 20px;">验证码有效期为 10 分钟，请尽快使用。</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">如果这不是您的操作，请忽略此邮件。</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
