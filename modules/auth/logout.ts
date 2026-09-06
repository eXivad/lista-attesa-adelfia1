export async function logoutAndRedirect(
  signOut: () => Promise<{ error: unknown | null }>,
  redirectTo: (path: string) => void,
) {
  const result = await signOut();
  if (result.error) return false;

  redirectTo("/login");
  return true;
}
