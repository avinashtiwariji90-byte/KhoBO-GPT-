"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";

function LeadsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=business");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs">
      Redirecting to Admin Business Hub &amp; CRM...
    </div>
  );
}

export default function LeadsPage() {
  return (
    <RequireAuth>
      <LeadsRedirect />
    </RequireAuth>
  );
}
