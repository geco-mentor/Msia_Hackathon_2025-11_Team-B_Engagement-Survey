import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrend } from '@/hooks/useTrend';
// Assuming useFilters exists, otherwise we can mock the department list
import { useFilters } from '@/hooks/useFilters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper function to calculate dates
const getDateRangeParams = (range: string) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case 'quarter':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'year':
      startDate.setDate(endDate.getDate() - 365);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
};

const Trends = () => {
  // 1. Define Local State
  const [timeRange, setTimeRange] = useState<string>('daily');
  const [granularity, setGranularity] = useState<'daily' | 'week' | 'month'>('daily');
  const [department, setDepartment] = useState<string>('all');

  // 2. Get Filter Data (Departments)
  // If you don't have this hook yet, you can comment it out and use a static list
  const { data: filterData, loading: filtersLoading } = useFilters();

  // 3. Prepare Parameters for API
  const trendParams = useMemo(() => {
    // Calculate start/end dates based on the selected Time Range
    const { start_date, end_date } = getDateRangeParams(timeRange);

    return {
      start_date,
      end_date,
      granularity, // Use the state variable directly
      department: department === 'all' ? undefined : department,
    };
  }, [timeRange, granularity, department]);

  // 4. Fetch Trend Data
  const { data, loading, error } = useTrend(trendParams);

  // 5. Handlers
  const handleTimeRangeChange = (val: string) => {
    setTimeRange(val);

  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Engagement Trends</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track engagement, burnout, and attrition trends over time
          </p>
        </div>

        {/* Filters Bar */}
        <Card className="shadow-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">

              {/* Time Range Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Time Period</label>
                <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 90 Days</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Granularity Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Data Granularity</label>
                <Select
                  value={granularity}
                  onValueChange={(val: any) => setGranularity(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select granularity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Department</label>
                <Select
                  value={department}
                  onValueChange={setDepartment}
                  disabled={filtersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filtersLoading ? "Loading..." : "All Departments"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {filterData?.departments?.map((dept: string) => (
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
            <CardTitle>Metric Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] w-full min-w-0">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">Loading trends data...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-destructive">Error: {error}</div>
              </div>
            )}

            {!loading && !error && data && data.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickMargin={10}
                  // Removed localDateString formatter because API returns pre-formatted strings (e.g., "Week 42")
                  // If API returned ISO dates, we would use a formatter here.
                  />
                  <YAxis
                    domain={[0, 100]} // Fixed scale 0-100 for percentage
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />

                  <Line
                    type="monotone"
                    dataKey="engagement"
                    stroke="#10b981" // Emerald-500
                    strokeWidth={2}
                    name="Engagement"
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="burnout"
                    stroke="#f59e0b" // Amber-500
                    strokeWidth={2}
                    name="Burnout Risk"
                    dot={{ r: 3, fill: '#f59e0b' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attrition"
                    stroke="#ef4444" // Red-500
                    strokeWidth={2}
                    name="Attrition Risk"
                    dot={{ r: 3, fill: '#ef4444' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {!loading && !error && (!data || data.length === 0) && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p>No trend data available for this period.</p>
                <p className="text-xs mt-1">Try selecting a wider date range or different department.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Trends;