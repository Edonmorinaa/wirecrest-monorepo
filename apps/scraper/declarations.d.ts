declare module '@nlpjs/sentiment' {
    export class SentimentAnalyzer {
      constructor(settings?: any);
      getSentiment(text: string): Promise<{
        score: number;
        numWords: number;
        numHits: number;
        average: number;
        type: string;
        locale: string;
        vote: 'positive' | 'neutral' | 'negative';
      }>;
    }
  }