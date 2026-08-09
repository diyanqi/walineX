export interface ModerationInput {
  content: string;
  nick: string;
  mail?: string | null;
  link?: string | null;
  url: string;
  ip: string;
}

export interface ModerationResult {
  blocked: boolean;
  spam: boolean;
  review: boolean;
  reason?: string;
  score?: number;
  rendered?: string;
}

export interface AIClassifierResult {
  spam: boolean;
  toxic: boolean;
  score: number;
  reason?: string;
}

export interface AIClassifier {
  classify(input: ModerationInput): Promise<AIClassifierResult | null>;
}
