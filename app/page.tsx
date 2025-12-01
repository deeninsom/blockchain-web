"use client"

import { useState } from "react"
import { LoginPage } from "@/components/auth/login-page"
import { RegisterPage } from "@/components/auth/register-page"

export default function Home() {
  const [authMode, setAuthMode] = useState<"login" | "register">("login")

  return (
    <div className="min-h-screen bg-background">
      {authMode === "login" ? (
        <LoginPage onSwitchToRegister={() => setAuthMode("register")} />
      ) : (
        <RegisterPage onSwitchToLogin={() => setAuthMode("login")} />
      )}
    </div>
  )
}
