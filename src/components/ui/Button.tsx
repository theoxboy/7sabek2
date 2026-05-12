import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  asChild?: boolean;
};

const baseStyles =
  "relative inline-flex items-center justify-center rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ink)] text-[var(--bg)] shadow-[var(--shadow-soft)] hover:opacity-90",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
  ghost: "text-[var(--ink)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--error)] text-[var(--bg)] hover:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

function composeHandlers<E>(
  first?: (event: E) => void,
  second?: (event: E) => void
) {
  return (event: E) => {
    first?.(event);
    second?.(event);
  };
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    isLoading,
    disabled,
    children,
    asChild,
    onPointerMove,
    onPointerLeave,
    onClick,
    ...props
  },
  forwardedRef
) {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduceMotion(media.matches);
    listener();
    media.addEventListener?.("change", listener);
    return () => media.removeEventListener?.("change", listener);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (variant !== "primary" || reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 4;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 4;
    setOffset({ x, y });
  };

  const handlePointerLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const shineStyles =
    variant === "primary" || variant === "secondary"
      ? "overflow-hidden before:content-[''] before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.25),transparent)] before:transition before:duration-300 hover:before:translate-x-full motion-reduce:before:transition-none"
      : "";

  const sharedClassName = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    shineStyles,
    className
  );

  const sharedStyle =
    variant === "primary"
      ? { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }
      : undefined;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      style?: React.CSSProperties;
      onPointerMove?: (event: React.PointerEvent<HTMLElement>) => void;
      onPointerLeave?: (event: React.PointerEvent<HTMLElement>) => void;
      onClick?: (event: React.MouseEvent<HTMLElement>) => void;
      "aria-disabled"?: boolean;
      tabIndex?: number;
    }>;

    const isDisabled = Boolean(disabled || isLoading);

    return React.cloneElement(child, {
      ...props,
      className: cn(sharedClassName, child.props.className),
      style: { ...sharedStyle, ...child.props.style },
      "aria-disabled": isDisabled || child.props["aria-disabled"],
      tabIndex: isDisabled ? -1 : child.props.tabIndex,
      onPointerMove: composeHandlers(child.props.onPointerMove, (event) => {
        handlePointerMove(event);
        onPointerMove?.(event as unknown as React.PointerEvent<HTMLButtonElement>);
      }),
      onPointerLeave: composeHandlers(child.props.onPointerLeave, (event) => {
        handlePointerLeave();
        onPointerLeave?.(event as unknown as React.PointerEvent<HTMLButtonElement>);
      }),
      onClick: composeHandlers(child.props.onClick, (event) => {
        if (isDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
      }),
    });
  }

  return (
    <button
      ref={forwardedRef}
      className={sharedClassName}
      style={sharedStyle}
      disabled={disabled || isLoading}
      onPointerMove={(event) => {
        handlePointerMove(event);
        onPointerMove?.(event);
      }}
      onPointerLeave={(event) => {
        handlePointerLeave();
        onPointerLeave?.(event);
      }}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current/35 border-t-current" />
          Chargement...
        </span>
      ) : (
        children
      )}
    </button>
  );
});
