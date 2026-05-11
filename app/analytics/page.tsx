'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3,
  Search,
  FileText,
  TrendingUp,
  ArrowLeft,
  Activity
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  type ChartConfig 
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import Link from 'next/link'

interface Query {
  id: string
  query_text: string
  search_type: string
  results_count: number
  created_at: string
}

interface QueryStats {
  totalQueries: number
  averageResults: number
  searchTypes: Record<string, number>
}

interface DocumentStats {
  totalDocuments: number
  byStatus: Record<string, number>
  totalChunks: number
}

interface HistoryItem {
  query_text: string
  title: string
  content: string
  score: number
  rank_position: number
  created_at: string
}

// Configuration for the Shadcn Chart
const chartConfig = {
  count: {
    label: "Queries",
    color: "#2563eb",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  // const USER_ID = "11111111-1111-1111-1111-111111111111"
  
  // const [userId, setUserId] = useState<string | null>(null)
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null)
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null)
  const [recentQueries, setRecentQueries] = useState<Query[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Transform queryStats.searchTypes into the format Recharts needs
  const chartData = useMemo(() => {
    if (!queryStats?.searchTypes) return []
    return Object.entries(queryStats.searchTypes).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1), // Capitalizes 'hybrid' to 'Hybrid'
      count: count,
    }))
  }, [queryStats])

  const fetchAnalytics = async () => {
    try {
      const [queriesRes, docsRes, historyRes] = await Promise.all([
fetch(`/api/analytics?type=queries`, { credentials: "include" }),
fetch(`/api/analytics?type=documents`, { credentials: "include" }),
fetch(`/api/analytics?type=history`, { credentials: "include" })      
])

      const queriesData = await queriesRes.json()
      const docsData = await docsRes.json()
      const historyData = await historyRes.json()

      setQueryStats(queriesData.stats)
      setRecentQueries(queriesData.queries || [])
      setDocumentStats(docsData.stats)
      setHistory(historyData.history || [])
    } catch (error) {
      console.error("Analytics fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const handleFocus = () => fetchAnalytics()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-slate-500">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      <div className="max-w-7xl mx-auto p-8 space-y-10">

        <div className="pt-8">
          <Link href="/search">
            <Button variant="ghost" className="mb-4 gap-2 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back to Search
            </Button>
          </Link>

          <h1 className="text-4xl font-bold text-gray-200 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-600" />
            Analytics Dashboard
          </h1>

          <p className="text-lg text-gray-400 mt-2">
            Insights into your semantic search usage
          </p>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Searches"
            value={queryStats?.totalQueries || 0}
            description="All time searches"
            color="blue"
          />
          <StatCard
            title="Documents"
            value={documentStats?.totalDocuments || 0}
            description="Indexed documents"
            color="green"
          />
          <StatCard
            title="Document Chunks"
            value={documentStats?.totalChunks || 0}
            description="Chunks used in vector search"
            color="orange"
          />
          <StatCard
            title="Avg Results"
            value={queryStats?.averageResults?.toFixed(1) || "0"}
            description="Results per query"
            color="purple"
          />
        </div>

        <Tabs defaultValue="queries" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="queries">Search Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-6">
            <Card className="bg-white border-gray-200 text-slate-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Search Type Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of search types used
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 max-h-[400px]">
                <ChartContainer config={chartConfig} className="h-full max-h-[200px] w-full">
                  <BarChart
                    accessibilityLayer
                    data={chartData}
                    layout="vertical"
                    margin={{
                      left: 40, 
                      right: 20,
                    }}
                  >
                    <XAxis type="number" dataKey="count" hide />
                    <YAxis
                      dataKey="type"
                      type="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      className="font-medium text-slate-600"
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#2563eb" 
                      radius={5} 
                      barSize={45} 
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>

              <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4 text-slate-500">
                <div className="flex gap-2 leading-none font-medium text-slate-900">
                  Current data across {queryStats?.totalQueries} total searches <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ title, value, description, color }: any) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600"
  }

  return (
    <Card className={`bg-gradient-to-br ${colors[color]} text-white border-0 shadow-lg`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm opacity-90 uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs opacity-75 mt-2">{description}</p>
      </CardContent>
    </Card>
  )
}