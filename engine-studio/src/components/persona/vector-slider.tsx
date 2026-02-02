"use client"

import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, RotateCcw } from "lucide-react"
import type { Vector6D, VectorDimension } from "@/types"
import { VECTOR_DIMENSION_LABELS, VECTOR_PRESETS } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface VectorSliderProps {
  value: Vector6D
  onChange: (value: Vector6D) => void
  disabled?: boolean
  showPresets?: boolean
  showReset?: boolean
  compact?: boolean
}

export function VectorSlider({
  value,
  onChange,
  disabled = false,
  showPresets = true,
  showReset = true,
  compact = false,
}: VectorSliderProps) {
  const dimensions: VectorDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
  ]

  const handleChange = (dimension: VectorDimension, newValue: number) => {
    onChange({
      ...value,
      [dimension]: newValue,
    })
  }

  const handlePreset = (presetKey: keyof typeof VECTOR_PRESETS) => {
    const preset = VECTOR_PRESETS[presetKey]
    onChange({
      depth: preset.depth,
      lens: preset.lens,
      stance: preset.stance,
      scope: preset.scope,
      taste: preset.taste,
      purpose: preset.purpose,
    })
  }

  const handleReset = () => {
    onChange({
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
    })
  }

  return (
    <div className="space-y-6">
      {/* Presets */}
      {showPresets && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">프리셋</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(VECTOR_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handlePreset(key as keyof typeof VECTOR_PRESETS)}
                disabled={disabled}
              >
                {preset.name}
              </Button>
            ))}
            {showReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                초기화
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sliders */}
      <div className={cn("space-y-6", compact && "space-y-4")}>
        {dimensions.map((dim) => {
          const label = VECTOR_DIMENSION_LABELS[dim]
          return (
            <div key={dim} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{label.label}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">{label.name}</p>
                      <p className="text-xs mt-1">{label.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-sm font-mono text-muted-foreground">
                  {value[dim].toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {label.low}
                </span>
                <Slider
                  value={[value[dim] * 100]}
                  onValueChange={([v]) => handleChange(dim, v / 100)}
                  min={0}
                  max={100}
                  step={1}
                  disabled={disabled}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-16">
                  {label.high}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
