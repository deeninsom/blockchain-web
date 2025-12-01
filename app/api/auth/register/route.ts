import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Cek apakah email sudah ada
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashed = await hash(password, 10)

    // Buat user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role || "user",
        status: "active"
      },
    })

    return NextResponse.json({
      success: true,
      message: "Registration successful",
      user: { id: user.id, email: user.email },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
