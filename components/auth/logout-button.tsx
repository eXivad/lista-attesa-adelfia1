"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { logoutAndRedirect } from "@/modules/auth/logout";

export function LogoutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await logoutAndRedirect(
          () => authClient.signOut(),
          (path) => window.location.replace(path),
        );
      }}
    >
      <LogOut className="size-4" aria-hidden="true" />
      Esci
    </Button>
  );
}
