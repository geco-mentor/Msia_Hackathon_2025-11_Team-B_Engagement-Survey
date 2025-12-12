import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, MinusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeSamples, FeedbackSamplesParams } from '@/hooks/useTheme';
import { useEffect } from 'react';

interface ThemeAnalysisProps {
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  sentiment?: 'positive' | 'negative' | 'neutral';
}

const sentimentConfig = {
  positive: {
    icon: CheckCircle,
    color: 'text-risk-healthy',
    bg: 'bg-risk-healthy-bg',
  },
  negative: {
    icon: AlertCircle,
    color: 'text-risk-critical',
    bg: 'bg-risk-critical-bg',
  },
  neutral: {
    icon: MinusCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
};

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-risk-critical" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-risk-healthy" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function ThemeAnalysis({ dateRange = 'month', sentiment }: ThemeAnalysisProps) {
  const { data: themes, loading, error, refetch } = useThemeSamples(
    { dateRange, sentiment },
    true
  );

  // Refetch when filters change
  useEffect(() => {
    refetch({ dateRange, sentiment });
  }, [dateRange, sentiment, refetch]);

  const sortedThemes = themes ? [...themes].sort((a, b) => b.impactScore - a.impactScore) : [];
  const maxFrequency = themes && themes.length > 0 ? Math.max(...themes.map(t => t.frequency)) : 1;

  return (
    <Card className="shadow-card border border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display font-semibold flex items-center justify-between">
          <span>Theme Analysis</span>
          <Badge variant="secondary" className="text-xs font-normal">
            AI-Detected
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Top themes from employee feedback</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading themes...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-8 h-8 text-risk-critical mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load theme data</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sortedThemes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MinusCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No themes found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        )}

        {/* Theme List */}
        {!loading && !error && sortedThemes.slice(0, 6).map((theme, index) => {
          const sentimentKey = (theme.sentiment || 'neutral').toLowerCase() as keyof typeof sentimentConfig;
          const config = sentimentConfig[sentimentKey] || sentimentConfig.neutral;
          const SentimentIcon = config.icon;

          return (
            <div
              key={theme.id}
              className="group p-3 rounded-lg bg-background border border-border hover:border-accent/30 transition-all duration-200 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className={cn("p-1 rounded", config.bg)}>
                    <SentimentIcon className={cn("w-3.5 h-3.5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{theme.theme}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{theme.frequency} mentions</span>
                      <TrendIndicator trend={theme.trend} />
                    </div>
                  </div>
                </div>

              </div>

              {/* Frequency bar */}
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    sentimentKey === 'negative' ? "bg-risk-critical" :
                      sentimentKey === 'positive' ? "bg-risk-healthy" : "bg-muted-foreground"
                  )}
                  style={{ width: `${(theme.frequency / maxFrequency) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
