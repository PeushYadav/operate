import clientPromise from "@/app/lib/db/mongodb"
import { NextResponse } from "next/server"

export async function GET() {

  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB)

  const result = await db.collection("test").insertOne({
    message: "MongoDB connected successfully",
    time: new Date()
  })

  return NextResponse.json({
    success: true,
    insertedId: result.insertedId
  })
}
