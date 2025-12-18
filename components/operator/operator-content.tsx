"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, Eye, BarChart3, Upload, TrendingUp, Package } from "lucide-react"
import { OverviewChart } from "./overview-chart"
import Cookies from "js-cookie";
import { jwtDecode } from 'jwt-decode';
import { useNotification } from "@/lib/notification-context"

import { useState, useEffect } from 'react';
// import Lottie
import Lottie from "lottie-react"

// Import animasi dari public
import DashboardAnimation from "@/public/animations/welcome.json"

interface AuthTokenPayload {
  name: string;
  email: string;
  role: string;
}

export function OperatorContent() {
  const [userName, setUserName] = useState<string | null>(null);
  const { addNotification } = useNotification()

  useEffect(() => {
    const token = Cookies.get('auth_token');

    if (token) {
      try {
        const decoded = jwtDecode<AuthTokenPayload>(token);
        if (decoded && decoded.name) {
          setUserName(decoded.name);
        } else {
          addNotification("Error", "Token decoded but 'name' field is missing or invalid.", "error")
          setUserName('Pengguna');
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        setUserName('Pengguna');
      }
    } else {
      setUserName('Pengguna');
    }
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome back, {userName?.toUpperCase() || 'Loading...'}!.
      </p>
      <div className="flex justify-center items-center w-full mt-4 ">
        <div className="w-[500px] h-[500px]">
          <Lottie animationData={DashboardAnimation} loop={true} />
        </div>
      </div>
    </div>
  )
}
