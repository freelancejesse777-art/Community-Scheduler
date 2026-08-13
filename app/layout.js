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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <SignalStrip />
        <main>{children}</main>
        <footer className="footer">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </footer>
      </body>
    </html>
  );
}

// The signature element: a quiet traveling waveform under the nav,
// standing in for "one signal, tuned across many frequencies" — the
// core idea of the product. Pure CSS/SVG, no JS, respects
// prefers-reduced-motion via globals.css.
function SignalStrip() {
  return (
    <div className="signal-strip" aria-hidden="true">
      <svg viewBox="0 0 400 30" preserveAspectRatio="none">
        <path d="M0,15 L20,15 L26,6 L32,24 L38,15 L60,15 L66,10 L72,20 L78,15 L400,15" />
        <path
          className="peak"
          d="M150,15 L158,15 L163,4 L168,26 L173,15 L181,15"
        />
      </svg>
    </div>
  );
}
