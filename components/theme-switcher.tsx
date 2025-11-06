"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeSwitcher() {
  const { theme, setTheme, isDark, mounted } = useTheme()

  if (!mounted) {
    return <Button variant="outline" size="icon" disabled className="mockzilla-border bg-card/50 backdrop-blur-sm" />
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="mockzilla-border bg-card/50 backdrop-blur-sm hover:bg-card/75"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
