"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MiddleSchoolMinistryPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/ministry/middle-school"); }, [router]);
  return null;
}
