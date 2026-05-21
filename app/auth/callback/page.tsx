"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = "/dashboard";
      } else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            window.location.href = session ? "/dashboard" : "/";
          });
        }, 2000);
      }
    });
  }, []);

  return <p style={{textAlign:"center",marginTop:"40vh",fontFamily:"sans-serif"}}>Signing you in...</p>;
}
