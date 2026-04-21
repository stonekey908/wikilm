"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyChatRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/compose");
  }, [router]);
  return null;
}
