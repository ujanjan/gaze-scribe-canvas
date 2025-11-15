/**
 * Word Tracking Service
 * Handles word detection, bounding box calculation, and reading metrics
 */

export interface WordBounds {
  word: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

export interface WordReading {
  word: string;
  wordIndex: number;
  gazeTotalTime: number; // ms
  gazePointCount: number;
  firstGazeTime: number;
  lastGazeTime: number;
  frequency: number; // how many separate time periods it was gazed at
}

export interface WordReadingEvent {
  word: string;
  wordIndex: number;
  timestamp: number;
}

class WordTrackingService {
  private wordBoundsMap: Map<number, WordBounds> = new Map();
  private wordReadings: Map<string, WordReading> = new Map();
  private wordReadingSequence: WordReadingEvent[] = [];
  private lastGazedWordIndex: number = -1;
  private wordIndexToWord: Map<number, string> = new Map();

  /**
   * Extract all words and their bounding boxes from a text container
   */
  extractWordBounds(containerElement: HTMLElement): WordBounds[] {
    const words: WordBounds[] = [];
    let wordIndex = 0;

    console.log("[WordTracking] Starting extraction from container", containerElement);
    console.log("[WordTracking] Container element type:", containerElement.tagName);
    console.log("[WordTracking] Container text content length:", containerElement.textContent?.length || 0);

    // Use TreeWalker to traverse text nodes
    const walker = document.createTreeWalker(
      containerElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    let nodeCount = 0;
    let totalWordsFound = 0;

    while ((node = walker.nextNode())) {
      const textContent = node.textContent || "";
      const nodeText = textContent;
      
      // Find all word matches with their positions
      const wordMatches = Array.from(nodeText.matchAll(/\S+/g));
      nodeCount++;
      totalWordsFound += wordMatches.length;

      console.log(`[WordTracking] Text node ${nodeCount}: "${textContent.substring(0, 50)}..." has ${wordMatches.length} words`);

      // Get the parent element to calculate positions
      const parent = node.parentElement;
      if (!parent) {
        console.log("[WordTracking] Warning: text node has no parent element");
        continue;
      }

      // For each word match with known position
      for (const match of wordMatches) {
        const word = match[0];
        const wordStart = match.index || 0;
        const wordEnd = wordStart + word.length;

        // Create range for this word
        const wordRange = document.createRange();
        wordRange.setStart(node, wordStart);
        wordRange.setEnd(node, wordEnd);

        try {
          const rect = wordRange.getBoundingClientRect();
          
          // Log details for debugging
          if (wordIndex === 0 || wordIndex === totalWordsFound - 1) {
            console.log(`[WordTracking] Word "${word}" bounds:`, {
              width: rect.width,
              height: rect.height,
              x: rect.left,
              y: rect.top
            });
          }
          
          // Accept words even if width/height is 0 in some edge cases
          if (rect.width >= 0 && rect.height >= 0) {
            words.push({
              word,
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
              index: wordIndex,
            });

            this.wordIndexToWord.set(wordIndex, word);
            wordIndex++;
          }
        } catch (e) {
          console.warn("Error getting bounds for word:", word, e);
        }
      }
    }

    // Store the bounds map
    words.forEach((w) => {
      this.wordBoundsMap.set(w.index, w);
    });

    console.log(
      `[WordTracking] Extracted ${words.length} words from ${nodeCount} text nodes (found ${totalWordsFound} total)`
    );
    if (words.length > 0) {
      console.log(
        `[WordTracking] First word: "${words[0].word}" at (${Math.round(words[0].x)}, ${Math.round(words[0].y)})`
      );
      console.log(
        `[WordTracking] Last word: "${words[words.length - 1].word}" at (${Math.round(words[words.length - 1].x)}, ${Math.round(words[words.length - 1].y)})`
      );
    }

    return words;
  }

  /**
   * Find which word is at the given gaze coordinates
   */
  findWordAtGazePosition(gazeX: number, gazeY: number): WordBounds | null {
    if (this.wordBoundsMap.size === 0) {
      console.warn(
        "[WordTracking] No word bounds available. Did extraction run?"
      );
      return null;
    }

    for (const [_, wordBounds] of this.wordBoundsMap) {
      if (
        gazeX >= wordBounds.x &&
        gazeX <= wordBounds.x + wordBounds.width &&
        gazeY >= wordBounds.y &&
        gazeY <= wordBounds.y + wordBounds.height
      ) {
        return wordBounds;
      }
    }
    return null;
  }

  /**
   * Track a gaze point on a word
   */
  trackGazeOnWord(
    wordBounds: WordBounds,
    timestamp: number
  ): void {
    const wordKey = `${wordBounds.word}_${wordBounds.index}`;

    if (!this.wordReadings.has(wordKey)) {
      this.wordReadings.set(wordKey, {
        word: wordBounds.word,
        wordIndex: wordBounds.index,
        gazeTotalTime: 0,
        gazePointCount: 0,
        firstGazeTime: timestamp,
        lastGazeTime: timestamp,
        frequency: 1,
      });
    }

    const reading = this.wordReadings.get(wordKey)!;
    reading.gazePointCount++;
    reading.lastGazeTime = timestamp;

    // Track frequency: if we haven't gazed at this word recently, increment frequency
    if (
      this.lastGazedWordIndex !== wordBounds.index &&
      this.lastGazedWordIndex !== -1
    ) {
      reading.frequency++;
    }

    this.lastGazedWordIndex = wordBounds.index;

    // Add to reading sequence
    this.wordReadingSequence.push({
      word: wordBounds.word,
      wordIndex: wordBounds.index,
      timestamp,
    });
  }

  /**
   * Calculate time spent on each word (requires gaze data with timestamps)
   */
  calculateTimeMetrics(gazeData: Array<{ timestamp: number }>): void {
    if (gazeData.length < 2) return;

    for (const [_, reading] of this.wordReadings) {
      if (gazeData.length > 0) {
        // Estimate time: (point count / total points) * total session duration
        const totalDuration =
          gazeData[gazeData.length - 1].timestamp - gazeData[0].timestamp;
        const estimatedTime =
          (reading.gazePointCount / gazeData.length) * totalDuration;
        reading.gazeTotalTime = Math.round(estimatedTime);
      }
    }
  }

  /**
   * Get all word readings sorted by frequency
   */
  getWordReadings(): WordReading[] {
    return Array.from(this.wordReadings.values()).sort(
      (a, b) => b.gazePointCount - a.gazePointCount
    );
  }

  /**
   * Get unique words in reading sequence
   */
  getReadingSequence(): WordReadingEvent[] {
    // Return unique words in first-read order
    const seen = new Set<number>();
    return this.wordReadingSequence.filter((event) => {
      if (seen.has(event.wordIndex)) return false;
      seen.add(event.wordIndex);
      return true;
    });
  }

  /**
   * Get currently gazed word (for highlighting)
   */
  getCurrentGazedWordIndex(): number {
    return this.lastGazedWordIndex;
  }

  /**
   * Reset reading data for a new tracking session (keeps word bounds)
   */
  resetReadingData(): void {
    this.wordReadings.clear();
    this.wordReadingSequence = [];
    this.lastGazedWordIndex = -1;
  }

  /**
   * Reset all tracking state (including bounds)
   */
  reset(): void {
    this.wordBoundsMap.clear();
    this.wordReadings.clear();
    this.wordReadingSequence = [];
    this.lastGazedWordIndex = -1;
    this.wordIndexToWord.clear();
  }

  /**
   * Export word reading data as JSON
   */
  exportWordReadingData(): {
    wordReadings: WordReading[];
    readingSequence: WordReadingEvent[];
    totalUniqueWords: number;
  } {
    return {
      wordReadings: this.getWordReadings(),
      readingSequence: this.getReadingSequence(),
      totalUniqueWords: this.wordBoundsMap.size,
    };
  }
}

export default new WordTrackingService();
