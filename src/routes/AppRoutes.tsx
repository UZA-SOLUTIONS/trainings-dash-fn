import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ClassroomLayout } from "@/layouts/ClassroomLayout";
import { AppShellSkeleton, Skeleton } from "@/components/feedback/Skeleton";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Courses = lazy(() => import("@/pages/Courses"));
const Modules = lazy(() => import("@/pages/Modules"));
const CohortDetail = lazy(() => import("@/pages/CohortDetail"));
const CohortCurriculum = lazy(() => import("@/pages/CohortCurriculum"));
const CohortAttendance = lazy(() => import("@/pages/CohortAttendance"));
const CohortAssessments = lazy(() => import("@/pages/CohortAssessments"));
const CohortGradebook = lazy(() => import("@/pages/CohortGradebook"));
const CohortIssues = lazy(() => import("@/pages/CohortIssues"));
const CohortReports = lazy(() => import("@/pages/CohortReports"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const CandidateCertificate = lazy(() => import("@/pages/CandidateCertificate"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function FallBack() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/auth") || pathname === "/login") {
    return (
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[26rem] space-y-3 text-center" aria-busy="true">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        <div className="relative hidden bg-primary lg:block">
          <img src="/login-hero.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        </div>
      </div>
    );
  }
  return <AppShellSkeleton />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FallBack />}>
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="/auth" element={<Login />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/candidates/:candidateId/certificate" element={<CandidateCertificate />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/candidates/:candidateId" element={<CandidateProfile />} />
            <Route path="/cohorts/:cohortId" element={<ClassroomLayout />}>
              <Route index element={<CohortDetail />} />
              <Route path="curriculum" element={<CohortCurriculum />} />
              <Route path="attendance" element={<CohortAttendance />} />
              <Route path="assessments" element={<CohortAssessments />} />
              <Route path="gradebook" element={<CohortGradebook />} />
              <Route path="issues" element={<CohortIssues />} />
              <Route path="reports" element={<CohortReports />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
