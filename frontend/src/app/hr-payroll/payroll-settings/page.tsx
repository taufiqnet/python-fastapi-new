"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayrollSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr-payroll/payroll?tab=settings");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-xs text-slate-500 font-medium animate-pulse">
        Redirecting to Payroll Settings...
      </div>
    </div>
  );
}
