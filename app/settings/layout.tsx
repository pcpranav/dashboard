import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/dashboard/Header";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 md:px-6">
      <Header email={session.user.email} />
      <div className="flex flex-col gap-6 py-6 md:py-8">{children}</div>
    </main>
  );
}
