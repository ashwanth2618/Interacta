import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import { ToastProvider } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <ToastProvider>
      <AppShell user={session}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
