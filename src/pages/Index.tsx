import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import CalibrationModal from "@/components/CalibrationModal";
import ControlPanel from "@/components/ControlPanel";
import AnalysisResults from "@/components/AnalysisResults";
import GazePointer from "@/components/GazePointer";
import TextDisplay from "@/components/TextDisplay";
import geminiService, { AnalysisResult, GazeDataExport } from "@/services/geminiService";
import gazeCloudService, { GazeData as GazeCloudGazeData } from "@/services/gazeCloudService";
import wordTrackingService, { WordBounds } from "@/services/wordTrackingService";
import { Eye } from "lucide-react";

interface GazeData {
  x: number;
  y: number;
  timestamp: number;
  calibrated: boolean;
}

const Index = () => {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [gazePoints, setGazePoints] = useState<GazeData[]>([]);
  const [gazeCloudLoaded, setGazeCloudLoaded] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [wordBounds, setWordBounds] = useState<WordBounds[]>([]);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number>(-1);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const isTrackingRef = useRef(false);

  // Initialize GazeCloudAPI
  useEffect(() => {
    const initGazeCloud = async () => {
      try {
        await gazeCloudService.initialize();
        console.log("GazeCloudAPI initialized successfully");
        setGazeCloudLoaded(true);

        // Setup gaze result callback
        gazeCloudService.setOnGazeResult((data: GazeCloudGazeData) => {
          if (isTrackingRef.current && data.calibrated) {
            setGazePoints((prev) => [...prev, data]);

            // Track which word is being gazed at
            const gazeWordBounds = wordTrackingService.findWordAtGazePosition(
              data.x,
              data.y
            );

            if (gazeWordBounds) {
              setHighlightedWordIndex(gazeWordBounds.index);
              wordTrackingService.trackGazeOnWord(gazeWordBounds, data.timestamp);
            } else {
              setHighlightedWordIndex(-1);
            }
          }
        });

        // Setup error handling
        gazeCloudService.setOnError((error: string) => {
          console.error("GazeCloud error:", error);
          toast.error(`Eye tracking error: ${error}`);
        });

        gazeCloudService.setOnCameraDenied(() => {
          toast.error("Camera access denied. Please allow camera access to use eye tracking.");
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to load GazeCloudAPI";
        console.error(errorMsg);
        toast.error(errorMsg);
      }
    };

    initGazeCloud();

    return () => {
      gazeCloudService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (gazeCloudLoaded && !isCalibrated) {
      // Show calibration modal after a brief delay
      setTimeout(() => {
        setShowCalibration(true);
      }, 1000);
    }
  }, [gazeCloudLoaded, isCalibrated]);

  const handleCalibrationComplete = () => {
    setIsCalibrated(true);
    setShowCalibration(false);
    toast.success("Calibration complete! You can now start tracking.");
  };

  const handleStartTracking = () => {
    if (!isCalibrated) {
      toast.error("Please complete calibration first.");
      return;
    }
    setIsTracking(true);
    isTrackingRef.current = true;
    wordTrackingService.resetReadingData();
    setHighlightedWordIndex(-1);
    toast.success("Eye tracking started!");
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    setHighlightedWordIndex(-1);
    toast.info("Eye tracking paused");
  };

  const handleRecalibrate = () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    setShowCalibration(true);
    toast.info("Starting recalibration...");
  };



  const getExportData = (): GazeDataExport => {
    const textContainer = textContainerRef.current;
    const bounds = textContainer?.getBoundingClientRect() || {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };

    // Calculate time metrics for word reading data
    if (gazePoints.length > 0) {
      wordTrackingService.calculateTimeMetrics(gazePoints);
    }

    const wordReadingData = wordTrackingService.exportWordReadingData();

    return {
      metadata: {
        sessionDuration:
          gazePoints.length > 0
            ? gazePoints[gazePoints.length - 1].timestamp -
              gazePoints[0].timestamp
            : 0,
        totalGazePoints: gazePoints.length,
        calibrated: isCalibrated,
        exportTimestamp: new Date().toISOString(),
        textContainerBounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
      rawGazeData: gazePoints,
      wordReadingData: {
        wordReadings: wordReadingData.wordReadings,
        readingSequence: wordReadingData.readingSequence,
        totalUniqueWords: wordReadingData.totalUniqueWords,
      },
    };
  };

  const downloadJSON = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    if (gazePoints.length === 0) {
      toast.error("No tracking data to export. Please start tracking first.");
      return;
    }

    const exportData = getExportData();

    // Export full data with coordinates
    const dataWithInstructions = {
      ...exportData,
      instructions: {
        description: "Eye-tracking data export",
        format: "JSON with raw gaze coordinates, metadata, and word-level readings",
        usage: "This data can be analyzed by LLMs to understand reading patterns, attention distribution, and user engagement with the text content.",
        fields: {
          metadata:
            "Session information including duration, calibration status, and text container positioning",
          rawGazeData:
            "Array of gaze points with x, y coordinates and timestamps in milliseconds",
          wordReadingData:
            "Word-level reading metrics including time spent per word, frequency, and reading sequence",
          textContainerBounds:
            "Position and dimensions of the text content area for mapping gaze points to text regions",
        },
      },
    };

    downloadJSON(dataWithInstructions, `eye-tracking-data-${Date.now()}.json`);

    // Also export word reading data separately for easy reference
    if (exportData.wordReadingData) {
      const wordReadingExport = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          sessionDuration: exportData.metadata.sessionDuration,
          totalGazePoints: exportData.metadata.totalGazePoints,
        },
        ...exportData.wordReadingData,
        description: "Word-level reading analytics from gaze tracking session",
      };

      downloadJSON(
        wordReadingExport,
        `word-reading-data-${Date.now()}.json`
      );
    }

    toast.success("Data exported successfully! (2 files: coordinates + words)");
  };

  const handleAnalyzeWithAI = async () => {
    if (gazePoints.length === 0) {
      toast.error("No tracking data to analyze. Please start tracking first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get the readable text from the content area
      const readableText = textContainerRef.current?.innerText || "";

      // Call Gemini API with gaze data
      const exportData = getExportData();
      const result = await geminiService.analyzeGazeData(
        exportData,
        readableText
      );

      setAnalysisResult(result);
      toast.success("Analysis complete! Check the results below.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Analysis error:", error);
      setAnalysisError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Gaze Pointer Overlay */}
      <GazePointer isTracking={isTracking} />

      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Eye className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                   Eye-Tracking Analysis Tool
                 </h1>
                 <p className="text-sm text-muted-foreground">
                   GazeCloud API Research Tool
                 </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Column - 70% - Text Content */}
          <div className="w-[70%]">
            <Card className="relative overflow-hidden bg-card p-8">
              <TextDisplay
                containerRef={textContainerRef}
                highlightedWordIndex={highlightedWordIndex}
                onWordsExtracted={setWordBounds}
              >
                <div className="w-full">
                  <h2 className="mb-6 text-3xl font-bold text-foreground">
                    The History of KTH Royal Institute of Technology
                  </h2>

                  <div className="space-y-6 text-lg leading-relaxed text-foreground">
                    <p>
                      KTH Royal Institute of Technology, founded in 1827 as the Technological Institute, is Sweden's largest and oldest technical university. Established to meet the growing demand for skilled engineers during Sweden's industrial revolution, the institution received royal status in 1877, becoming Kungliga Tekniska Högskolan. Throughout its nearly two-century history, KTH has remained at the forefront of technical education and innovation in Scandinavia.
                    </p>

                    <p>
                      Located in Stockholm, KTH's campus combines historic architecture with modern facilities across multiple locations. Today, the university educates approximately 13,000 undergraduate and 1,700 postgraduate students with a staff of around 3,500. KTH offers comprehensive programs in engineering, natural sciences, architecture, industrial management, and urban planning, while maintaining strong partnerships with leading universities worldwide and close collaboration with Swedish and international industries—a defining characteristic that ensures research and education remain relevant to real-world challenges.
                    </p>

                    <p>
                      In recent decades, KTH has embraced digital transformation and sustainability as core themes, launching initiatives focused on climate change, renewable energy, and sustainable development. The university continues to evolve and adapt its programs to meet the demands of a rapidly changing technological landscape while maintaining its commitment to excellence. As Sweden and the world face complex challenges in digitalization, urbanization, and environmental sustainability, KTH remains dedicated to developing the knowledge and solutions needed for a better future.
                    </p>
                  </div>
                </div>
              </TextDisplay>
            </Card>
          </div>

          {/* Right Column - 30% - Action Buttons and Controls */}
          <div className="w-[30%] space-y-6">
            {/* Control Panel */}
            <ControlPanel
              isTracking={isTracking}
              isCalibrated={isCalibrated}
              gazePointsCount={gazePoints.length}
              onStartTracking={handleStartTracking}
              onStopTracking={handleStopTracking}
              onRecalibrate={handleRecalibrate}
              onExportData={handleExportData}
              onAnalyzeWithAI={handleAnalyzeWithAI}
              isAnalyzing={isAnalyzing}
            />

            {/* Analysis Results Panel */}
            <AnalysisResults
              analysisResult={analysisResult}
              isLoading={isAnalyzing}
              error={analysisError}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-6">
          <Card className="bg-muted p-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              How to Use This Tool
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>1. Calibration:</strong> Complete the initial calibration by
                clicking on the points displayed on screen. This helps improve tracking
                accuracy.
              </li>
              <li>
                <strong>2. Start Tracking:</strong> Click "Start Tracking" to begin
                recording eye movements.
              </li>
              <li>
                <strong>3. Read the Text:</strong> Read through the text naturally while
                your eye movements are being tracked.
              </li>
              <li>
                <strong>4. Export Data:</strong> When finished, click "Export Data" to
                download your tracking data for analysis.
              </li>
            </ol>
          </Card>
        </div>
      </footer>

      {/* Calibration Modal */}
      {showCalibration && (
        <CalibrationModal
          isOpen={showCalibration}
          onComplete={handleCalibrationComplete}
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
};

export default Index;
