# PolyMeet – Real-Time Video Meeting Application

PolyMeet is a modern video conferencing application built with WebRTC, Socket.io, and Next.js.  
It enables fast, secure, peer-to-peer video communication with host controls, a waiting room system, and a simple, professional user interface.

Live Demo:  
https://polymeet-three.vercel.app

---

## Features

### Real-Time Video Calling
High-quality audio/video using WebRTC peer connections.

### End-to-End Encrypted Media
Media streams flow directly between participants and never through the server.

### Host Controls
- Automatic host assignment
- Admit or reject participants
- Waiting room for join requests

### Participants Panel
Real-time display of all connected users.

### Device Controls
Toggle microphone and camera at any time.

### Meeting Sharing
One-click meeting link sharing without sign-up.

### Reliable Signaling
WebSocket-only signaling using Socket.io for low latency.

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React
- Custom CSS
- WebRTC API
- Deployed on Vercel

### Backend
- Node.js
- Express.js
- Socket.io
- Deployed on Render

### Real-Time Communication
- WebRTC PeerConnection
- SDP Offer/Answer model
- ICE candidates using Google STUN servers
- Multi-peer mesh architecture



---

## How It Works

### 1. Start a Meeting
A unique meeting ID is generated.  
The first user becomes the host automatically.

### 2. Join a Meeting
Participants enter an ID and enter a waiting room.  
The host can admit or reject them.

### 3. WebRTC Connection Flow
Once admitted:
- Peer connections are created
- SDPs (offers/answers) are exchanged
- ICE candidates are transferred
- Remote video/audio streams appear in the UI

### 4. Socket.io Signaling Events
- join-request  
- you-are-host  
- pending-requests  
- admitted  
- user-joined  
- offer  
- answer  
- ice-candidate  
- user-left  

---

## Local Setup

### Clone the Repository
```bash
git clone https://github.com/<your-username>/polymeet.git
cd polymeet
Install Frontend Dependencies
npm install
npm run dev

Runs on:
http://localhost:3000
Start Backend (Signaling Server)
cd backend
npm install
node index.js


Runs on:
http://localhost:5000

Deployment
Frontend (Vercel)

Connect the GitHub repo

Deploy directly (Next.js auto-configured)

Backend (Render)

Deploy as a Web Service

Set Node environment

Update CORS to allow:

http://localhost:3000

https://polymeet-three.vercel.app

Client socket example:

io("https://your-backend-url.onrender.com", {
  transports: ["websocket"],
  upgrade: false
});

Testing

Open two browser tabs/windows

Start a meeting in one tab (becomes host)

Join the same meeting ID from another tab

Host admits participant

WebRTC connection is established

Test mic/camera and leaving the call

Future Improvements

Screen sharing

In-meeting text chat

Push-to-talk

SFU architecture for large meetings

Client-side recording

Noise cancellation

Bandwidth optimization

Author

Vijay Kumar
Web Developer – MERN | WebRTC | Real-Time Systems
LinkedIn: <your-linkedin-url>

Contribution

Contributions and suggestions are welcome.


---

If you want, I can also:

✔ Write GitHub project description  
✔ Write LinkedIn post (very professional)  
✔ Write resume bullet points  
✔ Write portfolio description  

Just say:

**“Write LinkedIn post for PolyMeet”** or **“Write resume points for PolyMeet”**
