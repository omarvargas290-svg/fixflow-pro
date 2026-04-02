type Props = {
  title: string;
  description: string;
  bullets: string[];
  icon?: string;
};

export function ModuleCard({ title, description, bullets, icon }: Props) {
  return (
    <article className="panel-card module-card">
      <div className="panel-title-row">
        <div className="module-title">
          {icon ? <span className="module-icon">{icon}</span> : null}
          <h3>{title}</h3>
        </div>
      </div>
      <p>{description}</p>
      <ul className="compact-list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </article>
  );
}
