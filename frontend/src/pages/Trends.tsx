import { useState, useMemo } from 'react'; // Import useMemo
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrend } from '@/hooks/useTrend';
import { useFilters } from '@/hooks/useFilters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Trends = () => {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [department, setDepartment] = useState<string>('all');

  const { data: filterData, loading: filtersLoading } = useFilters();

  // FIX: Memoize the params object so it doesn't change reference on every render
  const trendParams = useMemo(() => ({
    granularity: granularity,
    ...(department !== 'all' && { department })
  }), [granularity, department]);

  // The hook will now automatically refetch whenever trendParams changes
  const { data, loading, error } = useTrend(trendParams);

  console.log(data, "data");

  const handleGranularityChange = (value: string) => {
    // Just update state; useMemo + useTrend will handle the refetch automatically
    setGranularity(value as 'daily' | 'weekly' | 'monthly');
  };

  const handleDepartmentChange = (value: string) => {
    // Just update state
    setDepartment(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Engagement Trends</h1>
          <p className="text-muted-foreground text-sm mt-1">Track engagement, burnout, and attrition trends over time</p>
        </div>

        {/* Filters */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Granularity</label>
                <Select value={granularity} onValueChange={handleGranularityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select granularity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Department</label>
                <Select value={department} onValueChange={handleDepartmentChange} disabled={filtersLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={filtersLoading ? "Loading departments..." : "All Departments"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {filterData?.departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trends Chart */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle>Engagement, Burnout & Attrition Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading trends data...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-destructive">Error: {error}</div>
              </div>
            )}

            {/* Check specifically for data.length > 0 to render chart */}
            {!loading && !error && data && data.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    // Optional: format date if it's too long
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Engagement (%)"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="burnout"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Burnout (%)"
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attrition"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Attrition (%)"
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {!loading && !error && (!data || data.length === 0) && (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">No trend data available</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Trends;