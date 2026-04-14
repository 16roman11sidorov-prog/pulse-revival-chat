import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, User, Mail, Lock, AtSign, Eye, EyeOff, Check, Loader2, Bell, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import { AvatarFrame, type FrameType } from "@/components/AvatarFrame";

interface ProfileData {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  who_can_message: string;
  who_can_add_to_groups: string;
  who_can_see_profile: string;
  who_can_see_last_seen: string;
  who_can_see_avatar: string;
}

type Section = "main" | "password" | "email" | "privacy" | "frame";

const FRAME_OPTIONS: { value: FrameType; label: string; emoji: string }[] = [
  { value: null, label: "Без рамки", emoji: "⭕" },
  { value: "gold", label: "Золотая", emoji: "🥇" },
  { value: "silver", label: "Серебряная", emoji: "🥈" },
  { value: "neon", label: "Неоновая", emoji: "💎" },
  { value: "gradient", label: "Градиентная", emoji: "🌈" },
  { value: "animated", label: "Анимированная", emoji: "✨" },
];

const privacyOptions = [
  { value: "everyone", label: "Все" },
  { value: "contacts", label: "Мои контакты" },
  { value: "nobody", label: "Никто" },
];

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { permission, requestPermission } = useNotifications();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("main");

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email field
  const [newEmail, setNewEmail] = useState("");

  // Privacy
  const [whoCanMessage, setWhoCanMessage] = useState("everyone");
  const [whoCanAddToGroups, setWhoCanAddToGroups] = useState("everyone");
  const [whoCanSeeProfile, setWhoCanSeeProfile] = useState("everyone");
  const [whoCanSeeLastSeen, setWhoCanSeeLastSeen] = useState("everyone");
  const [whoCanSeeAvatar, setWhoCanSeeAvatar] = useState("everyone");

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url, who_can_message, who_can_add_to_groups, who_can_see_profile, who_can_see_last_seen, who_can_see_avatar")
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url);
      setWhoCanMessage(data.who_can_message);
      setWhoCanAddToGroups(data.who_can_add_to_groups);
      setWhoCanSeeProfile(data.who_can_see_profile);
      setWhoCanSeeLastSeen(data.who_can_see_last_seen);
      setWhoCanSeeAvatar((data as any).who_can_see_avatar || "everyone");
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 5 МБ)");
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/avatar.${ext}`;

    setSaving(true);
    const { error: uploadErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      toast.error("Ошибка загрузки аватара");
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user!.id);
    setAvatarUrl(url);
    setSaving(false);
    toast.success("Аватар обновлён");
  };

  const saveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Имя не может быть пустым");
      return;
    }
    if (!username.trim()) {
      toast.error("Юзернейм не может быть пустым");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      toast.error("Юзернейм: 3-30 символов, только латиница, цифры и _");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), username: username.trim(), bio: bio.trim() || null })
      .eq("user_id", user!.id);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Этот юзернейм уже занят" : "Ошибка сохранения");
    } else {
      toast.success("Профиль обновлён");
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSection("main");
    }
    setSaving(false);
  };

  const changeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Письмо подтверждения отправлено на новый адрес");
      setNewEmail("");
      setSection("main");
    }
    setSaving(false);
  };

  const savePrivacy = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        who_can_message: whoCanMessage,
        who_can_add_to_groups: whoCanAddToGroups,
        who_can_see_profile: whoCanSeeProfile,
        who_can_see_last_seen: whoCanSeeLastSeen,
        who_can_see_avatar: whoCanSeeAvatar,
      } as any)
      .eq("user_id", user!.id);

    if (error) {
      toast.error("Ошибка сохранения");
    } else {
      toast.success("Настройки конфиденциальности обновлены");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={() => (section === "main" ? navigate("/profile") : setSection("main"))}
          className="rounded-full p-1 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">
          {section === "main" && "Настройки аккаунта"}
          {section === "password" && "Изменить пароль"}
          {section === "email" && "Изменить почту"}
          {section === "privacy" && "Конфиденциальность"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {section === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 px-4 py-6 pb-20 space-y-6"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : null}
                  <AvatarFallback className="gradient-pulse text-white text-3xl font-black">
                    {displayName?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">Нажмите на камеру чтобы изменить фото</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Имя
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше имя"
                className="rounded-xl"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                Юзернейм
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="your_username"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">3-30 символов. Латиница, цифры и _</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">О себе</label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе..."
                className="rounded-xl"
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
            </div>

            <Button
              onClick={saveProfile}
              disabled={saving}
              className="w-full rounded-xl gradient-pulse text-white border-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Сохранить профиль
            </Button>

            {/* Menu items */}
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setSection("email")}
                className="flex w-full items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors"
              >
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Изменить почту</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </button>
              <button
                onClick={() => setSection("password")}
                className="flex w-full items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors"
              >
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Изменить пароль</p>
                </div>
              </button>
              <button
                onClick={() => setSection("privacy")}
                className="flex w-full items-center gap-3 px-4 py-3.5 border-b border-border hover:bg-muted/50 transition-colors"
              >
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Конфиденциальность</p>
                  <p className="text-xs text-muted-foreground">Кто может писать, видеть профиль...</p>
                </div>
              </button>
              <button
                onClick={async () => {
                  if (permission === "granted") {
                    toast.info("Уведомления уже включены");
                  } else if (permission === "denied") {
                    toast.error("Уведомления заблокированы в настройках браузера");
                  } else {
                    const result = await requestPermission();
                    if (result === "granted") {
                      toast.success("Уведомления включены!");
                    } else {
                      toast.error("Не удалось включить уведомления");
                    }
                  }
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Уведомления</p>
                  <p className="text-xs text-muted-foreground">
                    {permission === "granted" ? "Включены ✓" : permission === "denied" ? "Заблокированы браузером" : "Нажмите, чтобы включить"}
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {section === "password" && (
          <motion.div
            key="password"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 px-4 py-6 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Новый пароль</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Не менее 6 символов"
                  className="rounded-xl pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Подтвердите пароль</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                className="rounded-xl"
              />
            </div>

            <Button
              onClick={changePassword}
              disabled={saving || !newPassword || !confirmPassword}
              className="w-full rounded-xl gradient-pulse text-white border-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Изменить пароль
            </Button>
          </motion.div>
        )}

        {section === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 px-4 py-6 space-y-4"
          >
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Текущая почта</p>
              <p className="text-sm font-medium mt-0.5">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Новая почта</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Письмо подтверждения будет отправлено на новый адрес</p>
            </div>

            <Button
              onClick={changeEmail}
              disabled={saving || !newEmail}
              className="w-full rounded-xl gradient-pulse text-white border-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Изменить почту
            </Button>
          </motion.div>
        )}

        {section === "privacy" && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 px-4 py-6 space-y-5"
          >
            <PrivacySetting
              label="Кто может мне писать"
              description="Личные сообщения"
              value={whoCanMessage}
              onChange={setWhoCanMessage}
            />
            <PrivacySetting
              label="Кто может добавлять в группы"
              description="Приглашения в группы и каналы"
              value={whoCanAddToGroups}
              onChange={setWhoCanAddToGroups}
            />
            <PrivacySetting
              label="Кто видит мой профиль"
              description="Фото, био и контакты"
              value={whoCanSeeProfile}
              onChange={setWhoCanSeeProfile}
            />
            <PrivacySetting
              label="Кто видит «был(а) в сети»"
              description="Время последнего визита"
              value={whoCanSeeLastSeen}
              onChange={setWhoCanSeeLastSeen}
            />
            <PrivacySetting
              label="Кто видит мою аватарку"
              description="Фото профиля"
              value={whoCanSeeAvatar}
              onChange={setWhoCanSeeAvatar}
            />

            <Button
              onClick={savePrivacy}
              disabled={saving}
              className="w-full rounded-xl gradient-pulse text-white border-0"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Сохранить настройки
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrivacySetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        {privacyOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-medium transition-all",
              value === opt.value
                ? "gradient-pulse text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
