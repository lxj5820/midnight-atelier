import nodemailer from 'nodemailer';
import dns from 'dns';
import { getSystemSetting, getEmailTemplate } from './db.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const host = await getSystemSetting('smtp_host');
    const port = await getSystemSetting('smtp_port');
    const secure = await getSystemSetting('smtp_secure');
    const user = await getSystemSetting('smtp_user');
    const pass = await getSystemSetting('smtp_pass');
    const from = await getSystemSetting('smtp_from');

    if (!host || !port || !user || !pass || !from) {
      console.error('SMTP config missing values:', { host: !!host, port: !!port, user: !!user, pass: !!pass, from: !!from });
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

// 使用 IPv4 地址连接
async function sendEmailIPv4(email: string, code: string, config: SmtpConfig): Promise<boolean> {
  const template = await getEmailTemplate('verification_code') || '您的验证码是：${code}\n验证码有效期为 10 分钟，请尽快使用。';
  const emailContent = template.replace(/\$\{code\}/g, code);

  // 解析域名的 IPv4 地址
  const addresses = await new Promise< string[]>((resolve) => {
    dns.resolve4(config.host, (err, result) => {
      if (err || !result) {
        resolve([]);
      } else {
        resolve(result);
      }
    });
  });

  if (addresses.length === 0) {
    console.error(`Failed to resolve IPv4 for ${config.host}`);
    return false;
  }

  const ip = addresses[0];
  console.log(`Resolved ${config.host} to ${ip}, sending email...`);

  return new Promise((resolve) => {
    const transporter = nodemailer.createTransport({
      host: ip,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    } as nodemailer.TransportOptions);

    transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Midnight Atelier - 邮箱验证码',
      text: emailContent,
    }, (err, info) => {
      if (err) {
        console.error('SMTP send error:', err.message);
        resolve(false);
      } else {
        console.log('Email sent:', info?.response);
        resolve(true);
      }
    });
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.error('SMTP not configured - config is null');
    return false;
  }

  try {
    return await sendEmailIPv4(email, code, config);
  } catch (error: any) {
    console.error('Failed to send email:', error?.message || error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
