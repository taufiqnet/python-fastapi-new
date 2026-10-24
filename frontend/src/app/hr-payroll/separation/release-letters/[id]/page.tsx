"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiClient } from "@/lib/api-client";
import { ReleaseLetter, BusinessProfile } from "@/types";
import { Printer, ArrowLeft, Loader2, AlertCircle, Award, CheckCircle2 } from "lucide-react";

export default function PrintableReleaseLetterPage() {
  const params = useParams();
  const router = useRouter();
  const letterId = params?.id as string;

  const [letter, setLetter] = useState<ReleaseLetter | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!letterId) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<ReleaseLetter>(`/separation/release-letters/${letterId}`);
        const lData = (res as any)?.data || res;
        setLetter(lData);

        if (lData.business_id) {
          try {
            const bRes = await apiClient.get<BusinessProfile>(`/businesses/${lData.business_id}`);
            setBusiness((bRes as any)?.data || bRes);
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load release letter.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [letterId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Preparing official Relieving Certificate...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !letter) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto my-12 p-6 bg-card border rounded-xl shadow-sm text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Release Letter Not Found</h2>
          <p className="text-muted-foreground text-sm">{error || "Unable to display release letter certificate."}</p>
          <button
            onClick={() => router.push("/hr-payroll/separation")}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Separation Desk
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const l = letter;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Navigation & Print Actions (Hidden when printing) */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/hr-payroll/separation"
            className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Offboarding
          </Link>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save Certificate
          </button>
        </div>

        {/* Certificate Container */}
        <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-xl p-8 sm:p-14 print:border-none print:shadow-none print:p-0 space-y-10 font-sans text-foreground relative">
          {/* Company Official Letterhead */}
          <div className="border-b-2 border-primary/30 pb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
                {business?.name_en || "ONODA ENTERPRISES LTD."}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {business?.address_en || "Corporate Headquarters, Dhaka, Bangladesh"}
              </p>
              <p className="text-xs text-muted-foreground">
                Phone: {business?.phone || "+880 2-9888888"} • Email: {business?.email || "hr@onoda.com.bd"}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase rounded bg-primary/10 text-primary">
                Relieving & Release Certificate
              </span>
              <p className="text-xs font-mono font-bold text-foreground">
                Ref: {l.letter_number}
              </p>
              <p className="text-xs text-muted-foreground">
                Date: {l.issue_date}
              </p>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-1 pt-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-foreground uppercase border-b-2 border-primary/40 inline-block pb-1">
              RELIEVING ORDER & RELEASE LETTER
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest pt-1">
              TO WHOM IT MAY CONCERN
            </p>
          </div>

          {/* Salutation & Recipient Summary */}
          <div className="bg-muted/20 border p-4 rounded-xl text-xs space-y-1.5 leading-relaxed">
            <p>
              This is to formally certify that <span className="font-bold text-foreground">{l.employee?.first_name} {l.employee?.last_name || ""}</span> (Employee ID: <span className="font-mono font-bold">{l.employee?.employee_id}</span>) was in regular employment with <span className="font-bold">{business?.name_en || "our organization"}</span>, serving in the capacity of <span className="font-bold">{l.designation}</span> in the <span className="font-bold">{l.department || "Operations"}</span> department.
            </p>
          </div>

          {/* Official Body Content */}
          <div className="text-sm leading-relaxed text-foreground space-y-4 text-justify">
            <p className="indent-8 whitespace-pre-line">{l.letter_content}</p>

            <p>
              Management further certifies that during their tenure of employment, their conduct was found to be satisfactory. The employee has been formally released from the service of the organization with effect from the close of business hours on <span className="font-bold">{l.effective_exit_date}</span>.
            </p>

            <p>
              We thank them for their contributions and wish them every success in all future professional and personal endeavors.
            </p>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-20 grid grid-cols-2 gap-12 text-xs">
            <div className="space-y-1 text-left">
              <div className="w-44 border-b border-foreground/40 mb-2" />
              <p className="font-bold text-foreground text-sm">Authorized Signatory</p>
              <p className="text-muted-foreground">Head of Human Resources & Administration</p>
              <p className="text-muted-foreground font-medium">{business?.name_en || "Onoda Enterprises Ltd."}</p>
            </div>

            <div className="text-right flex flex-col items-end justify-end">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground text-center uppercase tracking-wider">
                Official Company Seal
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
