"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border bg-clip-padding font-mono text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      // Flat fills per CLAUDE.md §11 — zero gradients, zero drop shadows.
      // The inset-line on the button bottom is a hairline border-substitute,
      // permitted. No vertical colour transitions.
      variant: {
        default:
          "border-[rgba(243,197,103,0.4)] bg-[rgb(143,50,48)] text-[var(--dq-ink)] hover:bg-[rgb(163,60,56)] [a]:hover:brightness-105",
        outline:
          "border-[rgba(243,197,103,0.3)] bg-[rgb(12,22,55)] text-[var(--dq-ink)] hover:bg-[rgb(18,32,76)] aria-expanded:bg-[rgb(18,32,76)]",
        secondary:
          "border-[rgba(134,209,255,0.3)] bg-[rgb(19,44,96)] text-[var(--dq-ink)] hover:bg-[rgb(26,55,112)] aria-expanded:bg-[rgb(26,55,112)]",
        ghost:
          "border-transparent bg-transparent text-[var(--dq-muted-ink)] hover:border-[rgba(243,197,103,0.2)] hover:bg-[rgba(17,35,83,0.35)] hover:text-[var(--dq-ink)] aria-expanded:bg-[rgba(17,35,83,0.35)] aria-expanded:text-[var(--dq-ink)]",
        destructive:
          "border-[rgba(212,94,78,0.45)] bg-[rgb(128,35,32)] text-[#fff2e8] hover:bg-[rgb(148,40,36)] focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        link: "border-none bg-transparent px-0 text-[var(--dq-gold)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
