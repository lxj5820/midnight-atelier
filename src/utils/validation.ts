export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validators = {
  email(email: string): ValidationResult {
    if (!email || !email.includes('@')) {
      return { valid: false, error: '请输入有效的邮箱地址' };
    }
    return { valid: true };
  },

  password(password: string): ValidationResult {
    if (!password || password.length < 6) {
      return { valid: false, error: '密码长度至少为 6 位' };
    }
    return { valid: true };
  },

  nickname(nickname: string): ValidationResult {
    if (!nickname || nickname.trim().length === 0) {
      return { valid: false, error: '请输入昵称' };
    }
    return { valid: true };
  },

  apiKey(apiKey: string): ValidationResult {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: '请输入 API Key' };
    }
    return { valid: true };
  },

  required(value: string, fieldName: string): ValidationResult {
    if (!value || !value.trim()) {
      return { valid: false, error: `请输入${fieldName}` };
    }
    return { valid: true };
  },

  positiveNumber(value: number, fieldName: string): ValidationResult {
    if (isNaN(value) || value <= 0) {
      return { valid: false, error: `请输入有效的${fieldName}` };
    }
    return { valid: true };
  },

  arrayNotEmpty<T>(arr: T[], fieldName: string): ValidationResult {
    if (!arr || arr.length === 0) {
      return { valid: false, error: `请至少添加一张${fieldName}` };
    }
    return { valid: true };
  },
};
