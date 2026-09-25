import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useI18n } from "@/i18n/LanguageContext";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={pending}
            className="h-10 border border-border/40 bg-card px-4 text-sm text-foreground hover:bg-accent/60"
          >
            {t("common.cancel")}
          </AlertDialogCancel>
          <button
            type="button"
            disabled={pending}
            className="h-10 bg-destructive px-4 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onConfirm()}
          >
            {pending ? t("common.working") : confirmLabel ?? t("common.confirm")}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
