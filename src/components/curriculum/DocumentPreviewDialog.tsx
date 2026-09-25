import { useEffect, useState } from "react";
import { fetchModuleAttachmentBlob, type ModuleAttachment } from "@/services/moduleService";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { CANCEL_TEXT, LINK_TEXT } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";

function isPdf(att: ModuleAttachment) {
  return att.mime_type === "application/pdf" || /\.pdf$/i.test(att.name);
}

function isImage(att: ModuleAttachment) {
  return att.mime_type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(att.name);
}

function isText(att: ModuleAttachment) {
  return att.mime_type.startsWith("text/") || /\.(txt|md)$/i.test(att.name);
}

export function DocumentPreviewDialog({
  moduleId,
  attachment,
  open,
  onOpenChange,
  onDownload,
}: {
  moduleId: string | null;
  attachment: ModuleAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !moduleId || !attachment?.id) {
      setBlobUrl(null);
      setText(null);
      setError(null);
      return;
    }
    let revoked = false;
    let url: string | null = null;
    setLoading(true);
    setError(null);
    setText(null);
    setBlobUrl(null);
    fetchModuleAttachmentBlob(moduleId, attachment.id)
      .then(async (blob) => {
        if (revoked) return;
        const typed =
          attachment.mime_type && blob.type !== attachment.mime_type
            ? new Blob([blob], { type: attachment.mime_type })
            : blob;
        if (isText(attachment)) {
          setText(await typed.text());
          return;
        }
        url = URL.createObjectURL(typed);
        setBlobUrl(url);
      })
      .catch((err: Error) => {
        if (!revoked) setError(err.message || "Could not open document");
      })
      .finally(() => {
        if (!revoked) setLoading(false);
      });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, moduleId, attachment]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden border border-border/40 bg-white p-4">
        <DialogTitle className="text-base font-medium">{attachment?.name ?? t("col.document")}</DialogTitle>
        <DialogDescription className="sr-only">Teaching document preview</DialogDescription>
        <div className="mt-3 min-h-[24rem] flex-1 overflow-auto border border-border/40 bg-muted/30">
          {loading && <LoadingSpinner />}
          {error && <p className="p-8 text-center text-sm text-destructive">{error}</p>}
          {!loading && !error && attachment && isPdf(attachment) && blobUrl && (
            <iframe title={attachment.name} src={blobUrl} className="h-[70vh] w-full bg-white" />
          )}
          {!loading && !error && attachment && isImage(attachment) && blobUrl && (
            <img src={blobUrl} alt={attachment.name} className="mx-auto max-h-[70vh] object-contain" />
          )}
          {!loading && !error && text != null && (
            <pre className="whitespace-pre-wrap p-4 font-mono text-sm">{text}</pre>
          )}
          {!loading && !error && attachment && !isPdf(attachment) && !isImage(attachment) && text == null && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t("empty.noDocs")}
            </p>
          )}
        </div>
        <div className="mt-3 flex justify-end gap-4">
          <button type="button" className={LINK_TEXT} onClick={onDownload}>
            {t("common.download")}
          </button>
          <button type="button" className={CANCEL_TEXT} onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
