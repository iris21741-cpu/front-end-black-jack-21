"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  registerSchema,
  email2FASchema, // 🔥 引入 2FA Schema
  type RegisterForm,
  type Email2FAForm, // 🔥 引入 2FA Form Type
} from "@/schemas/authSchema";

import { useUserStore } from "@/stores/useUserStore";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService"; // 服務已更新

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// 🔥 增加 'email2fa' 模式
type Mode = "login" | "register" | "email2fa";

// 定義 User 類型以保持一致性
type UserDataType = {
  id: number;
  full_name: string;
  email: string;
  gender: 1 | 2; // 後端傳來的數字型別
};

export function LoginModal({ isOpen, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const router = useRouter();
  const { login } = useUserStore();

  // 🔥 新增：儲存第一階段登入後取得的 user 資料
  const [loginUser, setLoginUser] = useState<UserDataType | null>(null);

  // login form
  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // register form
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      gender: "1",
      password: "",
      confirmPassword: "",
    },
  });

  // 🔥 新增：Email 2FA form
  const email2FAForm = useForm<Email2FAForm>({
    resolver: zodResolver(email2FASchema),
    defaultValues: { code: "" },
  });

  // ESC close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  /** -----------------------------------------------------
   * 🔥 階段一：帳密登入，只取得 user，切換至 2FA
   * ----------------------------------------------------- */
  const onLoginSubmit = loginForm.handleSubmit(async (data) => {
    try {
      // 呼叫 login，現在只回傳 user 資料
      const { user } = await authService.login(data);

      console.log("後端回傳登入資料 (Phase 1)：", user);

      if (!user || !user.id) {
        throw new Error("後端沒有回傳 user ID");
      }

      // 儲存 user 資料並切換到 2FA 模式
      setLoginUser(user);
      setMode("email2fa");

      loginForm.reset(); // 清空密碼欄位

      alert(`帳號密碼正確！驗證碼已寄送到您的 Email: ${user.email}`);
    } catch (err) {
      console.error(err);
      alert("登入失敗，請確認帳密");
    }
  });

  /** -----------------------------------------------------
   * 🔥 階段二：Email 2FA 驗證，取得 Token
   * ----------------------------------------------------- */
  const onEmail2FASubmit = email2FAForm.handleSubmit(async (data) => {
    if (!loginUser) {
      alert("登入狀態遺失，請重新輸入帳密！");
      setMode("login");
      return;
    }

    try {
      // 呼叫 email2fa API，使用 uid 和 code 換取 token
      const res = await authService.email2fa({
        uid: loginUser.id,
        code: data.code,
      });

      console.log("後端回傳 2FA 驗證資料 (Phase 2)：", res);

      const { token } = res;

      if (!token) {
        throw new Error("2FA 驗證失敗，後端沒有回傳 token");
      }

      // 儲存 token + user (user 資料沿用第一階段的)
      login(
        {
          id: loginUser.id,
          full_name: loginUser.full_name,
          email: loginUser.email,
          gender: loginUser.gender === 1 ? "1" : "2",
        },
        token
      );

      alert("登入成功！");
      onClose();
      router.push("/game");
    } catch (err) {
      console.error(err);
      email2FAForm.reset({ code: '' }); // 清空驗證碼欄位
      alert("驗證碼錯誤或過期，請重試");
    }
  });


  /** -----------------------------------------------------
   * 註冊（保持不變）
   * ----------------------------------------------------- */
  const onRegisterSubmit = registerForm.handleSubmit(async (data) => {
    // ... (保持您原本的註冊邏輯不變)
    try {
      const res = await authService.register(data);

      console.log("後端回傳註冊資料：", res);

      const { token, user } = res;

      if (!token) {
        alert("註冊成功！請重新登入");
        setMode("login");
        return;
      }

      // 自動登入
      login(
        {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          gender: user.gender === 1 ? "1" : "2",
        },
        token
      );

      alert("註冊成功！已自動登入");
      onClose();
      router.push("/game");
    } catch (err) {
      console.error(err);
      alert("註冊失敗！");
    }
  });


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: -30 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative w-full max-w-md mx-4 max-h-[90vh] rounded-3xl
              border border-[#c41e3a]/40 shadow-2xl ring-2 ring-[#00ffff]/40 scroll-smooth"
      >
        <div className="absolute inset-0 rounded-3xl bg-white/8 backdrop-blur-2xl" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#c41e3a]/20 via-[#4a0d66]/10 to-transparent opacity-80 pointer-events-none" />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-tl from-[#00ffff]/12 to-transparent opacity-60 pointer-events-none" />

        <div className="relative overflow-y-auto max-h-[90vh]">
          <div className="px-10 md:px-12 py-10">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-white/60 hover:text-white text-3xl transition"
            >
              ✕
            </button>

            <h2 className="mb-8 text-center text-4xl font-black text-cyan-300 tracking-tight">
              {/* 🔥 調整標題 */}
              {mode === "login"
                ? "歡迎回來"
                : mode === "email2fa"
                ? "兩階段驗證"
                : "創建帳號"}
            </h2>

            {/* ------------------------------------------------------
                1. 登入表單 (mode === 'login')
            ------------------------------------------------------- */}
            {mode === "login" && (
              <form onSubmit={onLoginSubmit} className="space-y-6">
                <div>
                  <input
                    {...loginForm.register("email")}
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white
                           placeholder-white/50 backdrop-blur-md
                           focus:border-[#00ffff]/80 focus:outline-none
                           focus:ring-4 focus:ring-[#00ffff]/60
                           focus:ring-offset-2 focus:ring-offset-[#002244]/50
                           transition-all duration-300"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-red-400 text-sm">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    {...loginForm.register("password")}
                    type="password"
                    placeholder="密碼"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white
                           placeholder-white/50 backdrop-blur-md
                           focus:border-[#00ffff]/80 focus:outline-none
                           focus:ring-4 focus:ring-[#00ffff]/60
                           focus:ring-offset-2 focus:ring-offset-[#002244]/50
                           transition-all duration-300"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-red-400 text-sm">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-xl
                          bg-gradient-to-br from-[#002244]/90 via-[#001122]/80 to-[#001133]/90
                          backdrop-blur-md px-8 py-5 text-xl font-black text-cyan-300
                          shadow-2xl ring-2 ring-[#9a1d2a]/60
                          hover:ring-[#c41e3a] hover:ring-4 hover:text-white
                          hover:shadow-[#9a1d2a]/40 transition-all duration-500"
                >
                  <span
                    className="absolute inset-0 scale-0 bg-gradient-to-br from-[#9a1d2a]/40 via-[#c41e3a]/20 to-transparent
                               rounded-xl group-hover:scale-150 transition-transform duration-700 ease-out"
                  />
                  <span className="relative z-10 drop-shadow-2xl">下一步 (取得驗證碼) →</span>
                </button>

                <p className="text-center text-sm text-white/60">
                  還沒有帳號？
                  <span
                    onClick={() => setMode("register")}
                    className="text-cyan-300 hover:text-white hover:underline cursor-pointer transition ml-1"
                  >
                    立即註冊
                  </span>
                </p>
              </form>
            )}

            {/* ------------------------------------------------------
                2. Email 2FA 驗證表單 (mode === 'email2fa')
            ------------------------------------------------------- */}
            {mode === "email2fa" && (
              <form onSubmit={onEmail2FASubmit} className="space-y-6">
                <p className="text-center text-white/80">
                  請檢查您的信箱，輸入收到的 **6位數驗證碼**。
                  <span className="text-cyan-300 font-bold block mt-1">
                    發送至：{loginUser?.email || "N/A"}
                  </span>
                </p>

                <div>
                  <input
                    {...email2FAForm.register("code")}
                    type="text"
                    placeholder="請輸入驗證碼 (Code)"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white
                           placeholder-white/50 backdrop-blur-md
                           focus:border-[#00ffff]/80 focus:outline-none
                           focus:ring-4 focus:ring-[#00ffff]/60
                           focus:ring-offset-2 focus:ring-offset-[#002244]/50
                           transition-all duration-300"
                  />
                  {email2FAForm.formState.errors.code && (
                    <p className="mt-1 text-red-400 text-sm">
                      {email2FAForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-xl
                          bg-gradient-to-br from-[#002244]/90 via-[#001122]/80 to-[#001133]/90
                          backdrop-blur-md px-8 py-5 text-xl font-black text-cyan-300
                          shadow-2xl ring-2 ring-[#9a1d2a]/60
                          hover:ring-[#c41e3a] hover:ring-4 hover:text-white
                          hover:shadow-[#9a1d2a]/40 transition-all duration-500"
                >
                  <span
                    className="absolute inset-0 scale-0 bg-gradient-to-br from-[#9a1d2a]/40 via-[#c41e3a]/20 to-transparent
                               rounded-xl group-hover:scale-150 transition-transform duration-700 ease-out"
                  />
                  <span className="relative z-10 drop-shadow-2xl">驗證並登入 →</span>
                </button>

                <p className="text-center text-sm text-white/60">
                  <span
                    onClick={() => setMode("login")}
                    className="text-cyan-300 hover:text-white hover:underline cursor-pointer transition ml-1"
                  >
                    返回帳號密碼輸入
                  </span>
                </p>
              </form>
            )}


            {/* ------------------------------------------------------
                3. 註冊表單 (mode === 'register')
            ------------------------------------------------------- */}
            {mode === "register" && (
              <form onSubmit={onRegisterSubmit} className="space-y-5">
                <div>
                  <input
                    {...registerForm.register("full_name")}
                    type="text"
                    placeholder="姓名"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white placeholder-white/50"
                  />
                  {registerForm.formState.errors.full_name && (
                    <p className="mt-1 text-red-400 text-sm">
                      {registerForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <input
                    {...registerForm.register("email")}
                    type="email"
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white placeholder-white/50"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-red-400 text-sm">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <select
                    {...registerForm.register("gender")}
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white"
                  >
                    <option value="1">男</option>
                    <option value="2">女</option>
                  </select>
                </div>

                <div>
                  <input
                    {...registerForm.register("password")}
                    type="password"
                    placeholder="密碼（至少8碼）"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white placeholder-white/50"
                  />
                </div>

                <div>
                  <input
                    {...registerForm.register("confirmPassword")}
                    type="password"
                    placeholder="確認密碼"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white placeholder-white/50"
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...registerForm.register("ageConfirmed")}
                      className="w-5 h-5 rounded border-white/30 bg-white/10"
                    />
                    <span className="text-white/90 text-lg">我已年滿18歲</span>
                  </label>

                  <label className="flex items-start gap-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...registerForm.register("termsConfirmed")}
                      className="w-5 h-5 rounded border-white/30 bg-white/10"
                    />
                    <span className="text-white/70 text-sm leading-relaxed">
                      您需要年滿18歲才能進入遊戲
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="group relative w-full overflow-hidden rounded-xl
                          bg-gradient-to-br from-[#002244]/90 via-[#001122]/80 to-[#001133]/90
                          backdrop-blur-md px-8 py-5 text-xl font-black text-cyan-300 shadow-2xl"
                >
                  <span className="relative z-10 drop-shadow-2xl">註冊 →</span>
                </button>

                <p className="text-center text-sm text-white/60">
                  已有帳號？
                  <span
                    onClick={() => setMode("login")}
                    className="text-cyan-300 hover:text-white hover:underline cursor-pointer ml-1"
                  >
                    立即登入
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}