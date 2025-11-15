/**
 * Gemini API Service for analyzing gaze tracking data
 * Requires VITE_GEMINI_API_KEY environment variable
 */

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
    const analysisPrompt = `You are an eye-tracking data analyst. Analyze the provided gaze data strictly based on actual coordinates and timestamps. Do not speculate or make assumptions beyond what the data shows.

GAZE DATA SUMMARY:
- Total gaze points: ${gazeDataExport.metadata.totalGazePoints}
- Session duration: ${gazeDataExport.metadata.sessionDuration}ms
- Text container area: X: ${gazeDataExport.metadata.textContainerBounds.x}px, Y: ${gazeDataExport.metadata.textContainerBounds.y}px, Width: ${gazeDataExport.metadata.textContainerBounds.width}px, Height: ${gazeDataExport.metadata.textContainerBounds.height}px

${readableText ? `TEXT CONTENT:\n${readableText}\n\n` : ""}

RAW GAZE DATA (all ${gazeDataExport.rawGazeData.length} points):
${JSON.stringify(gazeDataExport.rawGazeData, null, 2)}

Analyze and provide ONLY the following, based strictly on the coordinate and timestamp data:

1. **Overall Reading Pattern**: 
   - Was the user's gaze focused on specific regions/paragraphs of the text, or distributed across the entire text area?
   - Identify which vertical regions (top, middle, bottom) received most gaze points.
   - Did the user read sequentially (left-to-right, top-to-bottom) or in a scattered pattern?

2. **Most Read Parts**:
   - Map gaze coordinates to the text content and identify which specific words, phrases, or paragraphs received the most gaze points.
   - List the top 3-5 regions or text sections by gaze point frequency.
   - State the approximate number of gaze points in each region.

3. **Coverage & Time Analysis**:
   - Calculate what percentage of the text area was covered by gaze points (based on coordinate distribution).
   - Estimate what percentage of the text content was actually looked at.
   - Calculate average time spent per region if possible from timestamp data.
   - Report total session duration and which sections took longer to read.

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
