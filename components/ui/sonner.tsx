"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toast]:border-success/50 group-[.toast]:bg-success/10 group-[.toast]:text-foreground [&_[data-icon]]:text-success",
          error:
            "group-[.toast]:border-destructive/50 group-[.toast]:bg-destructive/10 group-[.toast]:text-foreground [&_[data-icon]]:text-destructive",
          warning:
            "group-[.toast]:border-warning/50 group-[.toast]:bg-warning/10 group-[.toast]:text-foreground [&_[data-icon]]:text-warning",
          info: "group-[.toast]:border-primary/50 group-[.toast]:bg-primary/10 group-[.toast]:text-foreground [&_[data-icon]]:text-primary",
          default:
            "group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
