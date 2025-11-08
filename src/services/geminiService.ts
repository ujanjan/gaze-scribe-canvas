/**
 * Gemini API Service for analyzing gaze tracking data and heatmap images
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
  private apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "VITE_GEMINI_API_KEY environment variable is not set. Gemini API analysis will not work."
      );
    }
  }

  /**
   * Extracts base64 data from a data URL
   */
  private extractBase64(dataUrl: string): string {
    const parts = dataUrl.split(",");
    return parts.length > 1 ? parts[1] : dataUrl;
  }

  /**
   * Analyzes gaze data and heatmap image using Gemini API
   */
  async analyzeGazeData(
    gazeDataExport: GazeDataExport,
    heatmapImageDataUrl: string,
    readableText?: string
  ): Promise<AnalysisResult> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is not configured. Please set VITE_GEMINI_API_KEY environment variable."
      );
    }

    const base64Image = this.extractBase64(heatmapImageDataUrl);

    // Create a detailed prompt for analysis
    const analysisPrompt = `You are an expert in eye-tracking analysis and user behavior research. 

I am providing you with:
1. A heatmap image showing the focus areas of a user's gaze during reading
2. JSON data containing raw gaze coordinates and timing information
3. The text content the user was reading (if provided)

GAZE DATA SUMMARY:
- Total gaze points collected: ${gazeDataExport.metadata.totalGazePoints}
- Session duration: ${gazeDataExport.metadata.sessionDuration}ms
- Text area bounds: Left: ${gazeDataExport.metadata.textContainerBounds.x}px, Top: ${gazeDataExport.metadata.textContainerBounds.y}px, Width: ${gazeDataExport.metadata.textContainerBounds.width}px, Height: ${gazeDataExport.metadata.textContainerBounds.height}px

${readableText ? `TEXT CONTENT:\n${readableText}\n\n` : ""}

Please analyze the heatmap image and provide a comprehensive analysis in the following sections:

1. **Reading Pattern**: Describe the user's reading pattern (left-to-right, top-to-bottom, scanning, focused, etc.)
2. **Attention Areas**: Identify which areas or regions received the most attention (top, middle, bottom, left, right, specific sections)
3. **Engagement Metrics**: Estimate the user's engagement level based on the gaze distribution
4. **Key Insights**: What can you infer about comprehension, interest, or potential challenges?
5. **Recommendations**: Suggestions for content improvement or layout optimization based on the gaze pattern

Format your response clearly with these sections separated by line breaks.`;

    try {
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: analysisPrompt,
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Image,
                },
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

      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid response from Gemini API");
      }

      const analysisText = data.candidates[0].content.parts[0].text;

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
      summary: this.extractSection(text, "summary", ""),
      readingPattern: this.extractSection(text, "reading pattern", ""),
      attentionAreas: this.extractSection(text, "attention areas", ""),
      engagementMetrics: this.extractSection(text, "engagement metrics", ""),
      recommendations: this.extractSection(text, "recommendations", ""),
      rawAnalysis: text,
    };

    // If sections weren't found with the regex, just return the full text as summary
    if (!sections.summary && !sections.readingPattern) {
      sections.summary = text;
    }

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
    const regex = new RegExp(
      `(?:^|\\n)\\*?\\*?${sectionName}[:\\*]*\\*?\\*?\\n?([^]*?)(?=\\n\\*?\\*?[A-Z]|$)`,
      "i"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : defaultValue;
  }
}

export default new GeminiService();
