export const AUTH_EMAIL_MAX_LENGTH = 254;
export const AUTH_PASSWORD_MIN_LENGTH = 8;
export const AUTH_PASSWORD_MAX_LENGTH = 128;

export type RegisterInputValidation =
  | { ok: true; email: string; password: string; confirm: string }
  | { ok: false; message: string };

/** 校验注册输入；密码保留原值，允许 Unicode、空格和符号。 */
export function validateRegisterInput(
  emailInput: string,
  password: string,
  confirm: string,
): RegisterInputValidation {
  const email = emailInput.trim();
  if (!email || !password || !confirm) {
    return { ok: false, message: "请输入邮箱、密码和确认密码。" };
  }
  if (email.length > AUTH_EMAIL_MAX_LENGTH) {
    return { ok: false, message: "邮箱格式不正确。" };
  }
  if (password.length < AUTH_PASSWORD_MIN_LENGTH || password.length > AUTH_PASSWORD_MAX_LENGTH) {
    return { ok: false, message: "密码长度应为 8 至 128 位。" };
  }
  if (password !== confirm) {
    return { ok: false, message: "两次输入的密码不一致。" };
  }
  return { ok: true, email, password, confirm };
}
