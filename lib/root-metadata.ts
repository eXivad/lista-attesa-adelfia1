import type { Metadata } from "next";

import { DEFAULT_GROUP_NAME } from "@/modules/branding/group-branding";

const DYNAMIC_FAVICON_URL = "/api/branding/favicon";

export function buildRootMetadata(groupName = DEFAULT_GROUP_NAME): Metadata {
  const applicationTitle = `${groupName} - Lista D'Attesa`;

  return {
    title: {
      default: applicationTitle,
      template: `%s - ${applicationTitle}`,
    },
    description: "Iscrizione e gestione della lista d’attesa del Gruppo scout.",
    icons: {
      icon: DYNAMIC_FAVICON_URL,
    },
  };
}
