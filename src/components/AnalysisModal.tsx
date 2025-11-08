import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Copy, CheckCircle2 } from "lucide-react";
import { AnalysisResult } from "@/services/geminiService";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  heatmapImage?: string;
}

const AnalysisModal = ({
  isOpen,
  onClose,
  analysisResult,
  isLoading,
  error,
  heatmapImage,
}: AnalysisModalProps) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadAnalysis = () => {
    if (!analysisResult) return;

    const analysisText = `
EYE-TRACKING GAZE ANALYSIS REPORT
==================================
Generated: ${new Date().toLocaleString()}

READING PATTERN
${analysisResult.readingPattern || "No data"}

ATTENTION AREAS
${analysisResult.attentionAreas || "No data"}

ENGAGEMENT METRICS
${analysisResult.engagementMetrics || "No data"}

RECOMMENDATIONS
${analysisResult.recommendations || "No data"}

FULL ANALYSIS
${analysisResult.rawAnalysis || "No data"}
    `.trim();

    const blob = new Blob([analysisText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaze-analysis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gaze Pattern Analysis</DialogTitle>
          <DialogDescription>
            AI-powered analysis of your eye-tracking heatmap and reading pattern
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analyzing your gaze pattern using Gemini AI...
            </p>
          </div>
        )}

        {error && (
          <Card className="border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive font-medium">Error: {error}</p>
            <p className="text-xs text-destructive/80 mt-2">
              Please ensure VITE_GEMINI_API_KEY is set in your .env file
            </p>
          </Card>
        )}

        {analysisResult && !isLoading && (
          <div className="space-y-6">
            {/* Heatmap Preview */}
            {heatmapImage && (
              <Card className="overflow-hidden bg-muted p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Heatmap Visualization
                </p>
                <img
                  src={heatmapImage}
                  alt="Gaze heatmap"
                  className="max-h-64 w-full rounded object-contain"
                />
              </Card>
            )}

            {/* Analysis Sections */}
            {analysisResult.readingPattern && (
              <AnalysisSection
                title="Reading Pattern"
                content={analysisResult.readingPattern}
                onCopy={() =>
                  copyToClipboard(analysisResult.readingPattern, "readingPattern")
                }
                isCopied={copiedSection === "readingPattern"}
              />
            )}

            {analysisResult.attentionAreas && (
              <AnalysisSection
                title="Attention Areas"
                content={analysisResult.attentionAreas}
                onCopy={() =>
                  copyToClipboard(analysisResult.attentionAreas, "attentionAreas")
                }
                isCopied={copiedSection === "attentionAreas"}
              />
            )}

            {analysisResult.engagementMetrics && (
              <AnalysisSection
                title="Engagement Metrics"
                content={analysisResult.engagementMetrics}
                onCopy={() =>
                  copyToClipboard(
                    analysisResult.engagementMetrics,
                    "engagementMetrics"
                  )
                }
                isCopied={copiedSection === "engagementMetrics"}
              />
            )}

            {analysisResult.recommendations && (
              <AnalysisSection
                title="Recommendations"
                content={analysisResult.recommendations}
                onCopy={() =>
                  copyToClipboard(
                    analysisResult.recommendations,
                    "recommendations"
                  )
                }
                isCopied={copiedSection === "recommendations"}
              />
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={downloadAnalysis}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !error && !analysisResult && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Ready to analyze your gaze pattern. Start tracking to begin.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface AnalysisSectionProps {
  title: string;
  content: string;
  onCopy: () => void;
  isCopied: boolean;
}

const AnalysisSection = ({
  title,
  content,
  onCopy,
  isCopied,
}: AnalysisSectionProps) => (
  <Card className="bg-card p-4">
    <div className="flex items-start justify-between gap-4 mb-3">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCopy}
        className="shrink-0"
        title="Copy to clipboard"
      >
        {isCopied ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
    <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
      {content}
    </p>
  </Card>
);

export default AnalysisModal;
