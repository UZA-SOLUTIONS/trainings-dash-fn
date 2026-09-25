import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate } from "@/services/candidateService";
import { CertificateSheet } from "@/components/certificate/CertificateSheet";
import { Skeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { FadeIn } from "@/components/motion/FadeIn";
import { LINK_TEXT } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

export default function CandidateCertificate() {
  const { t } = useI18n();
  const { candidateId } = useParams<{ candidateId: string }>();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#1a3c32] px-4 py-8" aria-busy="true">
        <div className="mx-auto max-w-5xl">
          <Skeleton className="h-8 w-40 bg-white/20" />
          <div className="mt-6 aspect-[1.414/1] border border-white/15 bg-white/10 p-8">
            <Skeleton className="mx-auto h-10 w-64 bg-white/20" />
            <Skeleton className="mx-auto mt-8 h-6 w-80 bg-white/15" />
            <Skeleton className="mx-auto mt-16 h-12 w-96 max-w-full bg-white/25" />
            <Skeleton className="mx-auto mt-10 h-4 w-52 bg-white/15" />
          </div>
        </div>
      </div>
    );
  }
  if (isError || !data?.candidate) {
    return (
      <p className="p-10 text-destructive">
        {error instanceof Error ? error.message : t("cert.notFound")}
      </p>
    );
  }

  return (
    <FadeIn className="min-h-screen bg-[#1a3c32] px-4 py-8 print:bg-[#1a3c32] print:p-0">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: #1a3c32 !important; }
        }
      `}</style>
      <div className="mx-auto max-w-5xl print:hidden">
        <PageTitle
          actions={
            <button type="button" className={LINK_TEXT} onClick={() => window.print()}>
              {t("common.print")}
            </button>
          }
        >
          {t("page.certificate")}
        </PageTitle>
      </div>
      <div className="mx-auto mt-4 max-w-5xl print:mt-0 print:h-screen print:max-w-none">
        <CertificateSheet candidate={data.candidate} cohort={data.cohort} />
      </div>
    </FadeIn>
  );
}
