'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserPlus, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ email: '', password: '', fullName: '' })
    const [error, setError] = useState('')
const [errors, setErrors] = useState<any>({})


const validate = () => {
    const newErrors: any = {}

    if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required"
    }

    if (!formData.email.includes("@")) {
        newErrors.email = "Enter a valid email"
    }

    if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    })

    if (res.ok) router.push('/login')
    else {
        const data = await res.json()
        setError(data.error || 'Registration failed')
    }
}
    

    return (
        <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161618] border border-gray-800 rounded-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-blue-600/10 rounded-xl mb-4">
                        <UserPlus className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create Account</h1>
                    <p className="text-gray-400 text-sm mt-2">Join the AI Semantic Search platform</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Enter full name"
                                required
                                className="w-full bg-[#0d0d0f] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            />
                        </div>
                            {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="email" 
                                placeholder="Enter email"
                                required
                                className="w-full bg-[#0d0d0f] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                placeholder="Enter password"
                                required
                                className="w-full bg-[#0d0d0f] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                    </div>

                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6">
                        Register
                    </Button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account? <Link href="/login" className="text-blue-500 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    )
}