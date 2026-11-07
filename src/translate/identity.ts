import type { TextTranslator } from './types';

/** Stage 1 provider: shows the selected text as is. */
export const identityTranslator: TextTranslator = {
  async translate(text) {
    return { kind: 'original', text };
  },
};
