import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Intervention } from '@/types/dashboard';
import { Plus, Calendar, User, CheckCircle2, Clock, CircleDot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InterventionLogProps {
  interventions: Intervention[];
}

const statusConfig = {
  planned: {
    icon: CircleDot,
    label: 'Planned',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
  },
  'in-progress': {
    icon: Clock,
    label: 'In Progress',
    color: 'text-risk-watch',
    bg: 'bg-risk-watch-bg',
    border: 'border-risk-watch/30',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-risk-healthy',
    bg: 'bg-risk-healthy-bg',
    border: 'border-risk-healthy/30',
  },
};

export function InterventionLog({ interventions }: InterventionLogProps) {
  return (
    <Card className="shadow-card border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-semibold">Intervention Log</CardTitle>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Log Action
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Track actions taken and their outcomes</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {interventions.map((intervention, index) => {
          const config = statusConfig[intervention.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={intervention.id}
              className={cn(
                "p-4 rounded-lg border transition-all duration-200 hover:shadow-sm animate-slide-up",
                config.border,
                "bg-card"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-[10px] border", config.bg, config.color, config.border)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">{intervention.teamName}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{intervention.action}</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {intervention.outcome && (
                <div className="mb-2 p-2 rounded bg-risk-healthy-bg border border-risk-healthy/20">
                  <p className="text-xs text-risk-healthy">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    {intervention.outcome}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(intervention.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {intervention.createdBy}
                </span>
              </div>
            </div>
          );
        })}

        <Button variant="outline" className="w-full text-sm">
          View Full History
        </Button>
      </CardContent>
    </Card>
  );
}
