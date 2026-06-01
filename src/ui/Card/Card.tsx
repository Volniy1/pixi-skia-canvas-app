import type { ReactNode } from "react";
import "./Card.css";

type CardProps = {
  title: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <article className="card">
      <header className="card__header">
        <h3 className="card__title">{title}</h3>
      </header>
      <div className="card__body">{children}</div>
    </article>
  );
}
