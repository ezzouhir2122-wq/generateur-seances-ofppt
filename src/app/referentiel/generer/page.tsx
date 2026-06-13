import { auth } from "@/auth";
import { redirect } from "next/navigation";
import GenererClient from "./GenererClient";

export const dynamic = "force-dynamic";

export default async function GenererPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <GenererClient />;
}
