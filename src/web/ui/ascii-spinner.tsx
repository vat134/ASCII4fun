export function AsciiSpinner() {
  return (
    <span
      aria-hidden="true"
      className="ascii-spinner inline-grid size-5 place-items-center font-mono"
    >
      {["|", "/", "-", "\\"].map((frame, index) => (
        <span
          key={frame}
          className="col-start-1 row-start-1"
          style={{ animationDelay: `${index * 120}ms` }}
        >
          {frame}
        </span>
      ))}
    </span>
  );
}
