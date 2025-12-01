import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hash } from 'bcryptjs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  try {
    const user = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Gagal mengambil data pengguna" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, role, status, password } = await req.json()

    if (!password || !email) {
      return NextResponse.json({ error: "Email dan Password wajib diisi" }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        role: role || 'USER',
        status: status || 'ACTIVE',
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (err: any) {
    console.error(err)

    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      return NextResponse.json({ error: "Email sudah terdaftar, silakan gunakan email lain" }, { status: 409 })
    }

    return NextResponse.json({ error: "Server error: Gagal memproses permintaan registrasi" }, { status: 500 })
  }
}