"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type FieldValues,
  type UseFormProps,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodSchema } from "zod";

import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Label";

type FormProps = {
  children: React.ReactNode;
  className?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

export function Form({ children, className, onSubmit }: FormProps) {
  return (
    <form className={cn("space-y-4", className)} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

export { FormProvider };

export function useZodForm<T extends FieldValues>(
  schema: ZodSchema<T>,
  options?: UseFormProps<T>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    ...options,
  });
}

type FormFieldProps = {
  name: string;
  render: any;
};

export function FormField({ name, render }: FormFieldProps) {
  const { control } = useFormContext();
  return <Controller control={control} name={name} render={render as any} />;
}

type FormItemProps = React.HTMLAttributes<HTMLDivElement>;

export function FormItem({ className, ...props }: FormItemProps) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

type FormLabelProps = React.ComponentPropsWithoutRef<typeof Label>;

export function FormLabel(props: FormLabelProps) {
  return <Label {...props} />;
}

type FormControlProps = {
  children: React.ReactNode;
};

export function FormControl({ children }: FormControlProps) {
  return <Slot>{children}</Slot>;
}

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement> & {
  name: string;
};

export function FormMessage({ className, name, ...props }: FormMessageProps) {
  const { formState } = useFormContext();
  const error = formState.errors?.[name];
  if (!error) {
    return null;
  }
  return (
    <p className={cn("text-xs text-[var(--error)]", className)} {...props}>
      {String(error.message ?? "Invalid value")}
    </p>
  );
}
