"use client";

import RoomClient from "./RoomClient";

export default function RoomPage({ params }) {
  return <RoomClient roomId={params.id} />;
}
