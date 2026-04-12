import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isEasterEventActive, getEventTimeRemaining, grantRandomBanner } from "@/lib/easter-config";
import { useAuth } from "@/components/AuthProvider";

interface EasterContextType {
  isActive: boolean;
  timeRemaining: { hours: number; minutes: number; seconds: number } | null;
  bannerGranted: boolean;
  grantedBannerId: string | null;
}

const EasterContext = createContext<EasterContextType>({
  isActive: false,
  timeRemaining: null,
  bannerGranted: false,
  grantedBannerId: null,
});

export function useEaster() {
  return useContext(EasterContext);
}

export function EasterThemeProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(isEasterEventActive());
  const [timeRemaining, setTimeRemaining] = useState(getEventTimeRemaining());
  const [bannerGranted, setBannerGranted] = useState(false);
  const [grantedBannerId, setGrantedBannerId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(isEasterEventActive());
      setTimeRemaining(getEventTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-grant random banner on login during event
  useEffect(() => {
    if (!user || !isEasterEventActive()) return;
    const bannerId = grantRandomBanner(user.id);
    if (bannerId) {
      setBannerGranted(true);
      setGrantedBannerId(bannerId);
    }
  }, [user]);

  // Apply Easter CSS class when active
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
    <EasterContext.Provider value={{ isActive, timeRemaining, bannerGranted, grantedBannerId }}>
      {children}
    </EasterContext.Provider>
  );
}
