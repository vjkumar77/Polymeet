"use client";
import "../../styles/home.css";  // ✅ CORRECT

import RoomClient from "@/app/room/[id]/RoomClient";

export default function RoomPage({ params }) {
  return <RoomClient roomId={params.id} />;
}
