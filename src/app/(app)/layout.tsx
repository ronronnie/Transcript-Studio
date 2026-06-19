import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth/server";

/**
 * Authenticated app shell. The proxy guarantees a valid session for routes in
 * this group, so we can safely read it here to show the signed-in user.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <div className="flex h-dvh w-full">
      <Sidebar username={session?.username ?? "user"} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
