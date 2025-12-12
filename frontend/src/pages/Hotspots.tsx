import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { DashboardFilters } from '@/types/dashboard';
import { RefreshCw, AlertCircle, CheckCircle2, Sparkles, X, Activity } from 'lucide-react';
import { useIndividual } from '@/hooks/useIndividual';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate, useParams } from 'react-router-dom';
import { DeepSentimentAnalytics } from '@/components/dashboard/DeepSentimentAnalytics';

interface ActionItem {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}
import { FilterBar } from '@/components/dashboard/FilterBar';

const Hotspots = () => {
  const navigate = useNavigate();


  const { dept_n } = useParams();

  const [filters, setFilters] = useState<DashboardFilters>({
    department: dept_n || 'all',
    location: 'All Locations',
    riskLevel: 'all',
    dateRange: 'month',
  });

  // --- Modal State ---
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedAnalyticsEmployee, setSelectedAnalyticsEmployee] = useState<any | null>(null); // New State for Analytics Modal
  const [recommendations, setRecommendations] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [activeActions, setActiveActions] = useState<number[]>([]); // Track clicked buttons by index
  const {
    allEmployees,
    fetchAllEmployees,
    loading,
    error,
    generateRecommendations // Import the new function
  } = useIndividual(20, filters.department);
  useEffect(() => {
    fetchAllEmployees();
  }, [fetchAllEmployees]);

  const criticalEmployees = allEmployees.filter(e => e.risk_status === 'critical');
  const warningEmployees = allEmployees.filter(e => e.risk_status === 'warning');
  // --- Handlers ---

  const handleOpenActionModal = async (employee: any) => {
    setSelectedEmployee(employee);
    setLoadingActions(true);
    setRecommendations([]); // Clear previous
    setActiveActions([]);   // Clear previous active states

    try {
      const actions = await generateRecommendations(employee.Employee_ID);
      setRecommendations(actions);
    } catch (e) {
      console.error("Failed to load actions", e);
    } finally {
      setLoadingActions(false);
    }
  };

  const handleOpenAnalyticsModal = (employee: any) => {
    setSelectedAnalyticsEmployee(employee);
  };

  const handleCloseModal = () => {
    setSelectedEmployee(null);
  };

  const handleCloseAnalyticsModal = () => {
    setSelectedAnalyticsEmployee(null);
  };


  const toggleAction = (index: number) => {
    if (activeActions.includes(index)) {
      setActiveActions(prev => prev.filter(i => i !== index));
    } else {
      setActiveActions(prev => [...prev, index]);
    }
  };
  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ... (Header and Stats logic remains exactly the same as before) ... */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Risk Hotspots</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Analyzing {allEmployees.length} employees for immediate attention
            </p>
          </div>
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            showDepartment={true}
            showLocation={false}
            showRiskLevel={false}
            showDateRange={false}
            showRefresh={false}
          />
          <Button variant="outline" size="sm" onClick={fetchAllEmployees} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>

        {/* ... (Error and Loading States remain same) ... */}

        {!loading && !error && (
          <div className="space-y-4">
            {/* Critical Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-risk-critical animate-pulse" />
                <h2 className="text-lg font-display font-semibold text-foreground">Critical Risk ({criticalEmployees.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalEmployees.map((emp) => (
                  <Card key={emp.Employee_ID} className="shadow-card border border-risk-critical/30 bg-risk-critical-bg">
                    <CardContent className="p-5">
                      {/* ... Card Info ... */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{emp.Employee_ID}</h3>
                        <Badge variant="outline" className="bg-risk-critical-bg text-risk-critical border-risk-critical/30">Critical</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-3xl font-display font-bold text-foreground">
                          {emp.sentiment_score ? Number(emp.sentiment_score).toFixed(2) : 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">Sentiment Score</span>
                      </div>
                      <div className="flex flex-col gap-1 mb-4 text-xs">
                        <div className="flex justify-between">
                          <span>Current Workload:</span>
                          <span className="font-semibold">{emp.current_weekly_workload} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Workload:</span>
                          <span className="font-semibold">{emp.average_weekly_workload} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stress:</span>
                          <span className="font-semibold">{emp.stress_rate} %</span>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-risk-critical text-risk-critical-foreground hover:bg-risk-critical/90 mt-4"
                        size="sm"
                        onClick={() => handleOpenAnalyticsModal(emp)}
                      >
                        View Details
                      </Button>
                      <Button
                        className="w-full bg-risk-critical text-risk-critical-foreground hover:bg-risk-critical/90 mt-4"
                        size="sm"
                        onClick={() => handleOpenActionModal(emp)}
                      >
                        View Actions <Sparkles className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Warning Section (Similar Button Logic) */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-risk-warning" />
                <h2 className="text-lg font-display font-semibold text-foreground">Warning ({warningEmployees.length})</h2>
              </div>
              <div className="grid grid-cols-1 md://grid-cols-2 lg:grid-cols-3 gap-4">
                {warningEmployees.map((emp) => (
                  <Card key={emp.Employee_ID} className="shadow-card border border-risk-warning/30 bg-risk-warning-bg/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between mb-2"><h3 className="font-medium">{emp.Employee_ID}</h3></div>
                      <div className="text-2xl font-bold mb-4">{emp.sentiment_score ? Number(emp.sentiment_score).toFixed(2) : 'N/A'}</div>
                      <div className="flex flex-col gap-1 mb-4 text-xs">
                        <div className="flex justify-between">
                          <span>Current Workload:</span>
                          <span className="font-semibold">{emp.current_weekly_workload} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Workload:</span>
                          <span className="font-semibold">{emp.average_weekly_workload} hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stress:</span>
                          <span className="font-semibold">{emp.stress_rate} %</span>
                        </div>
                      </div>
                      <Button
                        className="w-full border-risk-warning/30 text-risk-warning hover:bg-risk-warning-bg"
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAnalyticsModal(emp)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 4. POPUP MODAL (DIALOG) - ACTIONS --- */}
        <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Recommended Actions
              </DialogTitle>
              <DialogDescription>
                Targeted intervention plan for Employee <strong>{selectedEmployee?.Employee_ID}</strong> based on recent stress and workload analysis.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {loadingActions ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <RefreshCw className="w-10 h-10 animate-spin text-primary/50" />
                  <p className="text-sm text-muted-foreground animate-pulse">Generating custom recommendations...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((action, index) => {
                    const isActive = activeActions.includes(index);
                    return (
                      <div
                        key={index}
                        className={`
                                            group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border transition-all duration-200
                                            ${isActive
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900'
                            : 'bg-card  hover:border-accent'
                          }
                                        `}
                      >
                        <div className={`p-2 rounded-full shrink-0 ${isActive ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                          {isActive ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold ${isActive ? 'text-green-800 dark:text-green-300' : 'text-foreground'}`}>
                              {action.title}
                            </h4>
                            <Badge variant={action.priority === 'High' ? 'destructive' : 'secondary'} className="text-[10px] h-5 w-[fit-content]">
                              {action.priority} Priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {action.description}
                          </p>
                        </div>

                        {/* <Button
                          variant={isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleAction(index)}
                          className={`
                                                shrink-0 min-w-[100px] transition-all
                                                ${isActive
                              ? 'text-green-600 border-green-200 hover:bg-green-100 hover:text-green-700'
                              : ''
                            }
                                            `}
                        >
                          {isActive ? 'Active' : 'Activate'}
                        </Button> */}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleCloseModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- 5. POPUP MODAL (DIALOG) - DEEP ANALYTICS --- */}
        <Dialog open={!!selectedAnalyticsEmployee} onOpenChange={(open) => !open && handleCloseAnalyticsModal()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Activity className="w-5 h-5 text-primary" />
                Deep Sentiment Analytics
              </DialogTitle>
              <DialogDescription>
                Detailed psychometric and cultural dimension analysis for <strong>{selectedAnalyticsEmployee?.Employee_ID}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {selectedAnalyticsEmployee && (
                <DeepSentimentAnalytics employeeId={selectedAnalyticsEmployee.Employee_ID} />
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleCloseAnalyticsModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default Hotspots;