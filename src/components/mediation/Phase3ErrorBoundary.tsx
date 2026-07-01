import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; message?: string }

export class Phase3ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error("[Phase3ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" />
            Bir hata oluştu, lütfen sayfayı yenileyin
          </div>
          {this.state.message && (
            <p className="text-xs text-muted-foreground break-words">{this.state.message}</p>
          )}
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Yenile
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
