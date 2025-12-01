import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-3 w-3 shrink-0 rounded-full border border-orange-500/40 bg-black/60 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-400 data-[state=checked]:shadow-[0_0_4px_rgba(249,115,22,0.3)] transition-all duration-200",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-black")}
    >
      <Check className="h-2.5 w-2.5 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
