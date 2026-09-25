import { useEffect, useState } from "react";
import { useOutlet } from "react-router-dom";
import { StaffNav } from "@/components/layout/StaffNav";
import { ActiveCohortProvider } from "@/context/ActiveCohortContext";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/motion/PageMotion";

const NAV_COLLAPSED_KEY = "staff-nav-collapsed";

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const outlet = useOutlet();

  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <ActiveCohortProvider>
      <div className="min-h-screen bg-card text-base lg:flex lg:min-h-dvh">
        <StaffNav collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <div
          className={cn(
            "flex min-h-screen min-w-0 flex-1 flex-col pt-14 transition-[margin] duration-200 lg:min-h-dvh lg:pt-0",
            collapsed ? "lg:ml-14" : "lg:ml-60",
          )}
        >
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 pb-6 leading-normal sm:px-4 lg:px-5 lg:py-4">
            <PageMotion>{outlet}</PageMotion>
          </main>
        </div>
      </div>
    </ActiveCohortProvider>
  );
}
