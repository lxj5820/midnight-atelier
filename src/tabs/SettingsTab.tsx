import React, { useState } from 'react';
import { Settings, Mail, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getSystemSettings, updateSystemSettings, getEmailTemplates, updateEmailTemplates, type SmtpSettings } from '../adminApi';

interface SettingsTabProps {
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  loadSmtpSettings: () => void;
  loadEmailTemplates: () => void;
}

export default function SettingsTab({ isLoading, showToast, loadSmtpSettings, loadEmailTemplates }: SettingsTabProps) {
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings & { registration_enabled?: boolean; registration_requires_verification?: boolean }>({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    registration_enabled: true,
    registration_requires_verification: true,
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<Record<string, string>>({});
  const [emailTemplateForm, setEmailTemplateForm] = useState('');
  const verificationTemplateDefault = `您的验证码是：\${code}\n验证码有效期为 10 分钟，请尽快使用。`;

  const handleSaveSmtp = async () => {
    if (!smtpSettings.smtp_host || !smtpSettings.smtp_user || !smtpSettings.smtp_pass || !smtpSettings.smtp_from) {
      showToast('error', '请填写完整的SMTP配置');
      return;
    }
    try {
      const result = await updateSystemSettings(smtpSettings);
      if (result.success) {
        showToast('success', 'SMTP设置已保存');
      } else {
        showToast('error', result.error || '保存失败');
      }
    } finally {
    }
  };

  const handleSaveEmailTemplate = async () => {
    try {
      const result = await updateEmailTemplates({
        verification_code: emailTemplateForm,
      });
      if (result.success) {
        showToast('success', '邮件模板已保存');
      } else {
        showToast('error', result.error || '保存失败');
      }
    } finally {
    }
  };

  const handleToggleRegistration = async () => {
    const newValue = !smtpSettings.registration_enabled;
    try {
      const result = await updateSystemSettings({ registration_enabled: newValue });
      if (result.success) {
        setSmtpSettings({ ...smtpSettings, registration_enabled: newValue });
        showToast('success', newValue ? '已开启注册功能' : '已关闭注册功能');
      } else {
        showToast('error', result.error || '操作失败');
      }
    } finally {
    }
  };

  const handleToggleVerification = async () => {
    const newValue = !smtpSettings.registration_requires_verification;
    try {
      const result = await updateSystemSettings({ registration_requires_verification: newValue });
      if (result.success) {
        setSmtpSettings({ ...smtpSettings, registration_requires_verification: newValue });
        showToast('success', newValue ? '已开启邮箱验证' : '已关闭邮箱验证');
      } else {
        showToast('error', result.error || '操作失败');
      }
    } finally {
    }
  };

  return (
    <div className="space-y-6">
      {/* Registration Toggle */}
      <div className="bg-[#1c1f26] rounded-2xl p-6 border border-white/5 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">注册设置</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-[#111317] rounded-xl border border-white/5">
          <div>
            <p className="text-white font-bold">允许新用户注册</p>
            <p className="text-slate-400 text-sm mt-1">关闭后新用户将无法注册账号</p>
          </div>
          <button
            onClick={() => handleToggleRegistration()}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              smtpSettings.registration_enabled ? 'bg-indigo-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                smtpSettings.registration_enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-[#111317] rounded-xl border border-white/5">
          <div>
            <p className="text-white font-bold">注册需要邮箱验证</p>
            <p className="text-slate-400 text-sm mt-1">关闭后用户可直接注册，无需验证码</p>
          </div>
          <button
            onClick={() => handleToggleVerification()}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              smtpSettings.registration_requires_verification ? 'bg-indigo-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                smtpSettings.registration_requires_verification ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* SMTP Settings */}
      <div className="bg-[#1c1f26] rounded-2xl p-6 border border-white/5 space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">SMTP 邮件服务配置</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">SMTP 服务器</label>
              <input
                type="text"
                value={smtpSettings.smtp_host}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/80">端口</label>
              <input
                type="text"
                value={smtpSettings.smtp_port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: e.target.value })}
                placeholder="587"
                className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80">使用 SSL/TLS</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={smtpSettings.smtp_secure === 'true'}
                  onChange={() => setSmtpSettings({ ...smtpSettings, smtp_secure: 'true' })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-white">是</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={smtpSettings.smtp_secure === 'false'}
                  onChange={() => setSmtpSettings({ ...smtpSettings, smtp_secure: 'false' })}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-white">否</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80">SMTP 用户名</label>
            <input
              type="text"
              value={smtpSettings.smtp_user}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
              placeholder="user@example.com"
              className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80">SMTP 密码</label>
            <div className="relative">
              <input
                type={showSmtpPass ? 'text' : 'password'}
                value={smtpSettings.smtp_pass}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                placeholder="密码或授权码"
                className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 pr-12 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80">发件人邮箱</label>
            <input
              type="email"
              value={smtpSettings.smtp_from}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from: e.target.value })}
              placeholder="noreply@example.com"
              className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
            <Settings className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              配置完成后，用户注册时将通过此邮箱发送验证码。请确保SMTP信息正确，否则验证码无法发送。
            </p>
          </div>

          <button
            onClick={handleSaveSmtp}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isLoading ? '保存中...' : '保存配置'}
          </button>
        </div>

        {/* Email Template Section */}
        <div className="border-t border-white/5 pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">邮件模板配置</h3>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/80">验证码邮件内容</label>
            <p className="text-xs text-slate-500">变量: {'${code}'} 会被替换为实际验证码</p>
            <textarea
              value={emailTemplateForm}
              onChange={(e) => setEmailTemplateForm(e.target.value)}
              rows={4}
              placeholder="您的验证码是：${code}，有效期10分钟"
              className="w-full bg-[#111317] border border-white/5 rounded-lg py-3 px-4 text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
            />
          </div>
          <button
            onClick={handleSaveEmailTemplate}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isLoading ? '保存中...' : '保存邮件模板'}
          </button>
        </div>
      </div>
    </div>
  );
}
