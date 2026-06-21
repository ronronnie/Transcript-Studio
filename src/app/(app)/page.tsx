import { Workspace } from "@/components/workspace";
import { getSession } from "@/lib/auth/server";

export default async function Home() {
  const session = await getSession();
  return <Workspace username={session?.username ?? "user"} />;
}
