import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = "Calculation Error",
  message,
}) => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive dark:border-destructive/40">
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="space-y-1 text-sm">
        <h5 className="font-semibold tracking-tight">{title}</h5>
        <p className="text-muted-foreground dark:text-destructive-foreground/90">{message}</p>
      </div>
    </div>
  );
};

