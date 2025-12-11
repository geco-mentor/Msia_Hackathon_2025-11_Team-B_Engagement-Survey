import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamRiskData, RiskLevel } from '@/types/dashboard';
import { TrendingUp, TrendingDown, Minus, ChevronRight, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamRiskTableProps {
  teams: TeamRiskData[];
}

const riskBadgeStyles: Record<RiskLevel, string> = {
  critical: 'bg-risk-critical-bg text-risk-critical border-risk-critical/30',
  warning: 'bg-risk-warning-bg text-risk-warning border-risk-warning/30',
  watch: 'bg-risk-watch-bg text-risk-watch border-risk-watch/30',
  healthy: 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/30',
};

const riskLabels: Record<RiskLevel, string> = {
  critical: 'Critical',
  warning: 'Warning',
  watch: 'Watch',
  healthy: 'Healthy',
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-risk-healthy" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-risk-critical" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border', riskBadgeStyles[level])}>
      {riskLabels[level]}
    </Badge>
  );
}

export function TeamRiskTable({ teams }: TeamRiskTableProps) {
  const sortedTeams = [...teams].sort((a, b) => {
    const riskOrder: Record<RiskLevel, number> = { critical: 0, warning: 1, watch: 2, healthy: 3 };
    return riskOrder[a.overallRisk] - riskOrder[b.overallRisk];
  });

  return (
    <Card className="shadow-card border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-semibold">Team Hotspots</CardTitle>
          <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
            View All Teams
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="font-semibold text-foreground">Team</TableHead>
                <TableHead className="font-semibold text-foreground">Engagement</TableHead>
                <TableHead className="font-semibold text-foreground">Burnout</TableHead>
                <TableHead className="font-semibold text-foreground">Attrition</TableHead>
                <TableHead className="font-semibold text-foreground">Trend</TableHead>
                <TableHead className="font-semibold text-foreground">Top Drivers</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.map((team) => (
                <TableRow key={team.id} className="hover:bg-muted/50 border-border">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{team.teamName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {team.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {team.employeeCount}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            team.engagementScore >= 70 ? "bg-risk-healthy" :
                              team.engagementScore >= 60 ? "bg-risk-watch" : "bg-risk-critical"
                          )}
                          style={{ width: `${team.engagementScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground">{team.engagementScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={team.burnoutRisk} />
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={team.attritionRisk} />
                  </TableCell>
                  <TableCell>
                    <TrendIcon trend={team.trend} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {team.topDrivers.slice(0, 2).map((driver) => (
                        <Badge key={driver} variant="secondary" className="text-xs font-normal bg-secondary text-secondary-foreground">
                          {driver}
                        </Badge>
                      ))}
                      {team.topDrivers.length > 2 && (
                        <Badge variant="secondary" className="text-xs font-normal bg-secondary text-secondary-foreground">
                          +{team.topDrivers.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="text-xs">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
