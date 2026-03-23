"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface WizardStepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export default function WizardStepIndicator({ currentStep, totalSteps }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isCompleted = step < currentStep
        const isCurrent = step === currentStep

        return (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-200",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  "h-0.5 w-6 mx-1 transition-colors duration-200",
                  step < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
