import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MicroAction } from '@/types/dashboard';
import { 
  Briefcase, 
  Award, 
  MessageSquare, 
  Users, 
  Heart,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionRecommendationsProps {
  actions: MicroAction[];
}

const categoryConfig = {
  workload: { icon: Briefcase, color: 'text-chart-1', bg: 'bg-chart-1/10' },
  recognition: { icon: Award, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  communication: { icon: MessageSquare, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  leadership: { icon: Users, color: 'text-chart-4', bg: 'bg-chart-4/10' },
  wellbeing: { icon: Heart, color: 'text-chart-5', bg: 'bg-chart-5/10' },
};

const priorityStyles = {
  high: 'bg-risk-critical-bg text-risk-critical border-risk-critical/30',
  medium: 'bg-risk-watch-bg text-risk-watch border-risk-watch/30',
  low: 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/30',
};

export function ActionRecommendations({ actions }: ActionRecommendationsProps) {
  const sortedActions = [...actions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="shadow-card border border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <span>Recommended Actions</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">AI-suggested micro-interventions based on detected issues</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedActions.slice(0, 4).map((action, index) => {
          const config = categoryConfig[action.category];
          const CategoryIcon = config.icon;
          
          return (
            <div 
              key={action.id}
              className="group p-4 rounded-lg border border-border bg-background hover:border-accent/30 hover:shadow-md transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
                  <CategoryIcon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground leading-tight">
                      {action.title}
                    </h4>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 border", priorityStyles[action.priority])}>
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {action.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Zap className="w-3 h-3 text-risk-watch" />
                      <span className="text-muted-foreground">{action.estimatedImpact}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs text-accent hover:text-accent/80 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Apply
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <Button variant="outline" className="w-full mt-2 text-sm">
          View All Recommendations
        </Button>
      </CardContent>
    </Card>
  );
}
