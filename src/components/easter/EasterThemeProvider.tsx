import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isEasterEventActive, getEventTimeRemaining } from "@/lib/easter-config";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface EasterContextType {
  isActive: boolean;
  timeRemaining: { hours: number; minutes: number; seconds: number } | null;
  bannerGranted: boolean;
}

const EasterContext = createContext<EasterContextType>({
  isActive: false,
  timeRemaining: null,
  bannerGranted: false,
});

export function useEaster() {
  return useContext(EasterContext);
}

export function EasterThemeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(isEasterEventActive());
  const [timeRemaining, setTimeRemaining] = useState(getEventTimeRemaining());
  const [bannerGranted, setBannerGranted] = useState(false);
  const { user } = useAuth();

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(isEasterEventActive());
      setTimeRemaining(getEventTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-grant random banner on login during event
  const grantBanner = useCallback(async () => {
    if (!user || !isEasterEventActive()) return;

    // Check if user already has a banner
    const { data: existing } = await supabase
      .from("user_inventory" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", "banner")
      .eq("source", "event");

    if (existing && existing.length > 0) {
      setBannerGranted(true);
      return;
    }

    // Get all banners and pick a random one
    const { data: banners } = await supabase
      .from("easter_banners" as any)
      .select("id");

    if (!banners || banners.length === 0) return;

    const randomBanner = banners[Math.floor(Math.random() * banners.length)];

    await supabase.from("user_inventory" as any).insert({
      user_id: user.id,
      item_type: "banner",
      item_id: (randomBanner as any).id,
      source: "event",
    });

    // Auto-set as active banner
    const { data: existingConfig } = await supabase
      .from("user_banner_config" as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingConfig) {
      await supabase.from("user_banner_config" as any).insert({
        user_id: user.id,
        active_banner_id: (randomBanner as any).id,
        gifts_layout: [],
      });
    }

    setBannerGranted(true);
  }, [user]);

  useEffect(() => {
    grantBanner();
  }, [grantBanner]);

  // Apply Easter CSS overrides when active
  useEffect(() => {
    const root = document.documentElement;
    if (isActive) {
      root.classList.add("easter-event");
    } else {
      root.classList.remove("easter-event");
    }
    return () => root.classList.remove("easter-event");
  }, [isActive]);

  return (
    <EasterContext.Provider value={{ isActive, timeRemaining, bannerGranted }}>
      {children}
    </EasterContext.Provider>
  );
}
