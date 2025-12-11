import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, AlertTriangle, ChevronRight, Activity, MapPin } from 'lucide-react';
import { useTeam } from '@/hooks/useTeam'; // Import the new hook
import { useNavigate } from 'react-router-dom';

const Teams = () => {
  const navigate = useNavigate();
  const { teams, loading, error, refetch } = useTeam();

  // Calculate total employees from the real data
  const totalEmployees = teams.reduce((acc, curr) => acc + curr.employeeCount, 0);

  // Helper to determine color based on API risk strings
  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'watch': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading team analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Departments Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor aggregated risk across all divisions</p>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{totalEmployees}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="shadow-card border hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-start text-lg">
                  <div>
                    <span className="block">{team.department}</span>
                    <div className="flex items-center text-xs font-normal text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3 mr-1" /> {team.location}
                    </div>
                  </div>
                  <div className="flex items-center text-sm font-normal text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    <Users className="w-4 h-4 mr-1" /> {team.employeeCount}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Engagement Score Row */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Activity className="w-4 h-4 mr-2" />
                      Engagement
                    </div>
                    <span className="font-bold">{team.engagementScore.toFixed(1)}%</span>
                  </div>

                  {/* Risk Badge Row */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Overall Risk</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border flex items-center capitalize ${getRiskColor(team.overallRisk)}`}>
                      {team.overallRisk !== 'healthy' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {team.overallRisk}
                    </span>
                  </div>

                  {/* Trend Row */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Trend</span>
                    <span className={`capitalize ${team.trend === 'stable' ? 'text-gray-500' :
                      team.trend === 'up' ? 'text-green-600' : 'text-red-500'
                      }`}>
                      {team.trend}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    size="sm"
                    onClick={() => navigate(`/hotspots/${team.department}`)}
                  >
                    View Drilldown <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Teams;