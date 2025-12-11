"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";
import "./styles/home.css";

export default function HomePage() {
  const router = useRouter();
  const [joinId, setJoinId] = useState("");

  const startMeeting = () => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 10);

    router.push(`/room/${id}`);
  };

  const joinMeeting = () => {
    if (!joinId.trim()) return alert("Enter meeting ID");
    router.push(`/room/${joinId.trim()}`);
  };

  return (
    <div className="home-root">
      <Hero
        startMeeting={startMeeting}
        joinMeeting={joinMeeting}
        joinId={joinId}
        setJoinId={setJoinId}
      />

      <Features />
      <Steps />
      <Footer />
    </div>
  );
}
