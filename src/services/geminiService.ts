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
- Total unique words tracked: ${gazeDataExport.wordReadingData.totalUniqueWords}
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

GAZE DATA SUMMARY:
- Total gaze points: ${gazeDataExport.metadata.totalGazePoints}
- Session duration: ${gazeDataExport.metadata.sessionDuration}ms
- Text container area: X: ${gazeDataExport.metadata.textContainerBounds.x}px, Y: ${gazeDataExport.metadata.textContainerBounds.y}px, Width: ${gazeDataExport.metadata.textContainerBounds.width}px, Height: ${gazeDataExport.metadata.textContainerBounds.height}px

${readableText ? `TEXT CONTENT:\n${readableText}\n\n` : ""}

${wordReadingSection}

RAW GAZE DATA (all ${gazeDataExport.rawGazeData.length} points):
${JSON.stringify(gazeDataExport.rawGazeData.slice(0, 50), null, 2)}${gazeDataExport.rawGazeData.length > 50 ? `\n... and ${gazeDataExport.rawGazeData.length - 50} more points` : ""}

Analyze and provide ONLY the following, based strictly on the coordinate, timestamp, and word-reading data:

1. **Overall Reading Pattern**: 
   - Was the user's gaze focused on specific regions/paragraphs of the text, or distributed across the entire text area?
   - Identify which vertical regions (top, middle, bottom) received most gaze points.
   - Did the user read sequentially (left-to-right, top-to-bottom) or in a scattered pattern?

2. **Most Read Parts**:
   - Identify the top words/phrases that received the most gaze attention (use word-level data if available).
   - List the top 3-5 words or text sections by gaze point frequency and time spent.
   - Indicate which concepts or topics drew the most attention.

3. **Coverage & Time Analysis**:
   - Calculate what percentage of the text content was actually looked at (based on unique words read).
   - Report which parts of the text were skipped or ignored.
   - Calculate average time spent per word/region if possible from timestamp data.
   - Report total session duration and which sections took longer to read.

4. **Re-reading Patterns**:
   - Identify words or sections that were read multiple times (frequency > 1).
   - Suggest whether re-reading indicates confusion, emphasis, or interest.

Only report what the data shows. If a metric cannot be determined from the data, state that explicitly.`;

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
