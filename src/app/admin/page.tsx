import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import AdminClient from "./AdminClient";

export const metadata = { title: "Administration · Compétencia IA" };

export default async function AdminPage() {
  if (!(await requireAdmin())) redirect("/");
  return <AdminClient />;
}
