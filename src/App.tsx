import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as Error & { status?: number }).status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <MotionProvider>
              <AppRoutes />
              <Toaster richColors position="top-center" />
            </MotionProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
