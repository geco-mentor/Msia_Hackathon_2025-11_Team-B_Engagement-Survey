
import { MergedEmployeeData, SankeyNode, SankeyLink } from './types/mockData';

// --- CSV DATA (Embedded for single-file portability as requested) ---

export const HRIS_CSV = `EmployeeID,Name,JobGrade,Position,Age,NoOfYearsService,Gender,Location,EmployeeLevel,Division,UnionMembership,WorkMode
E001,Ahmad Bin Ali,JG4,Postal Officer,45,15,Male,Kuala Lumpur,Non-Exec,Operations,Yes,On-Site
E002,Siti Sarah,JG3,Customer Service Exec,28,4,Female,Selangor,Exec,Customer Service,No,Hybrid
E003,Tan Wei Ming,JG5,Logistics Manager,52,22,Male,Penang,Manager,Logistics,No,On-Site
E004,Muthu Sami,JG2,Driver,35,8,Male,Johor,Non-Exec,Logistics,Yes,On-Site
E005,Wong Mei Ling,JG4,HR Analyst,31,6,Female,Kuala Lumpur,Exec,HR,No,Hybrid
E006,Ryla Rozita,JG3,Sorter,24,2,Female,Sabah,Non-Exec,Operations,Yes,On-Site
`;

// HELPER: Simple CSV Parser
export const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        // Handle potential quoted fields if necessary (basic split for now based on sample)
        const values = line.split(',');
        const entry: any = {};

        headers.forEach((header, index) => {
            const value = values[index]?.trim();
            // Try to convert to number if possible, else keep string
            const numValue = Number(value);
            entry[header] = !isNaN(numValue) && value !== '' ? numValue : value;
        });
        return entry;
    });
};

// --- MOCK DATA LOADING ---
const generateMockMergedData = (): MergedEmployeeData[] => {
    const divisions = ['Operations', 'Customer Service', 'Logistics', 'HR', 'Digital'];
    const data: MergedEmployeeData[] = [];

    for (let i = 1; i <= 50; i++) {
        const div = divisions[Math.floor(Math.random() * divisions.length)];
        data.push({
            EmployeeID: `E${100 + i}`,
            Name: `Employee ${i}`,
            JobGrade: `JG${Math.floor(Math.random() * 5) + 1}`,
            Position: 'Staff',
            Age: 25 + Math.floor(Math.random() * 30),
            NoOfYearsService: 1 + Math.floor(Math.random() * 20),
            Gender: Math.random() > 0.5 ? 'Male' : 'Female',
            Location: 'Kuala Lumpur',
            EmployeeLevel: 'Exec',
            Division: div,
            UnionMembership: Math.random() > 0.7 ? 'Yes' : 'No',
            WorkMode: 'Hybrid',
            DailyStressScore: 1 + Math.random() * 5, // 1-6
            AppCheckins: Math.floor(Math.random() * 20),
            MoodTag: Math.random() > 0.7 ? 'Stressed' : 'Neutral',
            MicrolearningUsage_MinPerWeek: Math.floor(Math.random() * 60),
            WorkloadEvents: Math.floor(Math.random() * 10),
            FreeText_Feedback: "Workload is increasing recently...",
            SentimentScore: Math.random(), // 0-1
            RespectRadar: Math.random() * 5,
            BurnoutShield: Math.random() * 5,
            FeedbackLoop: Math.random() * 5,
            BrandIntegrity: Math.random() * 5,
        });

        // Add random Q01-Q30 scores
        for (let q = 1; q <= 30; q++) {
            const key = `Q${q.toString().padStart(2, '0')}`;
            data[data.length - 1][key] = Math.floor(Math.random() * 5) + 1;
        }
    }
    return data;
};

export const MERGED_DATA: MergedEmployeeData[] = generateMockMergedData();

// Maps Questions Q01-Q30 to Categories/Dimensions based on screenshots
export const SURVEY_DIMENSION_MAPPING: Record<string, string> = {
    Q01: "Employee Engagement",
    Q02: "Leadership",
    Q03: "Enablement",
    Q04: "Development",
    Q05: "Delight Customer",
    Q06: "Company Confidence",
    Q07: "Culture and Values",
    Q08: "ESG",
    Q09: "Employee Engagement",
    Q10: "Leadership",
    Q11: "Enablement",
    Q12: "Development",
    Q13: "Delight Customer",
    Q14: "Company Confidence",
    Q15: "Culture and Values",
    Q16: "ESG",
    Q17: "Employee Engagement",
    Q18: "Leadership",
    Q19: "Enablement",
    Q20: "Delight Customer",
    Q21: "Culture and Values",
    Q22: "Employee Engagement",
    Q23: "Employee Engagement",
    Q24: "Leadership",
    Q25: "Employee Engagement",
    Q26: "Employee Engagement",
    Q27: "Delight Customer",
    Q28: "Employee Engagement",
    Q29: "Employee Engagement",
    Q30: "Leadership",
};

export const INTERVENTION_PLAYBOOK = [
    { id: 1, title: 'Deep Work Wednesday', trigger: 'High Fragmentation', category: 'Productivity', status: 'Active', action: 'Block 2h for core tasks' },
    { id: 2, title: 'No-Agenda Coffee', trigger: 'Low Connection', category: 'Culture', status: 'Pending', action: 'Schedule 15m team catchup' },
    { id: 3, title: 'Workload Audit', trigger: 'Sustained Overtime', category: 'Burnout', status: 'Proposed', action: 'Review task distribution' },
];

export const HEATMAP_DATA = [
    { season: 'Q1 (Jan-Mar)', operations: 45, cs: 30, logistics: 80, hr: 20 },
    { season: 'Q2 (Apr-Jun)', operations: 55, cs: 35, logistics: 60, hr: 25 },
    { season: 'Q3 (Jul-Sep)', operations: 85, cs: 60, logistics: 40, hr: 30 }, // Peak
    { season: 'Q4 (Oct-Dec)', operations: 70, cs: 50, logistics: 90, hr: 45 }, // Peak
];

export const DRIVERS_DATA = [
    { name: 'Neutral', value: 60, fill: 'hsl(var(--chart-1))' }, // Blue
    { name: 'Stressed', value: 102, fill: 'hsl(var(--risk-critical))' }, // Red
    { name: 'Overwhelmed', value: 104, fill: 'hsl(var(--risk-critical))' }, // Red
];

export const SANKEY_DATA = {
    nodes: [
        { name: 'High Workload', fill: 'hsl(var(--risk-critical))' },
        { name: 'Low Recognition', fill: 'hsl(var(--risk-warning))' },
        { name: 'Isolation', fill: 'hsl(var(--risk-warning))' },
        { name: 'Burnout Risk', fill: 'hsl(var(--risk-critical))' },
        { name: 'Attrition Risk', fill: 'hsl(var(--risk-critical))' },
        { name: 'Intervention: Audit', fill: 'hsl(var(--risk-healthy))' },
        { name: 'Intervention: Bonding', fill: 'hsl(var(--risk-healthy))' },
    ],
    links: [
        { source: 0, target: 3, value: 50 },
        { source: 1, target: 4, value: 30 },
        { source: 2, target: 4, value: 20 },
        { source: 3, target: 5, value: 40 },
        { source: 4, target: 6, value: 25 },
    ]
};
