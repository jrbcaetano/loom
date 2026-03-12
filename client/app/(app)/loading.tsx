export default function AppRouteLoading() {
  return (
    <div className="loom-module-page">
      <section className="loom-module-header">
        <div className="loom-module-header-copy">
          <div className="loom-loading-block loom-loading-title" />
          <div className="loom-loading-block loom-loading-subtitle" />
        </div>
      </section>

      <section className="loom-card p-5">
        <div className="loom-loading-stack">
          <div className="loom-loading-block loom-loading-line" />
          <div className="loom-loading-block loom-loading-line" />
          <div className="loom-loading-block loom-loading-line is-short" />
        </div>
      </section>
    </div>
  );
}
