import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-[#1d1d1f] bg-[#1d1d1f] text-white hover:bg-[#2a2a2c]",
                secondary:
                    "border-[#d2d2d7] bg-[#f5f5f7] text-[#3a3a3c] hover:bg-[#ececf0]",
                destructive:
                    "border-[#b42318] bg-[#b42318] text-white hover:bg-[#9f1f16]",
                outline: "border-[#d2d2d7] bg-white text-[#3a3a3c]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
