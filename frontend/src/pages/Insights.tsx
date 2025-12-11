import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ActionRecommendations } from '@/components/dashboard/ActionRecommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { microActions } from '@/data/mockData';
import { fetchEmployeeData } from '@/services/dataService';
import { EmployeeData } from '@/types/dashboard';
import { useInsights } from '@/hooks/useInsight';
import { Sparkles, Brain, Lightbulb, TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';

const Insights = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  const { data: insights, loading: insightsLoading, error: insightsError, refetch } = useInsights(
    { dateRange },
    true
  );

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchEmployeeData();
      setEmployees(data);
      setEmployeesLoading(false);
    };
    loadData();
  }, []);

  // Refetch insights when date range changes
  useEffect(() => {
    refetch({ dateRange });
  }, [dateRange, refetch]);

  const criticalCount = employees.filter(e => e.riskLevel === 'critical').length;
  const warningCount = employees.filter(e => e.riskLevel === 'warning').length;

  const loading = employeesLoading || insightsLoading;

  if (loading && !insights) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading insights...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-accent" />
              AI Insights
            </h1>
            <p className="text-muted-foreground text-sm mt-1">AI-generated analysis and recommendations based on employee data</p>
          </div>

          <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {insightsError && (
          <Card className="shadow-card border border-risk-critical/30 bg-risk-critical-bg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-risk-critical">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">Failed to load insights</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{insightsError}</p>
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {insights && (
          <Card className="shadow-card border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                {dateRange === 'week' ? 'Weekly' : dateRange === 'month' ? 'Monthly' : dateRange === 'quarter' ? 'Quarterly' : 'Yearly'} Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insightsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating insights...</span>
                </div>
              ) : (
                <>
                  <p className="text-foreground leading-relaxed">
                    {insights.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-risk-critical-bg text-risk-critical border-risk-critical/30">
                      {insights.criticalTeamsCount} Critical Teams
                    </Badge>
                    {insights.topTheme && (
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                        Top: {insights.topTheme.name} (Impact: {insights.topTheme.impact})
                      </Badge>
                    )}
                    <Badge variant="outline" className={`
                      ${insights.engagementTrend >= 0
                        ? 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/30'
                        : 'bg-risk-warning-bg text-risk-warning border-risk-warning/30'}
                    `}>
                      <span className="flex items-center gap-1">
                        {insights.engagementTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        Engagement {insights.engagementTrend >= 0 ? '+' : ''}{insights.engagementTrend.toFixed(1)}%
                      </span>
                    </Badge>
                  </div>
                  {insights.generatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Generated at {new Date(insights.generatedAt).toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActionRecommendations actions={microActions} />

          <Card className="shadow-card border">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-chart-3" />
                Key Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : insights?.keyObservations && insights.keyObservations.length > 0 ? (
                insights.keyObservations.map((obs, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-background hover:bg-accent/5 transition-colors">
                    <h4 className="font-semibold text-foreground text-sm mb-1">{obs.title}</h4>
                    <p className="text-xs text-muted-foreground">{obs.insight}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No observations available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Insights;