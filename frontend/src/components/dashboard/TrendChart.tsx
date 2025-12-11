import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendDataPoint } from '@/hooks/useTrend'; // Import type from your hook file

interface TrendChartProps {
  data: TrendDataPoint[] | null;
  loading: boolean;
}

export function TrendChart({ data, loading }: TrendChartProps) {
  // 1. Handle Loading State
  if (loading) {
    return (
      <Card className="shadow-card border border-border h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display font-semibold">Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Loading trend data...</div>
        </CardContent>
      </Card>
    );
  }

  // 2. Handle Empty State
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-card border border-border h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display font-semibold">Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">No trend data available for selected filters.</div>
        </CardContent>
      </Card>
    );
  }

  // 3. Render Chart
  return (
    <Card className="shadow-card border border-border h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display font-semibold flex items-center justify-between">
          <span>Engagement Trends</span>
          <span className="text-xs font-normal text-muted-foreground">
            {data.length > 0 ? `Last ${data.length} periods` : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="h-full w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                // Format date for readability
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="engagement"
                name="Engagement Score"
                stroke="hsl(var(--chart-2))" // Ensure these CSS vars exist or use hex codes like #10b981
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="burnout"
                name="Burnout Risk"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="attrition"
                name="Attrition Risk"
                stroke="hsl(var(--chart-5))"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--chart-5))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}