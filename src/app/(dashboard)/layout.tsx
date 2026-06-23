import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#F3F3F3]">
      <Sidebar />
      <main className="relative min-h-screen min-w-0 flex-1 overflow-auto pt-[116px] lg:ml-[220px] lg:pt-0">
        <div className="pointer-events-none fixed inset-y-0 right-0 left-0 overflow-hidden lg:left-[220px]">
          <div className="absolute -top-40 right-[-8rem] h-96 w-96 rounded-full bg-[#D9D7D2]/55 blur-3xl" />
          <div className="absolute top-1/3 left-16 h-72 w-72 rounded-full bg-[#697555]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
