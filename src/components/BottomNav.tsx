import { MessageCircle, Newspaper, Bot, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/chats", icon: MessageCircle, label: "Чаты" },
  { path: "/feed", icon: Newspaper, label: "Лента" },
  { path: "/ai", icon: Bot, label: "AI" },
  { path: "/profile", icon: User, label: "Профиль" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenPaths = ["/chat/", "/auth", "/new-chat", "/support", "/create-group", "/create-channel", "/botfather", "/bot/", "/settings"];
  if (hiddenPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + "/") || (p.endsWith("/") && location.pathname.startsWith(p)))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl">
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path === "/chats" && location.pathname === "/");
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "fill-primary stroke-primary")} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
