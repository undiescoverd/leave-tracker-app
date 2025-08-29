// import { type ClassValue, clsx } from "clsx"
// import { twMerge } from "tailwind-merge"

// Status mapping for leave requests
export const statusConfig = {
  APPROVED: {
    variant: "success",
    label: "Approved",
    className: "bg-success text-success-foreground",
  },
  PENDING: {
    variant: "warning",
    label: "Pending",
    className: "bg-warning text-warning-foreground",
  },
  REJECTED: {
    variant: "error",
    label: "Rejected",
    className: "bg-error text-error-foreground",
  },
} as const

export function getStatusVariant(status: string) {
  return statusConfig[status as keyof typeof statusConfig]?.variant || "default"
}

export function getStatusClassName(status: string) {
  return statusConfig[status as keyof typeof statusConfig]?.className || ""
}

// Button variants with smart colors
export const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  success: "bg-success text-success-foreground hover:bg-success/90",
  warning: "bg-warning text-warning-foreground hover:bg-warning/90",
  error: "bg-error text-error-foreground hover:bg-error/90",
  info: "bg-info text-info-foreground hover:bg-info/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}

// Alert variants with smart colors
export const alertVariants = {
  default: "bg-background text-foreground",
  destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
  success: "border-success/50 text-success dark:border-success [&>svg]:text-success",
  warning: "border-warning/50 text-warning dark:border-warning [&>svg]:text-warning",
  info: "border-info/50 text-info dark:border-info [&>svg]:text-info",
}

// Badge variants with smart colors
export const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  success: "border-transparent bg-success text-success-foreground",
  warning: "border-transparent bg-warning text-warning-foreground",
  error: "border-transparent bg-error text-error-foreground",
  info: "border-transparent bg-info text-info-foreground",
  outline: "text-foreground",
}