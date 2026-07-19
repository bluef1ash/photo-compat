import React from "react";

type Variant = "primary" | "secondary" | "subtle" | "destructive";
type Size = "standard" | "large" | "compact";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base: React.CSSProperties = {
  borderRadius: "var(--radius-sm)",
  fontWeight: 600,
  fontSize: "var(--fs-body)",
  border: "1px solid transparent",
  padding: "0 16px",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-xs)",
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--accent)", color: "#fff", height: 40 },
  secondary: { background: "var(--surface)", color: "var(--accent)", borderColor: "var(--border-strong)", height: 40 },
  subtle: { background: "transparent", color: "var(--fg)", height: 40 },
  destructive: { background: "transparent", color: "var(--error)", borderColor: "var(--error)", height: 40 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "standard",
  style,
  children,
  ...rest
}) => (
  <button
    style={{ ...base, ...variantStyle[variant], ...(size === "large" ? { height: 48, padding: "0 24px" } : {}), ...style }}
    {...rest}
  >
    {children}
  </button>
);
