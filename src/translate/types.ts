export type TranslationResult =
  | { kind: 'original'; text: string }
  | { kind: 'translated'; text: string; sourceLanguage: string }
  | { kind: 'same-language'; text: string }
  | { kind: 'unsupported'; text: string; reason: string };

export interface TextTranslator {
  /**
   * Called right after the user selects text, while the page still has user activation.
   * Downloading a language model requires activation, which a mouse hover doesn't give.
   */
  prepare?(text: string): void;
  translate(text: string, onProgress?: (fraction: number) => void): Promise<TranslationResult>;
}
