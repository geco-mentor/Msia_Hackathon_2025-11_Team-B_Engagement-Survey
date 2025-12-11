import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { interventions as initialInterventions, departments } from '@/data/mockData';
import { CheckCircle2, Clock, CircleDot, Plus, ChevronRight, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Intervention } from '@/types/dashboard';

import { InterventionAgent } from '@/components/dashboard/InterventionAgent';

const Interventions = () => {
  const [interventions, setInterventions] = useState<Intervention[]>(initialInterventions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIntervention, setNewIntervention] = useState({
    teamName: '',
    action: '',
    status: 'planned' as const,
    createdBy: 'You'
  });

  const completed = interventions.filter(i => i.status === 'completed').length;
  const inProgress = interventions.filter(i => i.status === 'in-progress').length;
  const planned = interventions.filter(i => i.status === 'planned').length;

  const handleCreate = () => {
    const intervention: Intervention = {
      id: (interventions.length + 1).toString(),
      teamId: '999', // Mock ID
      teamName: newIntervention.teamName,
      action: newIntervention.action,
      date: new Date().toISOString().split('T')[0],
      status: newIntervention.status,
      createdBy: newIntervention.createdBy
    };
    setInterventions([intervention, ...interventions]);
    setIsDialogOpen(false);
    setNewIntervention({ teamName: '', action: '', status: 'planned', createdBy: 'You' });
  };

  const statusConfig = {
    planned: { icon: CircleDot, label: 'Planned', color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
    'in-progress': { icon: Clock, label: 'In Progress', color: 'text-risk-watch', bg: 'bg-risk-watch-bg', border: 'border-risk-watch/30' },
    completed: { icon: CheckCircle2, label: 'Completed', color: 'text-risk-healthy', bg: 'bg-risk-healthy-bg', border: 'border-risk-healthy/30' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Interventions</h1>
            <p className="text-muted-foreground text-sm mt-1">Track and manage HR interventions and their outcomes</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Log New Intervention
              </Button>
            </DialogTrigger>
            <DialogContent>

              <DialogHeader>
                <DialogTitle>Log New Intervention</DialogTitle>
                <DialogDescription>Record a new action taken to support a department or employee.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Department / Team</Label>
                  <Select onValueChange={(val) => setNewIntervention({ ...newIntervention, teamName: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.filter(d => d !== 'All Departments').map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="action">Action Taken</Label>
                  <Textarea
                    id="action"
                    placeholder="Describe the intervention..."
                    value={newIntervention.action}
                    onChange={(e) => setNewIntervention({ ...newIntervention, action: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(val: any) => setNewIntervention({ ...newIntervention, status: val })} defaultValue="planned">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save Intervention</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Added Agent Here */}
        <InterventionAgent />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stats Cards */}
          <Card className="shadow-card border border-risk-healthy/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-risk-healthy-bg">
                <CheckCircle2 className="w-6 h-6 text-risk-healthy" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border border-risk-watch/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-risk-watch-bg">
                <Clock className="w-6 h-6 text-risk-watch" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <CircleDot className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{planned}</p>
                <p className="text-sm text-muted-foreground">Planned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display font-semibold">Intervention Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {interventions.map((intervention, index) => {
              const config = statusConfig[intervention.status];
              const StatusIcon = config.icon;
              const isRealDept = departments.some(d => intervention.teamName.includes(d)); // Naive check to link
              const deptLink = departments.find(d => intervention.teamName.includes(d)) || '';

              return (
                <div key={intervention.id} className={cn("p-4 rounded-lg border bg-card", config.border)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("text-[10px] border", config.bg, config.color, config.border)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{intervention.teamName}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{intervention.action}</p>
                    </div>
                    {isRealDept && (
                      <Button variant="ghost" size="sm" onClick={() => window.location.href = `/?department=${deptLink}`}>
                        View Dept <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                  {intervention.outcome && (
                    <div className="mb-2 p-2 rounded bg-risk-healthy-bg border border-risk-healthy/20">
                      <p className="text-xs text-risk-healthy"><CheckCircle2 className="w-3 h-3 inline mr-1" /> {intervention.outcome}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {intervention.date}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {intervention.createdBy}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Interventions;
