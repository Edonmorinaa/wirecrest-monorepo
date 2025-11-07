// @ts-ignore
import { NlpManager } from "node-nlp";
import type { trainingData, TrainingUtterance } from "./sentimentTrainingData";

/**
 * SentimentAnalyzer class to initialize, train, and analyze text sentiment
 */
export class SentimentAnalyzer {
  private manager: any;
  private modelPath: string = "./model.nlp";

  constructor(languages: string[] = ["en"]) {
    this.manager = new NlpManager({
      languages,
      forceNER: true,
      nlu: { useNgram: false, threshold: 0.8 }, // Enable n-grams, stricter threshold
      autoSave: true,
      autoLoad: true,
    });
  }

  /**
   * Clean text for consistent processing
   */
  private cleanText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove emojis, special characters
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }

  /**
   * Train the NLP model with static training data
   */
  async train(): Promise<void> {
    // Add static training data
    for (const { text, sentiment } of trainingData) {
      const cleanedText = this.cleanText(text);
      this.manager.addDocument("en", cleanedText, sentiment);
    }

    // Train the model
    await this.manager.train();

    // Save the trained model
    this.manager.save(this.modelPath);
    console.log(
      `Model trained with ${trainingData.length} utterances and saved`,
    );
  }

  /**
   * Load a pre-trained model if available
   */
  async loadModel(): Promise<boolean> {
    try {
      await this.manager.load(this.modelPath);
      console.log("Loaded pre-trained model");
      return true;
    } catch (err) {
      console.log("No pre-trained model found, training required");
      await this.train();
      return false;
    }
  }

  /**
   * Analyze sentiment for a given text
   * @param text - The input text to analyze
   * @returns A score between -1 (negative) and 1 (positive)
   */
  async analyzeSentiment(text: string): Promise<number> {
    const cleanedText = this.cleanText(text);
    const response = await this.manager.process("en", cleanedText);
    const sentiment = response.sentiment;

    let score: number;
    switch (sentiment.vote) {
      case "positive":
        score = sentiment.score;
        break;
      case "negative":
        score = -sentiment.score;
        break;
      case "neutral":
      default:
        score = 0;
        break;
    }

    return Number(score.toFixed(2));
  }
}
