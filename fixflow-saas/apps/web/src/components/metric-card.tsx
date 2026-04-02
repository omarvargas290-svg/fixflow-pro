type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
};

export function MetricCard({ label, value, hint, icon }: Props) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        {icon ? <span className="metric-icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </article>
  );
}
