"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, ThemeProviderProps as NextThemeProviderProps, Attribute } from "next-themes"

export interface ThemeProviderProps extends Omit<NextThemeProviderProps, "attribute"> {
  children: React.ReactNode
  attribute?: Attribute | Attribute[]
}

export function ThemeProvider({ children, attribute = "class", ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props} attribute={attribute as Attribute}>{children}</NextThemesProvider>
}
