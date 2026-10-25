import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "../../lib/utils"

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "secondary"; size?: "default" | "sm" | "icon" }>(function Button({ className, variant = "default", size = "default", ...props }, ref) {
  return <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-brand text-white hover:bg-[#4d4dc3]", variant === "outline" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50", variant === "ghost" && "text-slate-500 hover:bg-slate-100 hover:text-slate-900", variant === "secondary" && "bg-indigo-50 text-brand hover:bg-indigo-100", size === "default" && "h-10 px-4 text-sm", size === "sm" && "h-9 px-3 text-xs", size === "icon" && "size-10", className)} {...props} />
})
Button.displayName = "Button"

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10", className)} {...props} />
}

export function Badge({ children, className, variant = "secondary" }: { children: React.ReactNode; className?: string; variant?: "secondary" | "outline" | "success" }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold", variant === "secondary" && "bg-slate-100 text-slate-600", variant === "outline" && "border border-slate-200 bg-white text-slate-500", variant === "success" && "bg-emerald-50 text-emerald-700", className)}>{children}</span>
}

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (value: string) => void; children: React.ReactNode }) {
  return <SelectPrimitive.Root value={value} onValueChange={onValueChange}>{children}</SelectPrimitive.Root>
}
export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(function SelectTrigger({ className, children, ...props }, ref) {
  return <SelectPrimitive.Trigger ref={ref} className={cn("flex h-11 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10", className)} {...props}>{children}<SelectPrimitive.Icon><ChevronDown className="size-4 text-slate-400" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>
})
export const SelectValue = SelectPrimitive.Value
export const SelectContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(function SelectContent({ className, children, ...props }, ref) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-soft", className)} {...props}>{children}</SelectPrimitive.Content></SelectPrimitive.Portal>
})
export const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(function SelectItem({ className, children, ...props }, ref) {
  return <SelectPrimitive.Item ref={ref} className={cn("relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-brand", className)} {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className="absolute right-2"><Check className="size-4" /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>
})

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close
export const DialogOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(function DialogOverlay({ className, ...props }, ref) { return <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm data-[state=open]:animate-in", className)} {...props} /> })
export const DialogContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(function DialogContent({ className, children, ...props }, ref) { return <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none", className)} {...props}>{children}<DialogClose className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></DialogClose></DialogPrimitive.Content></DialogPortal> })
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>>(function DropdownMenuContent({ className, ...props }, ref) { return <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content ref={ref} className={cn("z-50 min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-soft", className)} {...props} /></DropdownMenuPrimitive.Portal> })
export const DropdownMenuItem = DropdownMenuPrimitive.Item
