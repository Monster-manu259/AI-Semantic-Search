'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogIn, Mail, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const validate = () => {
    if (!formData.email || !formData.password) {
        setError("Email and password are required")
        return false
    }

    if (!formData.email.includes("@")) {
        setError("Enter a valid email")
        return false
    }

    return true
}

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return;
        
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })
            
            const data = await res.json()

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(data.user))
                window.location.href = '/search'
            } else {
                setError(data.error || 'Invalid email or password')
            }
        } catch (err) {
            setError('Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161618] border border-gray-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-blue-600/10 rounded-xl mb-4">
                        <LogIn className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-gray-400 text-sm mt-2">Sign in to your AI Semantic Search account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="email" 
                                required
                                placeholder="name@example.com"
                                className="w-full bg-[#0d0d0f] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-700"
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-sm text-gray-400">Password</label>
                            <Link href="/reset-password" className="text-xs text-blue-500 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                required
                                placeholder="••••••••"
                                className="w-full bg-[#0d0d0f] border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-gray-700"
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    </div>

                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center">{error}</div>}

                    <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                    </Button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Don't have an account? <Link href="/register" className="text-blue-500 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    )
}