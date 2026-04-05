import { describe, expect, it } from "vitest";
import { funProjects } from "./fun-projects";

describe("funProjects", () => {
  it("uses the updated Spellbook Pages URL", () => {
    const spellbookProject = funProjects.find(
      (project) => project.title === "Spellbook"
    );

    expect(spellbookProject?.description).toContain(
      "https://spellbook-space.pages.dev/"
    );
    expect(spellbookProject?.description).not.toContain("https://spellbook.space");
  });
});
