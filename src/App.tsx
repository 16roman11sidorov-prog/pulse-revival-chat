import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { useNotifications } from "@/hooks/use-notifications";
import AuthPage from "./pages/AuthPage";
import ChatsPage from "./pages/ChatsPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import NewChatPage from "./pages/NewChatPage";
import CreateGroupPage from "./pages/CreateGroupPage";
import CreateChannelPage from "./pages/CreateChannelPage";
import BotFatherPage from "./pages/BotFatherPage";
import BotChatPage from "./pages/BotChatPage";
import BotSettingsPage from "./pages/BotSettingsPage";
import FeedPage from "./pages/FeedPage";
import AIPage from "./pages/AIPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  useNotifications();
  return (
    <div className="mx-auto max-w-lg min-h-screen bg-background">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
        <Route path="/chat/:chatId" element={<ProtectedRoute><ChatDetailPage /></ProtectedRoute>} />
        <Route path="/new-chat" element={<ProtectedRoute><NewChatPage /></ProtectedRoute>} />
        <Route path="/create-group" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
        <Route path="/create-channel" element={<ProtectedRoute><CreateChannelPage /></ProtectedRoute>} />
        <Route path="/botfather" element={<ProtectedRoute><BotFatherPage /></ProtectedRoute>} />
        <Route path="/bot/:botId" element={<ProtectedRoute><BotChatPage /></ProtectedRoute>} />
        <Route path="/bot/:botId/settings" element={<ProtectedRoute><BotSettingsPage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
