import type { TextTranslator, TranslationResult } from './types';

// Minimal typings for Chrome's built-in AI APIs (Chrome 138+).
// https://developer.chrome.com/docs/ai/translator-api
// https://developer.chrome.com/docs/ai/language-detection
type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
type Monitor = (m: EventTarget) => void;

interface ChromeTranslator {
  translate(input: string): Promise<string>;
}
interface TranslatorStatic {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(o: { sourceLanguage: string; targetLanguage: string; monitor?: Monitor }): Promise<ChromeTranslator>;
}
interface ChromeLanguageDetector {
  detect(input: string): Promise<{ detectedLanguage: string; confidence: number }[]>;
}
interface LanguageDetectorStatic {
  create(o?: { monitor?: Monitor }): Promise<ChromeLanguageDetector>;
}

const api = self as unknown as {
  Translator?: TranslatorStatic;
  LanguageDetector?: LanguageDetectorStatic;
};

const MAX_LENGTH = 5000;

export function createChromeTranslator(targetLanguage: string): TextTranslator {
  const translators = new Map<string, Promise<ChromeTranslator>>();
  const cache = new Map<string, TranslationResult>();
  let detector: Promise<ChromeLanguageDetector> | null = null;
  // Download progress goes to whichever translate() call is currently waiting.
  let progressSink: ((fraction: number) => void) | undefined;

  const monitor: Monitor = (m) => {
    m.addEventListener('downloadprogress', (e) => progressSink?.((e as ProgressEvent).loaded));
  };

  function isSupported(): boolean {
    return Boolean(api.Translator && api.LanguageDetector);
  }

  function getDetector(): Promise<ChromeLanguageDetector> {
    if (!detector) {
      detector = api.LanguageDetector!.create({ monitor });
      detector.catch(() => (detector = null));
    }
    return detector;
  }

  async function detectLanguage(text: string): Promise<string> {
    const [top] = await (await getDetector()).detect(text);
    return top?.detectedLanguage ?? 'und';
  }

  function getTranslator(sourceLanguage: string): Promise<ChromeTranslator> {
    let translator = translators.get(sourceLanguage);
    if (!translator) {
      translator = api.Translator!.create({ sourceLanguage, targetLanguage, monitor });
      translator.catch(() => translators.delete(sourceLanguage));
      translators.set(sourceLanguage, translator);
    }
    return translator;
  }

  function isTarget(lang: string): boolean {
    return lang === targetLanguage || lang.startsWith(`${targetLanguage}-`);
  }

  return {
    prepare(text) {
      if (!isSupported()) return;
      detectLanguage(text.slice(0, MAX_LENGTH))
        .then((lang) => {
          if (lang !== 'und' && !isTarget(lang)) return getTranslator(lang);
        })
        .catch(() => {
          // Errors are reported on hover, in translate().
        });
    },

    async translate(fullText, onProgress) {
      const text = fullText.slice(0, MAX_LENGTH);
      const cached = cache.get(text);
      if (cached) return cached;

      if (!isSupported()) {
        return {
          kind: 'unsupported',
          text,
          reason: 'Встроенный переводчик недоступен в этом браузере (нужен Chrome 138+).',
        };
      }

      progressSink = onProgress;
      try {
        const sourceLanguage = await detectLanguage(text);
        if (sourceLanguage === 'und') {
          return { kind: 'unsupported', text, reason: 'Не удалось определить язык текста.' };
        }
        if (isTarget(sourceLanguage)) {
          return { kind: 'same-language', text };
        }

        const availability = await api.Translator!.availability({ sourceLanguage, targetLanguage });
        if (availability === 'unavailable') {
          return {
            kind: 'unsupported',
            text,
            reason: `Перевод ${sourceLanguage} → ${targetLanguage} не поддерживается.`,
          };
        }

        const translator = await getTranslator(sourceLanguage);
        const result: TranslationResult = {
          kind: 'translated',
          text: await translator.translate(text),
          sourceLanguage,
        };
        cache.set(text, result);
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          return {
            kind: 'unsupported',
            text,
            reason: 'Нужно скачать языковую модель — выделите текст ещё раз.',
          };
        }
        throw err;
      } finally {
        if (progressSink === onProgress) progressSink = undefined;
      }
    },
  };
}
