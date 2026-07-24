"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { getDashboardHref } from "@/lib/dashboard-href";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { StoreLogo } from "@/components/shared/store-logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState<string>(siteConfig.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/store/public")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.store) {
          if (json.store.store_name) {
            setStoreName(`${json.store.store_name} Monitoring`);
          }
          setLogoUrl(json.store.logo_url);
        }
      })
      .catch(() => {
        // Pakai default
      });
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let role: string | null = null;
      if (userId) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        role = profile?.role ?? null;
      }
      window.location.href = getDashboardHref(role);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm glass-panel p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <StoreLogo src={logoUrl} alt={storeName} size="xl" className="shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-primary dark:neon-title">
            {storeName}
          </h1>
          <p className="text-sm text-muted-foreground">Masuk ke akun Anda</p>
        </div>
        <form onSubmit={handleLogin} className='space-y-4'>
          {error && (
            <div className='bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm'>
              {error}
            </div>
          )}
          <div className='space-y-2'>
            <label className='text-xs font-medium text-muted-foreground'>Email</label>
            <Input type="email" placeholder="contoh@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className='space-y-2'>
            <label className='text-xs font-medium text-muted-foreground'>Password</label>
            <Input type='password' placeholder='........' value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type='submit' disabled={loading} className='w-full'>
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
        <div className='text-center space-y-2'>
          {siteConfig.allowPublicRegister && (
            <a href='/register' className='text-sm text-accent hover:underline font-medium'>
              Belum punya akun? Daftar
            </a>
          )}
          <span className='block'>
            <a href='/lupa-password' className='text-xs text-muted-foreground hover:underline'>
              Lupa password?
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}
