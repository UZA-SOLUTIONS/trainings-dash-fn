import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/LanguageContext";

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="reason-field">{t("col.reason")}</Label>
          <Textarea
            id="reason-field"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending || reason.trim().length < 2}
            onClick={async () => {
              await onConfirm(reason.trim());
            }}
          >
            {pending ? t("common.saving") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
