import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-eyebrow text-muted-foreground">404</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Page not found</h1>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
