'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Search, Clock, ChevronRight, Hash, Calendar } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryItem {
  query_text: string
  title: string
  content: string
  score: number
  rank_position: number
  created_at: string
}

// const USER_ID = "11111111-1111-1111-1111-111111111111"

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
const [userId, setUserId] = useState<string | null>(null)

useEffect(() => {
  fetch("/api/users/me")
    .then(res => res.json())
    .then(data => setUserId(data.id))
}, [])

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {

      setLoading(true)
      
      try {
        const res = await fetch(`/api/analytics?userId=${userId}&type=history`)
        const data = await res.json()
        setHistory(data.history || [])
      } catch (error) {
        console.error("History fetch error", error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      </div>
    )
  }

  return (
    <Card className="h-full bg-[#0d0d0f] border-gray-800 text-white shadow-2xl overflow-hidden flex flex-col">
      <CardHeader className="border-b border-gray-800/50 bg-[#0d0d0f]/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2 font-bold tracking-tight">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-500">
              Your semantic search journey and retrieved insights.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-gray-400 border-gray-800">
            {history.length} Entries
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-[600px] w-full px-6 py-4">
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 text-gray-800 mb-4" />
                <p className="text-gray-500">No search history found.</p>
              </div>
            ) : (
              history.map((item, i) => (
                <div
                  key={i}
                  className="group relative flex flex-col p-5 bg-[#16161a] border border-gray-800 rounded-xl transition-all duration-200 hover:border-blue-500/50 hover:bg-[#1c1c21] shadow-sm hover:shadow-blue-500/5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-400 uppercase tracking-wider">
                        <Search className="w-3 h-3" />
                        Search Query
                      </div>
                      <h3 className="text-lg font-semibold text-gray-100 line-clamp-1 group-hover:text-white transition-colors">
                        "{item.query_text}"
                      </h3>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-colors px-2.5 py-0.5 rounded-full">
                      Rank #{item.rank_position}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-grow bg-gray-800"></div>
                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest whitespace-nowrap">Source Detail</span>
                    <div className="h-px flex-grow bg-gray-800"></div>
                  </div>

                  <p className="text-sm font-medium text-blue-300 flex items-center gap-1 mb-2">
                    <ChevronRight className="w-4 h-4" />
                    {item.title}
                  </p>

                  <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4 italic">
                    "{item.content.slice(0, 180)}..."
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Hash className="w-3.5 h-3.5 text-blue-500/50" />
                        Confidence: <span className="text-gray-300">{(item.score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-blue-500/50" />
                        Date: <span className="text-gray-300">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default History