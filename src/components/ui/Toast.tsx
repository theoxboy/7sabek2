"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastActionElement = React.ReactElement<typeof ToastAction>;
type ToastVariant = "default" | "success" | "danger";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-[100] flex w-[92vw] max-w-sm flex-col gap-2 outline-none",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      "toast-root group pointer-events-auto flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] motion-reduce:transition-none",
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-[var(--ink)]", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-[var(--muted)]", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "rounded-full p-1 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)]",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastState = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toasts: ToastState[];
  toast: (toast: Omit<ToastState, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function toastId() {
  return Math.random().toString(36).slice(2, 9);
}

export function ToastProviderRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const toast = React.useCallback((toastProps: Omit<ToastState, "id">) => {
    const id = toastId();
    setToasts((prev) => [...prev, { ...toastProps, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      <ToastProvider swipeDirection="right">
        {children}
        <ToastViewport />
        {toasts.map((toastItem) => (
          <Toast
            key={toastItem.id}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) dismiss(toastItem.id);
            }}
            className={cn(
              toastItem.variant === "success" &&
                "border-emerald-200 bg-emerald-50",
              toastItem.variant === "danger" && "border-red-200 bg-red-50"
            )}
          >
            <div className="grid gap-1">
              {toastItem.title ? (
                <ToastTitle
                  className={cn(
                    toastItem.variant === "success" && "text-emerald-900",
                    toastItem.variant === "danger" && "text-red-900"
                  )}
                >
                  {toastItem.title}
                </ToastTitle>
              ) : null}
              {toastItem.description ? (
                <ToastDescription
                  className={cn(
                    toastItem.variant === "success" && "text-emerald-800",
                    toastItem.variant === "danger" && "text-red-800"
                  )}
                >
                  {toastItem.description}
                </ToastDescription>
              ) : null}
            </div>
            {toastItem.action}
            <ToastClose />
          </Toast>
        ))}
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProviderRoot");
  }
  return context;
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
