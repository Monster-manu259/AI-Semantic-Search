'use client'

import { usePathname } from "next/navigation"
import Sidebar from "@/components/views/sidebar"

export default function ConditionalSidebar() {
  const pathname = usePathname()

  const hideSidebar =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/reset-password")

  if (hideSidebar) return null

  return <Sidebar />
}