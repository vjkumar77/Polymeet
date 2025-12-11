// app/room/[id]/page.jsx
"use client";

import { use } from "react";
import RoomClient from "./RoomClient";

export default function RoomPage({ params }) {
  // ⭐ Next.js 15: params is a Promise, must use `use()` hook
  const { id } = use(params);
  
  // ⭐ Don't render until roomId is available
  if (!id) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e0e10",
        color: "white"
      }}>
        <p>Loading room...</p>
      </div>
    );
  }

  return <RoomClient roomId={id} />;
}