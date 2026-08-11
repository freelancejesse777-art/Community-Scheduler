import "./globals.css";
import Nav from "./Nav";

export const metadata = {
  title: "Community Scheduler",
  description: "Schedule and adapt posts across niche communities",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="footer">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </footer>
      </body>
    </html>
  );
}
