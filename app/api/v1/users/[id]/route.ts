// app/api/users/[id]/route.ts

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

interface Context {
  params: {
    id: string // Variabel dinamis dari path, cth: /api/users/u001
  }
}

// 1. READ ONE (GET) - Optional, tapi berguna
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await context.params).id
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
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

// 2. UPDATE (PATCH)
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await context.params).id
  try {
    const body = await req.json()

    // Hapus password dari body agar tidak diupdate
    if (body.password) {
      delete body.password;
    }

    console.log(userId)
    console.log(body)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: body, // Prisma akan otomatis mengambil field yang berubah
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Gagal mengupdate pengguna" }, { status: 500 })
  }
}

// 3. DELETE (DELETE)
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await context.params).id
  try {
    await prisma.user.delete({
      where: { id: userId },
    })
    // 204 No Content adalah respons sukses standar untuk DELETE
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error(err)
    // P2025: Record to delete not found
    if (err instanceof Error && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ error: "Gagal menghapus pengguna" }, { status: 500 })
  }
}