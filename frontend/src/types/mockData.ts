
export interface MergedEmployeeData {
    // HRIS Data
    EmployeeID: string;
    Name: string;
    JobGrade: string;
    Position: string;
    Age: number;
    NoOfYearsService: number;
    Gender: string;
    Location: string;
    EmployeeLevel: string;
    Division: string;
    UnionMembership: string;
    WorkMode: string;

    // App Data
    DailyStressScore: number;
    AppCheckins: number;
    MoodTag: string;
    MicrolearningUsage_MinPerWeek: number;
    WorkloadEvents: number;

    // Survey Data
    FreeText_Feedback: string;
    SentimentScore: number;
    RespectRadar: number;
    BurnoutShield: number;
    FeedbackLoop: number;
    BrandIntegrity: number;

    [key: string]: any; // Allow dynamic Q01-Q30 keys
}

export interface KPI {
    title: string;
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
    trendValue: string;
    subValue?: string;
}

export interface SankeyNode {
    name: string;
    fill?: string;
}

export interface SankeyLink {
    source: number;
    target: number;
    value: number;
}

export interface TenureMetric {
    year: number;
    retentionRate: number;
    avgSentiment: number;
}

export interface CulturePoint {
    dimension: string;
    score: number;
    benchmark: number;
}

export interface HeatmapPoint {
    id: string;
    x: string;
    y: string;
    value: number;
}
