import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hash } from "bcryptjs"

const validRoles = ["FARMER", "COLLECTOR", "DISTRIBUTOR", "RETAILER", "ADMIN"] as const
const validStatuses = ["ACTIVE", "INACTIVE"] as const

export async function GET(req: Request) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json(users)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Gagal mengambil data pengguna" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, role, status, password } = await req.json()

    // Validasi minimal
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, Email, dan Password wajib diisi" }, { status: 400 })
    }

    // Validasi role & status enum
    const finalRole = validRoles.includes(role) ? role : "FARMER"
    const finalStatus = validStatuses.includes(status) ? status : "ACTIVE"

    const hashedPassword = await hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: finalRole,
        status: finalStatus,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (err: any) {
    console.error(err)

    if (err.code === "P2002") {
      const field = err.meta?.target?.[0]
      return NextResponse.json(
        { error: `${field} sudah terdaftar, silakan gunakan yang lain` },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Server error: Gagal memproses permintaan registrasi" },
      { status: 500 }
    )
  }
}
