'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, BarChart3, Clock, Upload, Trash2, LogOut, User as UserIcon } from "lucide-react"
import { Button } from "../ui/button"
import { useRouter } from "next/navigation"

interface Session {
    id: string
    title: string
}

export default function Sidebar() {
    const router = useRouter()
    const [sessions, setSessions] = useState<Session[]>([])
    const [user, setUser] = useState<{ id: string, email: string, role: string } | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await fetch(`/api/users/me`);
                const data = await res.json();
                if (res.ok) {
                    setUser(data);
                    fetchRecent(data.id);
                } else {
                    router.push('/login');
                }
            } catch (err) {
                console.error("Auth check failed", err);
            }
        };
        fetchUserData();
    }, []);

    const fetchRecent = async (userId: string) => {
        try {
            const res = await fetch(`/api/sessions/list?userId=${userId}`)
            const data = await res.json()
            setSessions(data.sessions || [])
        } catch (err) {
            console.error("Failed loading sessions", err)
        }
    }

const handleLogout = async () => {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
           setUser(null);
           setSessions([]);

            router.replace('/login'); 
            router.refresh();        
        }
    } catch (err) {
        console.error("Logout failed", err);
    }
};

useEffect(() => {

  const handleSessionUpdate = () => {
    if (user?.id) {
      fetchRecent(user.id);
    }
  };

  window.addEventListener("session-created", handleSessionUpdate);

  return () => {
    window.removeEventListener("session-created", handleSessionUpdate);
  };

}, [user]);

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            const res = await fetch(`/api/sessions/delete?sessionId=${sessionId}`, { method: 'DELETE' })
            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId))
                if (window.location.search.includes(sessionId)) router.push("/search")
            }
        } catch (err) { console.error("Delete failed", err) }
    }

    return (
        <div className="w-64 h-screen border-r border-gray-800 bg-[#0d0d0f] flex flex-col overflow-hidden text-white">
            <div className="p-6 text-lg font-semibold border-b border-gray-800 shrink-0">
                AI Semantic Search
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-2 p-4">
                    <button onClick={() => router.push("/search")} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1d] text-gray-300 transition-colors">
                        <Search className="w-4 h-4" />
                       New Search
                    </button>

                    {user?.role === 'admin' && (
                        <Link href="/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1d] text-gray-300 transition-colors">
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </Link>
                    )}

                    <Link href="/history" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1d] text-gray-300 transition-colors">
                        <Clock className="w-4 h-4" />
                        History
                    </Link>
                </div>

                <div className="px-4 pb-4">
                    <div className="text-xs text-gray-500 uppercase mb-3 px-3 font-medium tracking-wider">Recent</div>
                    <div className="flex flex-col gap-1">
                        {sessions.map((session) => (
                            <div key={session.id} className="group flex items-center justify-between rounded-lg hover:bg-[#1a1a1d] transition-colors">
                                <button onClick={() => router.push(`/search?session=${session.id}`)} className="flex-1 text-left text-sm text-gray-400 px-3 py-2 truncate group-hover:text-white">
                                    {session.title}
                                </button>
                                <button onClick={(e) => handleDelete(e, session.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Actions Section */}
            <div className="p-4 border-t border-gray-800 flex flex-col gap-2 shrink-0 bg-[#0d0d0f]">
                {user?.role === 'admin' && (

                    <Link href="/documents">
                        <Button variant="outline" className="w-full gap-2 border-gray-700 bg-transparent text-gray-300 hover:bg-white hover:text-black">
                            <Upload className="w-4 h-4" />
                            Documents
                        </Button>
                    </Link>
                )}

                <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate">{user?.email.split('@')[0]}</span>
                            <span className="text-[10px] text-gray-500 capitalize">{user?.role}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}