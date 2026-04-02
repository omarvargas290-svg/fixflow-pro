import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function DataTableCard({ title, description, toolbar, children }: Props) {
  return (
    <section className="panel-card">
      <div className="panel-title-row">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {toolbar}
      </div>
      {children}
    </section>
  );
}
