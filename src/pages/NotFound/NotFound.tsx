import { Link } from "react-router-dom";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { pageEase, riseVariants } from "@/lib/motion";

export default function NotFound() {
  return (
    <m.main
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center"
      variants={riseVariants}
      initial="initial"
      animate="animate"
      transition={pageEase}
    >
      <p className="text-eyebrow text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Page not found</h1>
      <Button asChild className="mt-8">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </m.main>
  );
}
