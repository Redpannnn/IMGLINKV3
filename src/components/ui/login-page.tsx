"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { HardDrive, User, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const WALLPAPER_URL =
  "https://imglinkv-3.vercel.app/api/images/cmrt5stmu87saism4/file";

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    // Simulate a small delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const success = onLogin(username, password);
    if (!success) {
      setError("Username atau password salah. Coba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Wallpaper background — object-cover so it fills screen without distortion */}
      <img
        src={WALLPAPER_URL}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          // Fallback to gradient if image fails to load
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      {/* Centered login card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            {/* Logo / Header */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <HardDrive className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  ImgHost
                </h1>
                <p className="text-sm text-white/70">
                  Image Hosting Pribadi
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white/90 text-sm">
                  Username
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="memoraa"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    className="border-white/20 bg-white/10 pl-9 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/30"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/90 text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="border-white/20 bg-white/10 pl-9 pr-9 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200 border border-red-400/30"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Masuk
                  </>
                )}
              </Button>
            </form>

            {/* Hint */}
            <p className="mt-6 text-center text-xs text-white/50">
              Hosting gambar pribadi — aman & cepat.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
