"use client";

import * as React from "react";
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          // Variants - clean material design
          variant === "primary" && "bg-foreground text-background hover:opacity-90 focus:ring-foreground",
          variant === "secondary" && "bg-muted text-muted-foreground hover:bg-muted/80", 
          variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-foreground",
          variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
          // Sizes
          size === "default" && "h-11 px-6 py-2",
          size === "sm" && "h-9 rounded-md px-3",
          size === "lg" && "h-12 rounded-lg px-8",
          size === "icon" && "h-11 w-11",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
