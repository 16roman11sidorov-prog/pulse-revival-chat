import { useNavigate } from "react-router-dom";
import { Moon, Sun, Bell, Shield, HelpCircle, Headset, LogOut, ChevronRight, Camera, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string; username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Пользователь";
  const username = profile?.username || "user";

  const menuItems = [
    { icon: Settings, label: "Настройки аккаунта", onClick: () => navigate("/settings") },
    { icon: Bell, label: "Уведомления", onClick: () => {} },
    { icon: Shield, label: "Конфиденциальность", onClick: () => navigate("/settings?section=privacy") },
    { icon: Headset, label: "Поддержка", onClick: () => navigate("/support") },
    { icon: HelpCircle, label: "Помощь", onClick: () => {} },
  ];

  return (
    <div className="flex flex-col pb-20">
      <div className="gradient-pulse px-4 pb-8 pt-6">
        <h1 className="text-xl font-black text-white mb-6">Профиль</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white/20">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="Avatar" /> : null}
              <AvatarFallback className="bg-white/20 text-white text-2xl font-black">
                {displayName[0]}
              </AvatarFallback>
            </Avatar>
            <button onClick={() => navigate("/settings")} className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md">
              <Camera className="h-3.5 w-3.5 text-foreground" />
            </button>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{displayName}</p>
            <p className="text-sm text-white/70">@{username}</p>
            <p className="text-xs text-white/50 mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              <span className="text-sm font-medium">Тёмная тема</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>

          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="flex w-full items-center justify-between px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </motion.button>

        <p className="mt-6 text-center text-xs text-muted-foreground">Pulse Messenger v1.0</p>
      </div>
    </div>
  );
}
