import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { compare } from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.AUTH_SECRET || "DEFAULT_SECRET_FOR_DEV_ONLY";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Missing email or password" },
        { status: 400 }
      )
    }

    const userRecord = await prisma.user.findUnique({ where: { email } })
    if (!userRecord) {
      return NextResponse.json(
        { success: false, message: `User ${email} not registered` },
        { status: 401 }
      )
    }

    const isValid = await compare(password, userRecord.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: `Wrong Password for user ${email} ` },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      { id: userRecord.id, email: userRecord.email, role: userRecord.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    const userData = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userData,
    }, { status: 200 });


    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error("LOGIN ERROR:", err)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}