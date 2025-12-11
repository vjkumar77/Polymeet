"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const [room, setRoom] = useState("");

  function handleCreate() {
    const id = uuidv4();
    router.push(`/room/${id}`);
  }

  function handleJoin() {
    if (!room.trim()) {
      alert("Enter room ID");
      return;
    }
    router.push(`/room/${room}`);
  }

  return (
    <main className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">PolyMeet</h1>

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleCreate}
      >
        Create Room
      </button>

      <div className="flex gap-2">
        <input
          className="border px-3 py-2 rounded"
          placeholder="Enter Room ID"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={handleJoin}
        >
          Join
        </button>
      </div>
    </main>
  );
}
