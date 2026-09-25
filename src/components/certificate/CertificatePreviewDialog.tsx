import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { getCandidate } from "@/services/candidateService";
import { CertificateSheet } from "@/components/certificate/CertificateSheet";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { CANCEL_TEXT, LINK_TEXT, SAVE_TEXT } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

const CERT_W = 1100;
const CERT_H = 778;
const CHROME_H = 64;
const PAD = 16;

export function CertificatePreviewDialog({
  candidateId,
  open,
  onOpenChange,
}: {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.8);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: open && Boolean(candidateId),
  });

  const candidate = data?.candidate;
  const fileBase = `certificate-${candidate?.candidate_code ?? candidate?.id ?? "graduate"}`;

  useLayoutEffect(() => {
    if (!open) return;
    function fit() {
      const maxW = window.innerWidth * 0.92 - PAD * 2;
      const maxH = window.innerHeight * 0.92 - CHROME_H - PAD * 2;
      setScale(Math.min(1, maxW / CERT_W, maxH / CERT_H));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open, candidate]);

  async function handleDownload() {
    try {
      setBusy(true);
      const node = sheetRef.current;
      if (!node) throw new Error("Certificate is not ready");
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f8f1e3",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileBase}.png`;
      link.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download certificate");
    } finally {
      setBusy(false);
    }
  }

  const previewW = CERT_W * scale;
  const previewH = CERT_H * scale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none overflow-hidden border border-border/40 bg-white p-4 shadow-none"
        style={{ width: previewW + PAD * 2 }}
      >
        <DialogTitle className="sr-only">{t("page.certificate")}</DialogTitle>
        <DialogDescription className="sr-only">
          {candidate?.full_name ?? "Graduate certificate preview"}
        </DialogDescription>

        <div className="flex flex-col bg-white">
          {isPending && (
            <div className="py-4">
              <TableSkeleton cols={3} rows={4} />
            </div>
          )}
          {isError && (
            <p className="py-16 text-center text-sm text-destructive">
              {error instanceof Error ? error.message : t("cert.loading")}
            </p>
          )}
          {candidate && (
            <div className="overflow-hidden" style={{ width: previewW, height: previewH }}>
              <div
                ref={sheetRef}
                style={{
                  width: CERT_W,
                  height: CERT_H,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <CertificateSheet
                  candidate={candidate}
                  cohort={data.cohort}
                  className="h-full w-full aspect-auto"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-8 bg-white pt-4 print:hidden">
            <button
              type="button"
              className={LINK_TEXT}
              disabled={!candidate || busy}
              onClick={handleDownload}
            >
              {busy ? t("reports.downloading") : t("common.download")}
            </button>
            <button
              type="button"
              className={SAVE_TEXT}
              disabled={!candidate}
              onClick={() => window.print()}
            >
              {t("common.print")}
            </button>
            <button type="button" className={CANCEL_TEXT} onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </button>
          </div>
        </div>

        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 0; }
            body * { visibility: hidden; }
            .certificate-print-root, .certificate-print-root * { visibility: visible; }
            .certificate-print-root {
              position: fixed;
              inset: 0;
              margin: 0;
              transform: none !important;
              width: 100% !important;
              height: 100% !important;
              background: #1a3c32;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
