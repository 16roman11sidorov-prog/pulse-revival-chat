import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/chats" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
        } else {
          navigate("/chats");
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Аккаунт создан!", description: "Проверьте почту для подтверждения." });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-primary">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md"
          >
            <span className="text-4xl font-black text-white">P</span>
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white">Pulse</h1>
          <p className="mt-1 text-sm text-white/70">Мессенджер нового поколения</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-card/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-6 flex rounded-xl bg-muted p-1">
            {["Вход", "Регистрация"].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                className={`relative flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  (i === 0 ? isLogin : !isLogin) ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {(i === 0 ? isLogin : !isLogin) && (
                  <motion.div
                    layoutId="authTab"
                    className="absolute inset-0 rounded-lg bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required={!isLogin} />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground border-0 hover:opacity-90">
                {isLoading ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                toast({ title: "Ошибка", description: String(result.error), variant: "destructive" });
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Войти через Google
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
