import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/roboto/wght.css";
import "@fontsource-variable/roboto-slab/wght.css";
import "./globals.css";
import Script from "next/script";

import { buildRootMetadata } from "@/lib/root-metadata";
import { getGroupBrandingSettings } from "@/lib/server/group-branding";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { groupName } = await getGroupBrandingSettings();
    return buildRootMetadata(groupName);
  } catch {
    return buildRootMetadata();
  }
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script
          id="chrome-ios-hydration-fix"
          strategy="beforeInteractive"
        >
          {`
            (() => {
              // Applica il workaround solo a Chrome su iOS
              const isChromeIOS = /CriOS/i.test(navigator.userAgent);

              if (!isChromeIOS) return;

              const attributes = [
                "__gcruniqueid",
                "__gcrremoteframetoken"
              ];

              const cleanElement = (element) => {
                if (!(element instanceof Element)) return;

                for (const attribute of attributes) {
                  if (element.hasAttribute(attribute)) {
                    element.removeAttribute(attribute);
                  }
                }

                element
                  .querySelectorAll(
                    "[__gcruniqueid], [__gcrremoteframetoken]"
                  )
                  .forEach((child) => {
                    for (const attribute of attributes) {
                      child.removeAttribute(attribute);
                    }
                  });
              };

              cleanElement(document.documentElement);

              const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                  if (mutation.type === "attributes") {
                    cleanElement(mutation.target);
                  }

                  for (const node of mutation.addedNodes) {
                    cleanElement(node);
                  }
                }
              });

              observer.observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: attributes,
              });

              // Serve solo durante il bootstrap/hydration.
              window.addEventListener("load", () => {
                setTimeout(() => observer.disconnect(), 3000);
              });
            })();
          `}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
