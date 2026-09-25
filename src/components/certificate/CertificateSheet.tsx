import { cn, formatDob } from "@/lib/utils";
import type { Candidate } from "@/services/candidateService";
import type { Cohort } from "@/services/cohortService";

const FOREST = "#1a3c32";
const GOLD = "#c4a056";
const PAPER = "#f8f1e3";
const INK = "#1e2a24";
const MUTED = "#5e6a64";
const ALGERIAN = `Algerian, "Cinzel Decorative", serif`;
const BODY = `"Cormorant Garamond", serif`;
const DISPLAY = `"Cinzel", serif`;
const SCRIPT = `"Great Vibes", "Playfair Display", cursive`;

function CornerMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 72" fill="none" aria-hidden>
      <path d="M8 64 V18 Q8 8 18 8 H64" stroke={GOLD} strokeWidth="2.4" />
      <path d="M16 64 V24 Q16 16 24 16 H64" stroke={GOLD} strokeWidth="1.1" opacity="0.85" />
      <circle cx="16" cy="16" r="3.2" fill={GOLD} />
    </svg>
  );
}

function DiamondRule() {
  return (
    <div className="mx-auto flex w-64 items-center gap-3" aria-hidden>
      <span className="h-px flex-1" style={{ background: GOLD }} />
      <span className="size-2 rotate-45" style={{ background: GOLD }} />
      <span className="h-px flex-1" style={{ background: GOLD }} />
    </div>
  );
}

function Seal({ year }: { year: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-[86px] w-[86px]" aria-hidden>
      <circle cx="60" cy="60" r="58" fill={FOREST} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={GOLD} strokeWidth="2.2" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={GOLD} strokeWidth="0.7" />
      <circle cx="60" cy="60" r="34" fill={PAPER} />
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fill={FOREST}
        fontSize="13"
        fontWeight="700"
        letterSpacing="2.4"
        style={{ fontFamily: DISPLAY }}
      >
        UZA
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fill={GOLD}
        fontSize="7"
        letterSpacing="1.8"
        style={{ fontFamily: DISPLAY }}
      >
        {year}
      </text>
    </svg>
  );
}

export function CertificateSheet({
  candidate,
  cohort,
  className,
}: {
  candidate: Candidate;
  cohort: Cohort | null;
  className?: string;
}) {
  const instructor =
    cohort?.instructors?.find((person) => person.full_name)?.full_name ??
    cohort?.instructors?.[0]?.email ??
    "Lead Instructor";
  const dates =
    cohort?.start_date || cohort?.end_date
      ? [formatDob(cohort.start_date), formatDob(cohort.end_date)].filter((d) => d && d !== "—").join("  —  ")
      : null;
  const programme = cohort?.course?.name ?? "the training programme";
  const intake = cohort?.name;
  const year = (cohort?.end_date ?? cohort?.start_date ?? new Date().toISOString()).slice(0, 4);
  const stats = [
    candidate.attendance_percentage != null ? `Attendance ${candidate.attendance_percentage}%` : null,
    candidate.exam_score != null ? `Exam ${candidate.exam_score}%` : null,
  ].filter(Boolean);

  return (
    <article
      className={cn("certificate-print-root relative aspect-[1.414/1] w-full overflow-hidden", className)}
      style={{ background: FOREST }}
    >
      <div className="absolute inset-[10px] sm:inset-[14px]" style={{ background: GOLD }} />
      <div
        className="absolute inset-[13px] sm:inset-[17px]"
        style={{
          background: PAPER,
          backgroundImage: `radial-gradient(circle at 50% 42%, rgba(26,60,50,0.05), transparent 52%)`,
        }}
      />

      <div className="absolute inset-[22px] sm:inset-[28px] border" style={{ borderColor: `${GOLD}99` }} />

      <CornerMark className="absolute top-[26px] left-[26px] h-12 w-12 sm:top-[32px] sm:left-[32px] sm:h-14 sm:w-14" />
      <CornerMark className="absolute top-[26px] right-[26px] h-12 w-12 rotate-90 sm:top-[32px] sm:right-[32px] sm:h-14 sm:w-14" />
      <CornerMark className="absolute bottom-[26px] left-[26px] h-12 w-12 -rotate-90 sm:bottom-[32px] sm:left-[32px] sm:h-14 sm:w-14" />
      <CornerMark className="absolute right-[26px] bottom-[26px] h-12 w-12 rotate-180 sm:right-[32px] sm:bottom-[32px] sm:h-14 sm:w-14" />

      <img
        src="/logo.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[46%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.06]"
        style={{ filter: "brightness(0)" }}
      />

      <div className="relative z-10 flex h-full flex-col items-center px-[8%] py-[7%] text-center">
        <img
          src="/logo.png"
          alt="UZA Mobility"
          className="h-8 w-auto object-contain sm:h-10"
          style={{ filter: "brightness(0)" }}
        />
        <p
          className="mt-3 text-[10px] tracking-[0.42em] uppercase sm:text-[11px]"
          style={{ fontFamily: DISPLAY, color: MUTED }}
        >
          Training Academy
        </p>

        <h2
          className="font-algerian mt-3 text-[34px] leading-none sm:text-[44px]"
          style={{ fontFamily: ALGERIAN, color: FOREST, fontWeight: 700 }}
        >
          Certificate
        </h2>
        <h2
          className="font-algerian mt-1 text-[34px] leading-none sm:text-[44px]"
          style={{ fontFamily: ALGERIAN, color: FOREST, fontWeight: 700 }}
        >
          of Completion
        </h2>

        <div className="mt-4">
          <DiamondRule />
        </div>

        <p
          className="mt-5 text-sm italic sm:text-base"
          style={{ fontFamily: BODY, color: MUTED }}
        >
          This is to certify that
        </p>
        <p
          className="mt-1 max-w-full px-4 text-[40px] leading-tight sm:text-[52px]"
          style={{ fontFamily: SCRIPT, color: INK }}
        >
          {candidate.full_name}
        </p>
        <div className="mx-auto mt-1 h-px w-52 sm:w-72" style={{ background: GOLD }} />

        <p
          className="mx-auto mt-4 max-w-[36rem] text-sm leading-relaxed sm:text-[17px]"
          style={{ fontFamily: BODY, color: INK }}
        >
          has successfully completed{" "}
          <span className="font-semibold" style={{ fontFamily: DISPLAY }}>
            {programme}
          </span>
          {intake ? ` · ${intake}` : ""}
          {dates ? ` (${dates})` : ""}.
        </p>
        {stats.length > 0 ? (
          <p
            className="mt-2 text-[11px] tracking-[0.18em] uppercase sm:text-xs"
            style={{ fontFamily: DISPLAY, color: MUTED }}
          >
            {stats.join("   ·   ")}
          </p>
        ) : null}

        <div className="mt-auto grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-end gap-4 sm:gap-10">
          <div>
            <div className="mx-auto h-px w-36 sm:w-44" style={{ background: GOLD }} />
            <p className="mt-2 text-sm sm:text-base" style={{ fontFamily: `"Playfair Display", serif`, color: INK }}>
              {instructor}
            </p>
            <p className="text-[10px] tracking-[0.22em] uppercase sm:text-[11px]" style={{ fontFamily: DISPLAY, color: MUTED }}>
              Lead Instructor
            </p>
          </div>
          <Seal year={year} />
          <div>
            <div className="mx-auto h-px w-36 sm:w-44" style={{ background: GOLD }} />
            <p className="mt-2 text-sm sm:text-base" style={{ fontFamily: `"Playfair Display", serif`, color: INK }}>
              UZA Mobility
            </p>
            <p className="text-[10px] tracking-[0.22em] uppercase sm:text-[11px]" style={{ fontFamily: DISPLAY, color: MUTED }}>
              Programme Director
            </p>
          </div>
        </div>

        {candidate.candidate_code ? (
          <p
            className="mt-3 text-[10px] tracking-[0.28em] uppercase"
            style={{ fontFamily: DISPLAY, color: MUTED }}
          >
            Certificate No. {candidate.candidate_code}
          </p>
        ) : null}
      </div>
    </article>
  );
}
