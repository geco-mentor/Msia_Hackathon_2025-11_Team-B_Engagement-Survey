import { Users, AlertTriangle, TrendingDown, TrendingUp, Flame, UserMinus, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SummaryMetrics } from '@/types/dashboard';

interface SummaryCardsProps {
  metrics: SummaryMetrics;
}

export function SummaryCards({ metrics }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Average Engagement',
      value: `${metrics.avgEngagement}%`,
      change: metrics.engagementTrend,
      icon: Users,
      color: metrics.avgEngagement >= 70 ? 'healthy' : metrics.avgEngagement >= 60 ? 'watch' : 'warning',
    },
    {
      title: 'Teams at Risk',
      value: metrics.teamsAtRisk,
      subtitle: 'of 142 teams',
      icon: AlertTriangle,
      color: metrics.teamsAtRisk > 10 ? 'critical' : metrics.teamsAtRisk > 5 ? 'warning' : 'watch',
    },
    {
      title: 'Burnout Alerts',
      value: metrics.burnoutAlerts,
      subtitle: 'teams flagged',
      icon: Flame,
      color: metrics.burnoutAlerts > 6 ? 'critical' : metrics.burnoutAlerts > 3 ? 'warning' : 'watch',
    },
    {
      title: 'Attrition Risk',
      value: metrics.attritionRiskCount,
      subtitle: 'employees',
      icon: UserMinus,
      color: metrics.attritionRiskCount > 100 ? 'critical' : metrics.attritionRiskCount > 50 ? 'warning' : 'watch',
    },
  ];

  const colorClasses = {
    healthy: {
      bg: 'bg-risk-healthy-bg',
      icon: 'text-risk-healthy',
      border: 'border-risk-healthy/20',
    },
    watch: {
      bg: 'bg-risk-watch-bg',
      icon: 'text-risk-watch',
      border: 'border-risk-watch/20',
    },
    warning: {
      bg: 'bg-risk-warning-bg',
      icon: 'text-risk-warning',
      border: 'border-risk-warning/20',
    },
    critical: {
      bg: 'bg-risk-critical-bg',
      icon: 'text-risk-critical',
      border: 'border-risk-critical/20',
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const colors = colorClasses[card.color as keyof typeof colorClasses];
        return (
          <Card
            key={card.title}
            className={cn(
              "shadow-card hover:shadow-card-hover transition-all duration-300 border",
              colors.border,
              "animate-slide-up"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-display font-bold text-foreground">
                      {card.value}
                    </span>
                    {card.change !== undefined && (
                      <span className={cn(
                        "flex items-center text-xs font-medium",
                        card.change > 0 ? "text-risk-healthy" : "text-risk-critical"
                      )}>
                        {card.change > 0 ? (
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                        )}
                        {Math.abs(card.change)}%
                      </span>
                    )}
                  </div>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  )}
                </div>
                <div className={cn("p-2 rounded-lg", colors.bg)}>
                  <card.icon className={cn("w-5 h-5", colors.icon)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
