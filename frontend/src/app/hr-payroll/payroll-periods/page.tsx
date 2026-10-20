"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayrollPeriodsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr-payroll/payroll?tab=periods");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-xs text-slate-500 font-medium animate-pulse">
        Redirecting to Payroll Periods...
      </div>
    </div>
  );
}
