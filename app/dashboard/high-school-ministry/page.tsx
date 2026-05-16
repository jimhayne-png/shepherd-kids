"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HighSchoolMinistryPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/ministry/high-school"); }, [router]);
  return null;
}
