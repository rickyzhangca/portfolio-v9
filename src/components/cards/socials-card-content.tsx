import { memo, type ReactNode, useState } from "react";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { tw } from "@/lib/utils";
import type { SocialsCardContent } from "@/types/canvas";

const Key = ({
  mode,
  children,
}: {
  mode: "logi" | "apple";
  children: ReactNode;
}) => {
  return (
    <div
      className={tw("relative", mode === "logi" ? "rounded-2xl" : "rounded-md")}
    >
      <div
        className={tw(
          "absolute flex size-18 -translate-y-2 items-center justify-center border-2 border-foreground1/80 transition duration-75 hover:-translate-y-1.5 active:translate-y-0",
          mode === "logi" ? "rounded-2xl" : "rounded-md"
        )}
        style={{
          background:
            mode === "logi"
              ? "linear-gradient(195deg, rgba(65.58, 66.47, 68.23, 0.50) 0%, rgba(26.62, 27.04, 27.88, 0.50) 100%), linear-gradient(225deg, #5A5B5D 0%, #393A3C 100%)"
              : "linear-gradient(180deg, #4D4E50 0%, #222325 40%)",
          boxShadow: "-3px 4px 6px rgba(0, 0, 0, 0.16)",
        }}
      >
        <div
          className={tw(
            "flex size-16 items-center justify-center rounded-full transition",
            mode === "apple" ? "opacity-0" : "opacity-100"
          )}
          style={{
            background:
              "radial-gradient(ellipse 104.51% 104.51% at 13.64% 87.50%, rgba(102, 103, 105, 0.50) 0%, rgba(0, 0, 0, 0.50) 100%), linear-gradient(225deg, #3A3B3D 0%, #666769 100%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
      <div
        className={tw(
          "z-20 size-18 bg-foreground1",
          mode === "logi" ? "rounded-2xl" : "rounded-md"
        )}
      />
    </div>
  );
};

interface SocialsCardContentProps {
  data: SocialsCardContent;
}

const SocialsCardContentComponent = ({ data }: SocialsCardContentProps) => {
  const [mode, setMode] = useState<"logi" | "apple">("logi");

  const toggleMode = () => {
    const newMode = mode === "logi" ? "apple" : "logi";
    setMode(newMode);
    track(AnalyticsEvents.SOCIALS_TOGGLE, { mode: newMode });
  };

  const handleLinkClick = (url: string, platform: "linkedin" | "twitter") => {
    track(AnalyticsEvents.SOCIAL_LINK_CLICK, { platform });
    setTimeout(() => {
      window.open(url, "_blank");
    }, 400);
  };

  return (
    <div className="relative flex h-full">
      <div
        className={tw(
          "absolute flex items-center justify-center gap-5 pt-1.5 pr-5 pb-2 pl-2 outline outline-foreground1/60",
          mode === "logi" ? "rounded-2xl" : "rounded-lg"
        )}
        style={{
          background:
            mode === "logi"
              ? "linear-gradient(180deg, #7A7B7D 0%, #3D3D40 100%), linear-gradient(207deg, #7A7B7D 0%, #3D3D40 100%)"
              : "linear-gradient(180deg, #5B5D5F 0%, #3D3D40 100%), linear-gradient(207deg, #7A7B7D 0%, #3D3D40 100%)",
          boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.32)",
        }}
      >
        <div className="flex gap-2">
          <button
            className="cursor-pointer focus:outline-none"
            onClick={() => handleLinkClick(data.linkedinUrl, "linkedin")}
            type="button"
          >
            <Key mode={mode}>
              <svg
                fill="none"
                height="24"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>LinkedIn</title>
                <path
                  d="M21.829 0H2.171A2.17 2.17 0 0 0 0 2.171v19.658C0 23.028.972 24 2.171 24h19.658A2.17 2.17 0 0 0 24 21.829V2.17A2.17 2.17 0 0 0 21.829 0M7.427 20.723a.63.63 0 0 1-.632.632h-2.69a.63.63 0 0 1-.631-.632V9.45a.63.63 0 0 1 .631-.631h2.69c.349 0 .632.282.632.631zM5.45 7.755a2.555 2.555 0 1 1 0-5.11 2.555 2.555 0 0 1 0 5.11m16.031 13.02c0 .32-.26.58-.58.58h-2.886a.58.58 0 0 1-.581-.58v-5.289c0-.789.23-3.457-2.062-3.457-1.779 0-2.14 1.826-2.212 2.646v6.1c0 .32-.26.58-.58.58H9.787a.58.58 0 0 1-.58-.58V9.398a.58.58 0 0 1 .58-.581h2.791a.58.58 0 0 1 .581.58v.984c.66-.99 1.64-1.754 3.727-1.754 4.62 0 4.594 4.318 4.594 6.69z"
                  fill="#e7e7e7"
                />
              </svg>
            </Key>
          </button>

          <button
            className="cursor-pointer focus:outline-none"
            onClick={() => handleLinkClick(data.twitterUrl, "twitter")}
            type="button"
          >
            <Key mode={mode}>
              <svg
                fill="none"
                height="20"
                viewBox="0 0 24 20"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Twitter</title>
                <path
                  d="M21.543 4.979c.015.217.015.434.015.653C21.558 12.305 16.605 20 7.548 20v-.004A13.7 13.7 0 0 1 0 17.732q.584.072 1.172.073a9.73 9.73 0 0 0 6.115-2.166c-2.107-.04-3.954-1.45-4.6-3.506a4.8 4.8 0 0 0 2.223-.087C2.613 11.57.96 9.5.96 7.096v-.064a4.8 4.8 0 0 0 2.235.632C1.032 6.18.365 3.229 1.671.92c2.5 3.155 6.189 5.073 10.148 5.276a5.14 5.14 0 0 1 1.425-4.825 4.843 4.843 0 0 1 6.966.22A9.7 9.7 0 0 0 23.337.364a5.05 5.05 0 0 1-2.165 2.793A9.6 9.6 0 0 0 24 2.363a10.2 10.2 0 0 1-2.457 2.616"
                  fill="#e7e7e7"
                />
              </svg>
            </Key>
          </button>
        </div>

        <div>
          <button
            className="flex h-12 cursor-pointer flex-col items-center justify-start rounded-full transition"
            onClick={toggleMode}
            style={{
              background: "linear-gradient(225deg, black 0%, #393A3C 100%)",
              outline: "1px rgba(0, 0, 0, 0.70) solid",
            }}
            type="button"
          >
            <div
              className={tw(
                "size-5 rounded-full transition",
                mode === "apple" ? "translate-y-7" : "translate-y-0"
              )}
              style={{
                background:
                  "linear-gradient(195deg, #C6CAD3 0%, rgba(26.62, 27.04, 27.88, 0.50) 100%), linear-gradient(225deg, #5A5B5D 0%, #393A3C 100%)",
                boxShadow: "-1px 1px 4px rgba(0, 0, 0, 0.36)",
              }}
            />
          </button>
        </div>
      </div>
      <div
        className={tw(
          "h-[96px] w-[220px] bg-foreground1",
          mode === "logi" ? "rounded-2xl" : "rounded-xl"
        )}
      />
    </div>
  );
};

export const SocialsCardContentView = memo(SocialsCardContentComponent);
