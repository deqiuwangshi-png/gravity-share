import { describe, expect, it } from "vitest";
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  validateRegisterInput,
} from "@/lib/auth-validation";

describe("validateRegisterInput（注册输入边界）", () => {
  it("允许密码使用 Unicode、空格和特殊字符", () => {
    const result = validateRegisterInput(" user@example.com ", "中文 密码!<>$", "中文 密码!<>$");
    expect(result).toEqual({
      ok: true,
      email: "user@example.com",
      password: "中文 密码!<>$",
      confirm: "中文 密码!<>$",
    });
  });

  it("拒绝空值和不一致的确认密码", () => {
    expect(validateRegisterInput("", "password123", "password123")).toEqual({
      ok: false,
      message: "请输入邮箱、密码和确认密码。",
    });
    expect(validateRegisterInput("user@example.com", "password123", "password124")).toEqual({
      ok: false,
      message: "两次输入的密码不一致。",
    });
  });

  it("拒绝超出邮箱和密码边界的输入", () => {
    expect(validateRegisterInput(`${"a".repeat(AUTH_EMAIL_MAX_LENGTH)}@x.com`, "password123", "password123")).toEqual({
      ok: false,
      message: "邮箱格式不正确。",
    });
    expect(validateRegisterInput("user@example.com", "a".repeat(AUTH_PASSWORD_MIN_LENGTH - 1), "a".repeat(AUTH_PASSWORD_MIN_LENGTH - 1))).toEqual({
      ok: false,
      message: "密码长度应为 8 至 128 位。",
    });
    expect(validateRegisterInput("user@example.com", "a".repeat(AUTH_PASSWORD_MAX_LENGTH + 1), "a".repeat(AUTH_PASSWORD_MAX_LENGTH + 1))).toEqual({
      ok: false,
      message: "密码长度应为 8 至 128 位。",
    });
  });
});
