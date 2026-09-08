import { describe, expect, it } from "vitest";

import { buildRootMetadata } from "./root-metadata";

describe("root metadata", () => {
  it("include il nome dinamico del gruppo nel titolo", () => {
    const metadata = buildRootMetadata("AGESCI Adelfia 1");

    expect(metadata.title).toEqual({
      default: "AGESCI Adelfia 1 - Lista D'Attesa",
      template: "%s - AGESCI Adelfia 1 - Lista D'Attesa",
    });
  });

  it("usa l'endpoint dinamico del branding come favicon", () => {
    const metadata = buildRootMetadata();

    expect(metadata.icons).toEqual({
      icon: "/api/branding/favicon",
    });
  });
});
