import { Outlet } from "react-router-dom";
import { m } from "framer-motion";
import { pageEase, riseVariants } from "@/lib/motion";

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-2">
      <m.section
        className="relative order-2 flex min-h-[28rem] flex-col px-5 py-10 lg:order-1 lg:min-h-dvh lg:px-12 xl:px-16"
        variants={riseVariants}
        initial="initial"
        animate="animate"
        transition={pageEase}
      >
        <img
          src="/logo.png"
          alt="UZA Mobility"
          className="absolute left-5 top-5 h-10 w-auto object-contain lg:left-8 lg:top-8"
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[26rem] text-center">
            <Outlet />
          </div>
        </div>
      </m.section>

      <section className="relative order-1 h-48 overflow-hidden bg-[#1b2838] sm:h-56 lg:order-2 lg:h-auto lg:min-h-dvh">
        <img
          src="/login-hero.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover object-center"
        />
      </section>
    </div>
  );
}
