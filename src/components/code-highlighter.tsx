import ShikiHighlighter from "react-shiki";

interface CodeHighlighterProps {
  code: string;
  language?: string;
}

export const CodeHighlighter = ({
  code,
  language = "text",
}: CodeHighlighterProps) => {
  return (
    <div className="my-4 overflow-x-auto rounded-lg text-sm outline outline-border">
      <ShikiHighlighter
        language={language}
        theme={{
          light: "github-dark",
          dark: "github-dark",
        }}
      >
        {code}
      </ShikiHighlighter>
    </div>
  );
};
