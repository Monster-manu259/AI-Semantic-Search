'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Mail, ArrowRight, ArrowLeft } from "lucide-react"

export default function ResetPassword() {
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [status, setStatus] = useState("")
  const router = useRouter()


  const validate = () => {
    if (!email.includes("@")) {
        setStatus("Enter a valid email")
        return false
    }

    if (newPassword.length < 6) {
        setStatus("Password must be at least 6 characters")
        return false
    }

    return true
}

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const res = await fetch("/api/auth/reset", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    })
    if (res.ok) {
      setStatus("Success! Redirecting...")
      setTimeout(() => router.push("/login"), 2000)
    } else {
      setStatus("Failed to reset password.")
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-[#161618] border border-gray-800 rounded-2xl p-8">
          <p className="text-sm text-center text-gray-400">
            <button className="text-blue-500 hover:underline flex " onClick={() => router.push("/login")}>
             <ArrowLeft size={18}/>&nbsp;  Return to Login
            </button>
          </p>
        <h1 className="text-2xl font-bold my-6 flex items-center gap-2">
          <KeyRound className="text-blue-500" /> Reset Password
        </h1>
        <form onSubmit={handleReset} className="space-y-4">
         <div className="space-y-2">
          <label className="text-sm text-gray-400">Email Address</label>
          <input 
            type="email" placeholder="Your Email" 
            className="w-full bg-[#0d0d0f] border border-gray-800 p-3 rounded-lg"
            onChange={e => setEmail(e.target.value)} 
          />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">New Password</label>
          <input 
            type="password" placeholder="New Password" 
            className="w-full bg-[#0d0d0f] border border-gray-800 p-3 rounded-lg"
            onChange={e => setNewPassword(e.target.value)} 
          />
          </div>
          <button className="w-full bg-blue-600 p-3 rounded-lg flex justify-center items-center gap-2">
            Update Password <ArrowRight size={18} />
          </button>
        
        </form>
        {status && <p className="mt-4 text-sm text-center text-blue-400">{status}</p>}
      </div>
    </div>
  )
}