import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listCohorts } from "@/services/cohortService";
import { listCandidates } from "@/services/candidateService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";
import { CohortsPanel } from "@/components/dashboard/CohortsPanel";
import { CandidatesPanel } from "@/components/dashboard/CandidatesPanel";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { isDashboardTab, type DashboardTab } from "@/components/dashboard/types";
import { useAuth } from "@/hooks/useAuth";
import { defaultTabForRole } from "@/lib/permissions";
import { AnimatePresence, m } from "framer-motion";
import { CardGridSkeleton, TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { pageEase, pageVariants } from "@/lib/motion";
import { useWorkspaceResetKey } from "@/hooks/useWorkspaceResetKey";
import { useI18n } from "@/i18n/LanguageContext";

const DATA_TABS: DashboardTab[] = ["overview", "cohorts", "candidates"];

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const { user, canAccessTab } = useAuth();
  const { t } = useI18n();
  const resetKey = useWorkspaceResetKey();
  const rawTab = params.get("tab");
  const tab: DashboardTab =
    rawTab === "profile" ? "settings" : isDashboardTab(rawTab) ? rawTab : "overview";
  const needsData = DATA_TABS.includes(tab);

  useEffect(() => {
    if (rawTab === "profile") {
      setParams({ tab: "settings" }, { replace: true });
      return;
    }
    if (!user) return;
    if (!canAccessTab(tab)) {
      setParams({ tab: defaultTabForRole() }, { replace: true });
    }
  }, [user, tab, rawTab, canAccessTab, setParams]);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["manage-overview"],
    queryFn: async () => {
      const [cohorts, candidates] = await Promise.all([listCohorts(), listCandidates()]);
      return { cohorts, candidates };
    },
    enabled: needsData && Boolean(user),
  });

  if (!user || !canAccessTab(tab)) {
    return <CardGridSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {needsData && isPending && (
        <PageTitle>
          {tab === "cohorts" ? t("page.classes") : tab === "candidates" ? t("page.candidates") : t("page.overview")}
        </PageTitle>
      )}
      {needsData && isError && (
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <p className="text-base font-medium text-destructive">{t("overview.loadFail")}</p>
          <p className="mt-1 text-base text-muted-foreground">
            {error instanceof Error ? error.message : t("overview.failed")}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {needsData && isPending && (tab === "overview" ? <CardGridSkeleton cards={3} /> : <TableSkeleton cols={6} rows={8} />)}

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={tab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageEase}
        >
          {tab === "overview" && !isPending && !isError && data && (
            <OverviewPanel
              key={`overview-${resetKey}`}
              cohorts={data.cohorts}
              candidates={data.candidates}
            />
          )}

          {tab === "cohorts" && !isPending && !isError && data && (
            <CohortsPanel
              key={`cohorts-${resetKey}`}
              cohorts={data.cohorts}
              candidates={data.candidates}
            />
          )}

          {tab === "courses" && <Navigate to="/courses" replace />}
          {tab === "modules" && <Navigate to="/modules" replace />}

          {tab === "candidates" && !isPending && !isError && data && (
            <CandidatesPanel
              key={`candidates-${resetKey}`}
              cohorts={data.cohorts}
              candidates={data.candidates}
            />
          )}

          {tab === "settings" && <SettingsPanel key={`settings-${resetKey}`} />}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
