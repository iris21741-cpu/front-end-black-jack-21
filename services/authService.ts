// services/authService.ts
import { apiFetch } from "@/utils/fetcher";

// --- 假設的類型定義 (保持與 LoginModal.tsx 中使用的一致) ---

// 假設的登入請求數據類型
type LoginForm = {
  email: string;
  password: string;
};

// 假設的 User 數據結構 (來自後端)
type UserData = {
  id: number;
  full_name: string;
  email: string;
  gender: 1 | 2; // 或 string，取決於後端實際類型
};

// 階段一：登入成功的回應 (只回傳 user)
type LoginResponsePhase1 = {
  user: UserData;
};

// 🔥 階段二：2FA 請求的數據結構（現在只關注 code，uid 將從 body 移除）
type Email2FARequest = {
  uid: number; // 使用者 ID (將傳入 service，但放在 Header)
  code: string; // Email 驗證碼 (放在 Body)
};

// 階段二：2FA 成功的回應 (回傳 token 和 user)
type AuthResponsePhase2 = {
  token: string;
  user: UserData;
};
// -----------------------------------------------------

export const authService = {
  /**
   * 註冊 (保持不變)
   */
  async register(data: any): Promise<AuthResponsePhase2> {
    return apiFetch("/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * 階段一：帳號密碼登入 (發送 2FA Email) (保持不變)
   */
  async login(data: LoginForm): Promise<LoginResponsePhase1> {
    return apiFetch("/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * 🔥 階段二：Email 2FA 驗證 (取得 Token)
   * * 傳輸邏輯變更：uid 放在 Header，code 放在 Body
   * * @param data 包含 uid 和 code
   */
  async email2fa({ uid, code }: Email2FARequest): Promise<AuthResponsePhase2> {

    // 構造只包含 code 的 Body
    const bodyPayload = { code: code };

    // 構造包含 uid 的 Headers
    const headers = {
      // 假設後端要求 uid 放在 'X-User-Id' 或 'Authorization' 以外的自定義 Header 中
      "X-User-Id": String(uid),
      "Content-Type": "application/json",
      // ... 其他必要 Header
    };

    // 呼叫 apiFetch，將 headers 傳入
    return apiFetch("/email2fa", {
      method: "POST",
      headers: headers, // 🔥 將 uid 放在 headers 中
      body: JSON.stringify(bodyPayload), // 🔥 Body 中只放 code
    });
  },
};