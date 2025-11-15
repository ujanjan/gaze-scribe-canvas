/**
 * Gemini API Service for analyzing gaze tracking data
 * Requires VITE_GEMINI_API_KEY environment variable
 */

export interface WordReadingData {
  word: string;
  wordIndex: number;
  gazeTotalTime: number;
  gazePointCount: number;
  firstGazeTime: number;
  lastGazeTime: number;
  frequency: number;
}

export interface WordReadingEvent {
  word: string;
  wordIndex: number;
  timestamp: number;
}

export interface GazeDataExport {
  metadata: {
    sessionDuration: number;
    totalGazePoints: number;
    calibrated: boolean;
    exportTimestamp: string;
    textContainerBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  rawGazeData: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  wordReadingData?: {
    wordReadings: WordReadingData[];
    readingSequence: WordReadingEvent[];
    totalUniqueWords: number;
    totalWordsInText: number;
  };
}

export interface AnalysisResult {
  summary: string;
  readingPattern: string;
  attentionAreas: string;
  engagementMetrics: string;
  recommendations: string;
  rawAnalysis: string;
}

class GeminiService {
  private apiKey: string;
  private apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "VITE_GEMINI_API_KEY environment variable is not set. Gemini API analysis will not work."
      );
    }
  }

  /**
   * Analyzes gaze data using Gemini API
   */
  async analyzeGazeData(
    gazeDataExport: GazeDataExport,
    readableText?: string
  ): Promise<AnalysisResult> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is not configured. Please set VITE_GEMINI_API_KEY environment variable."
      );
    }

    // Create a detailed prompt for analysis
    const wordReadingSection =
      gazeDataExport.wordReadingData ?
        `
WORD-LEVEL READING DATA:
- Total unique word positions in text: ${gazeDataExport.wordReadingData.totalWordsInText}
- Unique word positions that were gazed at: ${gazeDataExport.wordReadingData.wordReadings.length}
- Coverage: ${Math.round((gazeDataExport.wordReadingData.wordReadings.length / gazeDataExport.wordReadingData.totalWordsInText) * 100)}%
- Top 10 most read words:
${gazeDataExport.wordReadingData.wordReadings
  .slice(0, 10)
  .map(
    (w, i) =>
      `  ${i + 1}. "${w.word}" - ${w.gazePointCount} gaze points, ${w.gazeTotalTime}ms, read ${w.frequency} time(s)`
  )
  .join("\n")}

- Reading sequence (order of unique words first read):
${gazeDataExport.wordReadingData.readingSequence
  .slice(0, 20)
  .map((e) => `"${e.word}"`)
  .join(" → ")}${gazeDataExport.wordReadingData.readingSequence.length > 20 ? "..." : ""}
`
      : "";

    const analysisPrompt = `You are an eye-tracking data analyst. Analyze the provided gaze data strictly based on actual coordinates, timestamps, and word-level readings. Do not speculate or make assumptions beyond what the data shows.

READER TASK: Reading for comprehension - The user was instructed to read the text naturally and understand the content.

GAZE DATA SUMMARY:
- Total gaze points: ${gazeDataExport.metadata.totalGazePoints}
- Session duration: ${gazeDataExport.metadata.sessionDuration}ms
- Text container area: X: ${gazeDataExport.metadata.textContainerBounds.x}px, Y: ${gazeDataExport.metadata.textContainerBounds.y}px, Width: ${gazeDataExport.metadata.textContainerBounds.width}px, Height: ${gazeDataExport.metadata.textContainerBounds.height}px

${readableText ? `TEXT CONTENT:\n${readableText}\n\n` : ""}

${wordReadingSection}

RAW GAZE DATA (all ${gazeDataExport.rawGazeData.length} points):
${JSON.stringify(gazeDataExport.rawGazeData.slice(0, 50), null, 2)}${gazeDataExport.rawGazeData.length > 50 ? `\n... and ${gazeDataExport.rawGazeData.length - 50} more points` : ""}

Based on the eye-tracking data, provide a simple, conversational analysis covering:

1. **What Interested the Reader Most**:
   - Which words, phrases, or concepts did they spend the most time looking at?
   - What topics or ideas seem to have captured their attention?

2. **Areas of Focus**:
   - Which sections of the text (top, middle, bottom, or specific paragraphs) did they focus on the most?
   - Did they read everything, or did they skip certain parts?

3. **How They Read**:
   - Did they read the text in order, or did their eyes jump around?
   - Do they seem to have re-read any important words or concepts?

Keep the analysis natural and easy to understand. Focus on insights about what the reader found interesting rather than technical metrics.`;

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: analysisPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      };

      const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();

      console.log("Gemini API Response:", data);

      // Handle different response structures
      let analysisText: string | null = null;

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        analysisText = data.candidates[0].content.parts[0].text;
      } else if (typeof data === "string") {
        analysisText = data;
      } else {
        console.error("Unexpected Gemini API response structure:", data);
        throw new Error("Invalid response from Gemini API");
      }

      if (!analysisText) {
        throw new Error("No analysis text in Gemini API response");
      }

      // Parse the response into structured sections
      return this.parseAnalysisResponse(analysisText);
    } catch (error) {
      console.error("Gemini API analysis error:", error);
      throw error;
    }
  }

  /**
    * Parses the Gemini API response into structured sections
    */
  private parseAnalysisResponse(text: string): AnalysisResult {
    const sections = {
      readingPattern: this.extractSection(text, "Reading Pattern", ""),
      attentionAreas: this.extractSection(text, "Attention Areas", ""),
      engagementMetrics: this.extractSection(text, "Engagement Metrics", ""),
      recommendations: this.extractSection(text, "Recommendations", ""),
      summary: this.extractSection(text, "Key Insights", ""),
      rawAnalysis: text,
    };

    // If sections weren't found, log and return what we have
    console.log("Parsed sections:", sections);

    return sections;
  }

  /**
    * Helper to extract a section from the response text
    */
  private extractSection(
    text: string,
    sectionName: string,
    defaultValue: string
  ): string {
    // Match section headers like "## Reading Pattern:" or "**Reading Pattern**:" or just "Reading Pattern"
    const regex = new RegExp(
      `(?:\\*\\*)?${sectionName}(?:\\*\\*)?[:\\s]*\n([^]*?)(?=\n(?:\\*\\*)?[A-Z][a-z]+|$)`,
      "i"
    );
    const match = text.match(regex);
    const result = match ? match[1].trim() : defaultValue;
    console.log(`Extracting "${sectionName}":`, result ? "Found" : "Not found");
    return result;
  }
}

export default new GeminiService();
