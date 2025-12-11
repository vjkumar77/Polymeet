"use client";
import "./styles/home.css";

import RoomClient from "./RoomClient";
import { use } from "react";

export default function RoomPage({ params }) {
  const resolved = use(params); // unwrap Promise
  return <RoomClient roomId={resolved.id} />;
}
