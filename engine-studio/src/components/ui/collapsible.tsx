"use client"

import * as React from "react"

interface CollapsibleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ open, children, className }, ref) => (
    <div ref={ref} className={className} data-state={open ? "open" : "closed"}>
      {children}
    </div>
  )
)
Collapsible.displayName = "Collapsible"

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>, {
        ...props,
        onClick,
      })
    }
    return (
      <button ref={ref} onClick={onClick} {...props}>
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
))
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
