import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret)

    return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (e) {
    console.error("Mobile auth error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}