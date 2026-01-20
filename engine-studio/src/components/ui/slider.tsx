"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean
  formatValue?: (value: number) => string
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue, formatValue, ...props }, ref) => {
  const value = props.value || props.defaultValue || [0]

  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
      {showValue && value.length > 0 && value[0] !== undefined && (
        <div className="mt-1 text-center text-sm text-muted-foreground">
          {formatValue ? formatValue(value[0]) : value[0].toFixed(2)}
        </div>
      )}
    </div>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
