import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const NOTIFICATION_SOUND_URL = "/notification.wav";

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("push-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as {
            sender_id: string;
            content: string;
            conversation_id: string;
          };

          // Don't notify for own messages
          if (msg.sender_id === user.id) return;

          // Play sound (works even if tab is focused)
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          } catch {}

          // Don't show visual notification if tab is focused
          if (document.hasFocus() || permission !== "granted") return;

          // Try to get sender name
          let senderName = "Новое сообщение";
          try {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("user_id", msg.sender_id)
              .single();
            if (data) {
              senderName = data.display_name || data.username || "Пользователь";
            }
          } catch {}

          const options: NotificationOptions & { renotify?: boolean } = {
            body: msg.content.length > 100 ? msg.content.slice(0, 100) + "…" : msg.content,
            icon: "/favicon.ico",
            tag: msg.conversation_id,
          };
          (options as any).renotify = true;
          const notification = new Notification(senderName, options);

          notification.onclick = () => {
            window.focus();
            window.location.href = `/chat/${msg.conversation_id}`;
            notification.close();
          };
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission]);

  return { permission, requestPermission };
}
