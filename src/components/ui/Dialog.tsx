import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm opacity-0 transition data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=open]:animate-[dialogOverlayIn_280ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[dialogOverlayOut_180ms_cubic-bezier(0.4,0,1,1)] motion-reduce:transition-none",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (typeof document !== "undefined") {
          const active = document.activeElement;
          if (active instanceof HTMLElement) active.blur();
        }
      }}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg [transform:translate(-50%,-50%)] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] focus:outline-none opacity-0 will-change-transform transition data-[state=open]:opacity-100 data-[state=open]:animate-[dialogPopupIn_360ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[dialogPopupOut_220ms_cubic-bezier(0.4,0,1,1)] motion-reduce:transition-none max-h-[85vh] overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-4 top-4 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]">
        <X className="h-4 w-4" />
      </DialogClose>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Global keyframes used by every Dialog instance in the app.
if (typeof document !== "undefined" && !document.getElementById("floussy-dialog-anim-style")) {
  const style = document.createElement("style");
  style.id = "floussy-dialog-anim-style";
  style.textContent = `
    @keyframes dialogOverlayIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(3px); }
    }
    @keyframes dialogOverlayOut {
      from { opacity: 1; backdrop-filter: blur(3px); }
      to { opacity: 0; backdrop-filter: blur(0px); }
    }
    @keyframes dialogPopupIn {
      0% { opacity: 0; transform: translate(-50%, calc(-50% + 24px)) scale(0.94); filter: blur(4px); }
      60% { opacity: 1; transform: translate(-50%, calc(-50% - 2px)) scale(1.01); filter: blur(0); }
      100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
    }
    @keyframes dialogPopupOut {
      from { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
      to { opacity: 0; transform: translate(-50%, calc(-50% + 18px)) scale(0.96); filter: blur(3px); }
    }
  `;
  document.head.appendChild(style);
}

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2", className)} {...props} />
);

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-[var(--ink)]", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[var(--muted)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
