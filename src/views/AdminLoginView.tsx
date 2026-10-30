import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Lock } from 'lucide-react';
import { loginAdmin } from '../lib/auth';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export function AdminLoginView({ onLoginSuccess, onNavigateHome }: AdminLoginViewProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const ok = await loginAdmin(password.trim());
      if (ok) {
        onLoginSuccess();
      } else {
        setErrorMsg('كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.');
      }
    } catch {
      setErrorMsg('حدث خطأ أثناء التحقق من كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-amber-500 selection:text-black flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient gold glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Button */}
      <button
        onClick={onNavigateHome}
        className="absolute top-6 right-6 flex items-center gap-2 text-xs font-semibold text-amber-300/80 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm border border-amber-500/20 transition cursor-pointer"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للرئيسية
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#121216] border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative z-10 backdrop-blur-2xl">
        <div className="text-center space-y-3 mb-8">
          <img 
            src="/logo.png" 
            alt="Smart Card" 
            className="w-16 h-16 object-contain rounded-2xl mx-auto shadow-lg shadow-amber-500/25 border border-amber-400/40 p-1 bg-[#121216]" 
          />
          <div>
            <span className="inline-block text-[11px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 px-3 py-1 rounded-full border border-amber-400/30 mb-2">
              لوحة التحكم
            </span>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-mono">
              Smart Card
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              تسجيل دخول الأدمن — إدارة الرموز والتوجيه الذكي
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-amber-200/90">
              كلمة المرور السرية للأدمن:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full px-4 py-3.5 bg-black/50 border border-amber-500/25 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                dir="ltr"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3.5 text-slate-400 hover:text-amber-300 transition cursor-pointer"
                title={showPassword ? 'إخفاء' : 'إظهار'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-black font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {loading ? (
              <span>جاري التحقق...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-black" />
                <span>دخول لوحة التحكم</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Lock className="w-3.5 h-3.5 text-amber-400/60" />
          <span>آمنة ومحمية</span>
        </div>
      </div>
    </div>
  );
}
