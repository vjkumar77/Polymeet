// @ts-nocheck
import "./globals.css";

export const metadata = {
  title: "PolyMeet",
  description: "Real-time Meeting App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
