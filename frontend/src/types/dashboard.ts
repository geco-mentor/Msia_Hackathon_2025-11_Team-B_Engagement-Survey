// Risk levels are now derived from data logic, but we keep the type for UI consistency
export type RiskLevel = 'healthy' | 'watch' | 'warning' | 'critical';

export interface EmployeeHistoryRecord {
  Snapshot_Date: string;
  EmployeeID: string;
  Division: string;
  Season_Label: string;
  Monthly_Stress_Score: number;
  Workload_Volume: number;
}

export interface EmployeeData {
  id: string;
  division: string;
  currentStress: number;
  currentWorkload: number;
  averageStress: number;
  averageWorkload: number;
  riskLevel: RiskLevel;
  trend: 'up' | 'down' | 'stable';
  history: EmployeeHistoryRecord[];
}

export interface TeamRiskData {
  id: string;
  teamName: string;
  department: string;
  location: string;
  employeeCount: number;
  engagementScore: number;
  burnoutRisk: RiskLevel;
  attritionRisk: RiskLevel;
  overallRisk: RiskLevel;
  trend: 'up' | 'down' | 'stable';
  topDrivers: string[];
  lastUpdated: string;
}

export interface ThemeData {
  id: string;
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  frequency: number;
  trend: 'up' | 'down' | 'stable';
  impactScore: number;
}

export interface TrendDataPoint {
  date: string;
  engagement: number;
  burnout: number;
  attrition: number;
}

export interface MicroAction {
  id: string;
  title: string;
  description: string;
  category: 'workload' | 'recognition' | 'communication' | 'leadership' | 'wellbeing';
  targetIssue: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface Intervention {
  id: string;
  teamId: string;
  teamName: string;
  action: string;
  date: string;
  status: 'planned' | 'in-progress' | 'completed';
  outcome?: string;
  createdBy: string;
}

export interface DashboardFilters {
  department: string;
  location: string;
  riskLevel: RiskLevel | 'all';
  dateRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface SummaryMetrics {
  totalEmployees: number;
  teamsAtRisk: number;
  avgEngagement: number;
  engagementTrend: number;
  burnoutAlerts: number;
  attritionRiskCount: number;
  feedbackResponseRate: number;
}
