"use server"
import { signIn, signOut } from "@/auth"

export async function loginGoogle() {
  await signIn("google", { redirectTo: "/" })
}

export async function logout() {
  await signOut({ redirectTo: "/" })
}
