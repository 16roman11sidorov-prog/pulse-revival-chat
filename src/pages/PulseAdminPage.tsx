import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Check, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ProRequest {
  id: string;
  user_id: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
}

const ADMIN_EMAIL = "16roman11sidorov@gmail.com";

export default function PulseAdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("pro_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as ProRequest[]) || []);
    setLoading(false);
  };

  const grantPro = async (req: ProRequest) => {
    setGranting(req.id);
    const { error } = await supabase.rpc("grant_pro", { target_user_id: req.user_id });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      // Update request status
      await supabase
        .from("pro_requests")
        .update({ status: "approved" } as any)
        .eq("id", req.id);
      toast.success(`Pro выдан пользователю ${req.username}`);
      loadRequests();
    }
    setGranting(null);
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Доступ запрещён</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">PulseAdmin</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Заявки на Pulse Pro ({requests.filter(r => r.status === "pending").length} ожидают)
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Нет заявок</div>
        ) : (
          requests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-card border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">@{req.username}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                </div>
                <Badge
                  variant={req.status === "approved" ? "default" : req.status === "pending" ? "secondary" : "destructive"}
                  className={req.status === "approved" ? "bg-green-500" : ""}
                >
                  {req.status === "pending" ? "Ожидает" : req.status === "approved" ? "Одобрено" : req.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(req.created_at).toLocaleString("ru", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              {req.status === "pending" && (
                <Button
                  onClick={() => grantPro(req)}
                  disabled={granting === req.id}
                  className="w-full rounded-xl border-0"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
                >
                  {granting === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Выдать Pro на 30 дней
                </Button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
