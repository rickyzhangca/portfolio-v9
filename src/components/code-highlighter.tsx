import { memo, use } from "react";
import {
  createHighlighterCore,
  createJavaScriptRegexEngine,
  type HighlighterOptions,
  ShikiHighlighter,
} from "react-shiki/core";

type Highlighter = NonNullable<HighlighterOptions["highlighter"]>;

interface CodeHighlighterProps {
  code: string;
  language?: string;
}

// The full Shiki bundle ships every grammar and a WebAssembly regex engine.
// Load only the grammars a snippet asks for, with the pure-JS engine.
const GRAMMARS = {
  bash: () => import("@shikijs/langs/shellscript"),
  javascript: () => import("@shikijs/langs/javascript"),
  js: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsx: () => import("@shikijs/langs/jsx"),
  sh: () => import("@shikijs/langs/shellscript"),
  shell: () => import("@shikijs/langs/shellscript"),
  ts: () => import("@shikijs/langs/typescript"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
} as const;

type GrammarName = keyof typeof GRAMMARS;

const isGrammarName = (language: string): language is GrammarName =>
  Object.hasOwn(GRAMMARS, language);

let highlighterPromise: Promise<Highlighter> | null = null;
const grammarPromises = new Map<string, Promise<Highlighter>>();

const getHighlighter = () => {
  highlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [],
    themes: [import("@shikijs/themes/github-dark")],
  });
  return highlighterPromise;
};

/** Resolves once the language is usable; unknown ones render as plaintext. */
const loadGrammar = (language: string) => {
  let promise = grammarPromises.get(language);
  if (!promise) {
    promise = getHighlighter().then(async (highlighter) => {
      if (isGrammarName(language)) {
        await highlighter.loadLanguage(GRAMMARS[language]());
      }
      return highlighter;
    });
    grammarPromises.set(language, promise);
  }
  return promise;
};

export const CodeHighlighter = memo(
  ({ code, language = "text" }: CodeHighlighterProps) => {
    const highlighter = use(loadGrammar(language));
    return (
      <div className="my-4 overflow-x-auto rounded-lg text-sm outline outline-border">
        <ShikiHighlighter
          highlighter={highlighter}
          language={language}
          theme="github-dark"
        >
          {code}
        </ShikiHighlighter>
      </div>
    );
  }
);
