import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, Download } from "lucide-react";
import { useState } from "react";
import { AnalysisResult } from "@/services/geminiService";

interface AnalysisResultsProps {
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

const AnalysisResults = ({
  analysisResult,
  isLoading,
  error,
}: AnalysisResultsProps) => {
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

  if (!analysisResult && !isLoading && !error) {
    return null;
  }

  return (
    <Card className="p-6 space-y-4 bg-card max-h-[600px] overflow-y-auto">
      <h3 className="text-lg font-semibold text-foreground">
        Analysis Results
      </h3>

      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-3 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Analyzing your gaze pattern...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive font-medium">Error</p>
          <p className="text-xs text-destructive/80 mt-1">{error}</p>
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="space-y-4">
          {/* Reading Pattern */}
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

          {/* Attention Areas */}
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

          {/* Engagement Metrics */}
          {analysisResult.engagementMetrics && (
            <AnalysisSection
              title="Engagement"
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

          {/* Recommendations */}
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

          {/* Download Button */}
          <Button
            onClick={downloadAnalysis}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      )}
    </Card>
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
  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCopy}
        className="h-6 w-6 p-0"
        title="Copy to clipboard"
      >
        {isCopied ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
    <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">
      {content}
    </p>
  </div>
);

export default AnalysisResults;
