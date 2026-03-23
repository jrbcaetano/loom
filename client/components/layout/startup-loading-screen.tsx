import Image from "next/image";

const loadingMessages = [
  "Warming up your tasks...",
  "Checking what made it onto the shopping list...",
  "Peeking at this week's meals..."
];

export function StartupLoadingScreen() {
  return (
    <div className="loom-startup-loading" role="status" aria-live="polite" aria-label="Loading Loom">
      <div className="loom-startup-loading-card">
        <div className="loom-startup-loading-brand">
          <div className="loom-startup-loading-logo-wrap">
            <Image src="/brand/loom-symbol.png" alt="" width={72} height={72} className="loom-startup-loading-logo" priority />
          </div>
          <p className="loom-startup-loading-eyebrow">Loom is waking up the house</p>
          <h1 className="loom-startup-loading-title">One tiny moment while everything gets cozy.</h1>
        </div>

        <div className="loom-startup-loading-progress" aria-hidden>
          <span className="loom-startup-loading-progress-bar" />
        </div>

        <div className="loom-startup-loading-messages">
          {loadingMessages.map((message, index) => (
            <p
              key={message}
              className="loom-startup-loading-message"
              style={{ animationDelay: `${index * 0.35}s` }}
            >
              {message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
