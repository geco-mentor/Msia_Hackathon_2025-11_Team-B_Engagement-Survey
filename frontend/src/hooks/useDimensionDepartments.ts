import { useState, useEffect, useCallback } from 'react';

// API Response Types
interface DepartmentMetric {
    department_id: string;
    department_name: string;
    Dim_Enablement?: number;
    Dim_ESG?: number;
    Dim_Delight_Customer?: number;
    Dim_Development?: number;
    Dim_Culture_Values?: number;
    Dim_Company_Confidence?: number;
    Dim_Leadership?: number;
    Dim_Employee_Engagement?: number;
    engagement_rate?: number;
    attrition_rate?: number;
    stress_rate?: number;
    overall_risk?: string; // e.g., "critical", "warning"
    metrics_updated_at?: string;
}

interface ApiResponse {
    success: boolean;
    category: string;
    data: DepartmentMetric[];
}

// UI Data Shape
export interface DepartmentRiskProfile {
    id: string;
    name: string;
    size: number; // Not in API, defaulting to dummy or 0
    riskLevel: 'Critical' | 'Warning' | 'Healthy' | 'Unknown';
    stressScore: number;
    attritionRate: number;
    reasoning: string;
    recommendation: string;
}

const MOCK_DEPTS = [
    {
        "Dim_Enablement": 3.39,
        "engagement_rate": 73.77,
        "Dim_ESG": 4.03,
        "attrition_rate": 35.92,
        "department_name": "Operations",
        "Dim_Delight_Customer": 4.14,
        "Dim_Development": 3.61,
        "department_id": "DEPT001",
        "Dim_Culture_Values": 3.95,
        "Dim_Company_Confidence": 3.7,
        "Dim_Leadership": 3.87,
        "stress_rate": 33.26,
        "metrics_updated_at": "2025-12-10T09:06:34.099639",
        "Dim_Employee_Engagement": 3.95,
        "total_members": 71,
        "risk_labels": {
            "engagement_risk": "watch",
            "attrition_risk": "warning",
            "stress_risk": "watch"
        },
        "ai_analysis": {
            "diagnosis": {
                "Operations Department": "Burnout, low morale, and inadequate infrastructure are evident in the Operations department.",
                "Key Issues": [
                    "High stress levels among employees",
                    "Inadequate allowance structure for rural areas",
                    "Poor working conditions and safety concerns"
                ]
            },
            "recommendation": {
                "Short-term Action Plan": "Implement flexible work hours, review and adjust allowance structures, and improve lighting in industrial areas.",
                "Long-term Solution": "Invest in training programs to enhance employee well-being, develop a comprehensive safety plan, and explore alternative parking solutions for KLIA sort center"
            }
        }
    },
    {
        "Dim_Enablement": 4.0,
        "engagement_rate": 87.5,
        "Dim_ESG": 4.25,
        "attrition_rate": 28.12,
        "department_name": "Admin",
        "Dim_Delight_Customer": 4.25,
        "Dim_Development": 4.12,
        "department_id": "DEPT012",
        "Dim_Culture_Values": 4.62,
        "Dim_Company_Confidence": 4.0,
        "Dim_Leadership": 4.38,
        "stress_rate": 17.18,
        "metrics_updated_at": "2025-12-10T09:06:33.001034",
        "Dim_Employee_Engagement": 4.5,
        "total_members": 4,
        "risk_labels": {
            "engagement_risk": "healthy",
            "attrition_risk": "watch",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": "The Admin department is experiencing high attrition rates, indicating low job satisfaction. Engagement rate is relatively good, but stress levels are concerning. The recent feedback highlights issues with outdated systems, inadequate workload management, and safety hazards.",
            "recommendation": "Implement a modern admin system, provide training for employees to manage workloads effectively, and address maintenance of facilities to improve employee well-being."
        }
    },
    {
        "department_id": "DEPT002",
        "department_name": "Sales",
        "total_members": 0,
        "risk_labels": {
            "engagement_risk": "critical",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": {
                "sales department appears to be in a stagnant state, with no notable improvements in engagement rate, attrition rate, stress rate, leadership score, or enablement score. Lack of recent qualitative feedback from employees suggests a possible disconnect between management and team members.": null
            },
            "recommendation": {
                "Conduct an employee feedback session to understand the root causes of the stagnant state and gather insights for improvement. Develop a comprehensive action plan to enhance leadership, enablement, and overall sales performance.": null
            }
        }
    },
    {
        "Dim_Enablement": 3.5,
        "engagement_rate": 62.5,
        "Dim_ESG": 3.0,
        "attrition_rate": 50.0,
        "department_name": "Legal",
        "Dim_Delight_Customer": 4.0,
        "Dim_Development": 3.0,
        "department_id": "DEPT011",
        "Dim_Culture_Values": 4.0,
        "Dim_Company_Confidence": 3.0,
        "Dim_Leadership": 3.0,
        "stress_rate": 31.2,
        "overall_risk": "critical",
        "metrics_updated_at": "2025-12-10T09:06:33.727435",
        "Dim_Employee_Engagement": 3.5,
        "total_members": 2,
        "risk_labels": {
            "engagement_risk": "warning",
            "attrition_risk": "warning",
            "stress_risk": "watch"
        },
        "ai_analysis": {
            "diagnosis": "The legal department is facing low engagement, high stress levels, and inadequate leadership support, resulting in a high attrition rate and long queue for contract reviews.",
            "recommendation": {
                "Improve Work Environment": "Address understaffing and provide more resources for compliance training to boost employee morale and productivity.",
                "Develop Leadership Skills": "Provide regular coaching and feedback to enhance leadership score, promoting a culture of empowerment and support within the department."
            }
        }
    },
    {
        "Dim_Enablement": 4.27,
        "engagement_rate": 80.68,
        "Dim_ESG": 3.91,
        "attrition_rate": 14.77,
        "department_name": "Digital",
        "Dim_Delight_Customer": 4.55,
        "Dim_Development": 4.36,
        "department_id": "DEPT009",
        "Dim_Culture_Values": 4.32,
        "Dim_Company_Confidence": 4.36,
        "Dim_Leadership": 4.32,
        "stress_rate": 17.6,
        "metrics_updated_at": "2025-12-10T09:06:33.180022",
        "Dim_Employee_Engagement": 4.23,
        "total_members": 11,
        "risk_labels": {
            "engagement_risk": "healthy",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": {
                "Engagement Rate": "Above average (80.68%), indicating employee satisfaction.",
                "Attrition Rate": "Moderate (14.77%), suggesting room for improvement in job retention.",
                "Stress Rate": "Higher than desired (17.6%), highlighting the need to address stressors."
            },
            "recommendation": {
                "Address Technical Issues": "Investigate and resolve customer support system lag, network connectivity issues, and printer problems.",
                "Enhance Digital Tools": "Provide new laptops for digital team members and improve Wi-Fi connectivity on the 4th floor.",
                "Improve Work Environment": "Adjust data entry tasks to increase satisfaction and consider upgrading air conditioning."
            }
        }
    },
    {
        "department_id": "DEPT007",
        "department_name": "Product",
        "total_members": 0,
        "risk_labels": {
            "engagement_risk": "critical",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": "Product department is facing severe employee disengagement, attrition, stress, and inadequate leadership and enablement.",
            "recommendation": "Conduct a thorough qualitative feedback session to gather insights on the root causes. Develop a comprehensive improvement plan addressing leadership skills development, task clarity, and employee engagement strategies."
        }
    },
    {
        "department_id": "DEPT006",
        "department_name": "IT",
        "total_members": 0,
        "risk_labels": {
            "engagement_risk": "critical",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": "Current IT department shows extremely low engagement, attrition, stress levels, leadership score, and enablement score, indicating a severe crisis situation.",
            "recommendation": "Conduct an in-depth qualitative analysis of recent employee feedback to understand root causes. Implement regular check-ins with the team, provide targeted training on work-life balance and stress management, and establish clear communication channels for addressing concerns."
        }
    },
    {
        "Dim_Enablement": 2.83,
        "engagement_rate": 66.67,
        "Dim_ESG": 3.0,
        "attrition_rate": 50.0,
        "department_name": "Procurement",
        "Dim_Delight_Customer": 4.0,
        "Dim_Development": 3.0,
        "department_id": "DEPT010",
        "Dim_Culture_Values": 3.67,
        "Dim_Company_Confidence": 3.67,
        "Dim_Leadership": 3.33,
        "stress_rate": 43.73,
        "metrics_updated_at": "2025-12-10T09:06:34.281179",
        "Dim_Employee_Engagement": 3.67,
        "total_members": 3,
        "risk_labels": {
            "engagement_risk": "watch",
            "attrition_risk": "warning",
            "stress_risk": "warning"
        },
        "ai_analysis": {
            "diagnosis": "The Procurement department is facing challenges in operational efficiency, employee engagement, and leadership effectiveness. The high attrition rate and stress levels indicate a need for significant improvements.",
            "recommendation": {
                "actions": [
                    "Implement just-in-time inventory management for uniforms to reduce stockouts",
                    "Streamline purchasing approvals to minimize delays",
                    "Provide regular training and enablement to enhance leader and team skills"
                ],
                "key performance indicators": [
                    "Monitor and track key metrics such as engagement rate, attrition rate, stress rate, leadership score, and enablement score"
                ]
            }
        }
    },
    {
        "Dim_Enablement": 4.0,
        "engagement_rate": 75.0,
        "Dim_ESG": 4.0,
        "attrition_rate": 25.0,
        "department_name": "Marketing",
        "Dim_Delight_Customer": 5.0,
        "Dim_Development": 4.0,
        "department_id": "DEPT003",
        "Dim_Culture_Values": 4.0,
        "Dim_Company_Confidence": 4.0,
        "Dim_Leadership": 4.0,
        "stress_rate": 25.0,
        "metrics_updated_at": "2025-12-10T09:06:33.921305",
        "Dim_Employee_Engagement": 4.0,
        "total_members": 1,
        "risk_labels": {
            "engagement_risk": "watch",
            "attrition_risk": "watch",
            "stress_risk": "watch"
        },
        "ai_analysis": {
            "diagnosis": "Marketing department has high engagement rate but struggles with stress (25.0%) and attrition rate (25.0%). Leadership score is average at 4.0, while enablement score also averages at 4.0.",
            "recommendation": "Improve employee well-being by addressing stress concerns, providing training on leadership and enablement to boost confidence and productivity."
        }
    },
    {
        "Dim_Enablement": 3.75,
        "engagement_rate": 68.75,
        "Dim_ESG": 3.5,
        "attrition_rate": 37.5,
        "department_name": "Finance",
        "Dim_Delight_Customer": 4.0,
        "Dim_Development": 3.5,
        "department_id": "DEPT005",
        "Dim_Culture_Values": 4.0,
        "Dim_Company_Confidence": 3.5,
        "Dim_Leadership": 3.5,
        "stress_rate": 28.1,
        "metrics_updated_at": "2025-12-10T09:06:33.365079",
        "Dim_Employee_Engagement": 3.75,
        "total_members": 2,
        "risk_labels": {
            "engagement_risk": "watch",
            "attrition_risk": "warning",
            "stress_risk": "watch"
        },
        "ai_analysis": {
            "diagnosis": {
                "Financial Stress": "High stress rates (28.1%) indicate financial pressure on Finance staff.",
                "Process Issues": "Slow medical claim approval process (recent feedback) may contribute to low engagement rate (68.75%).",
                "Leadership Gaps": "Low leadership score (3.5) and enablement score (3.75) suggest room for improvement in departmental management."
            },
            "recommendation": {
                "Improve Process Efficiency": "Optimize medical claim approval process to reduce wait times and increase staff satisfaction.",
                "Enhance Leadership & Enablement": "Provide training and development opportunities to boost leadership skills and enhance enablement, addressing gaps in departmental management."
            }
        }
    },
    {
        "Dim_Enablement": 4.75,
        "engagement_rate": 97.92,
        "Dim_ESG": 4.83,
        "attrition_rate": 6.25,
        "department_name": "HR",
        "Dim_Delight_Customer": 4.83,
        "Dim_Development": 4.83,
        "department_id": "DEPT004",
        "Dim_Culture_Values": 5.0,
        "Dim_Company_Confidence": 4.83,
        "Dim_Leadership": 4.83,
        "stress_rate": 3.12,
        "metrics_updated_at": "2025-12-10T09:06:33.547977",
        "Dim_Employee_Engagement": 4.92,
        "total_members": 6,
        "risk_labels": {
            "engagement_risk": "healthy",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": "The HR department is performing well in engagement and enablement, but struggles with high attrition rates (6.25%) and stress levels (3.12%). Leadership score (4.83) and panel clinic benefit are notable strengths.",
            "recommendation": "Improve rider recruitment process to reduce turnover rate in Kuala Lumpur; invest in employee development programs to address stress and enhance retention."
        }
    },
    {
        "department_id": "DEPT008",
        "department_name": "Customer Support",
        "total_members": 0,
        "risk_labels": {
            "engagement_risk": "critical",
            "attrition_risk": "healthy",
            "stress_risk": "healthy"
        },
        "ai_analysis": {
            "diagnosis": "The Customer Support department is facing a critical issue with employee engagement, attrition, stress, leadership, and enablement. The lack of qualitative feedback from employees indicates a significant disconnect between their experiences and the organization's expectations.",
            "recommendation": "Implement regular pulse checks to gauge employee sentiment, provide training on effective communication and problem-solving skills, and enhance leadership development programs to improve overall department performance."
        }
    }
]


const API_BASE_URL = import.meta.env.BACKEND_API || 'http://localhost:8000/api/v1';

export const useDepartmentRisks = () => {
    const [departments, setDepartments] = useState<DepartmentRiskProfile[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        try {
            // const res = await fetch(`${API_BASE_URL}/departments`);
            // const json = await res.json();

            // SIMULATING NETWORK DELAY
            // await new Promise(resolve => setTimeout(resolve, 600));

            // PROVIDED MOCK DATA
            const data = MOCK_DEPTS;

            const processedData = data
                .filter(dept => dept.stress_rate !== undefined)
                .map(dept => {
                    // 1. Determine Risk Level (use backend if provided)
                    let risk: DepartmentRiskProfile['riskLevel'] = 'Healthy';

                    if (dept.overall_risk) {
                        // use backend aggregate risk if provided
                        const map = {
                            critical: 'Critical',
                            warning: 'Warning',
                            watch: 'Warning', // if backend uses "watch"
                            healthy: 'Healthy'
                        } as const;

                        risk = map[dept.overall_risk] ?? 'Healthy';
                    } else if (dept.risk_labels) {
                        // derive from risk_labels
                        const r = dept.risk_labels;
                        if (r.stress_risk === 'critical' || r.attrition_risk === 'critical') risk = 'Critical';
                        else if (r.stress_risk === 'warning' || r.attrition_risk === 'warning') risk = 'Warning';
                    } else {
                        // fallback calculation
                        const stress = dept.stress_rate || 0;
                        const attrition = dept.attrition_rate || 0;
                        if (stress > 30 || attrition > 30) risk = 'Critical';
                        else if (stress > 15 || attrition > 15) risk = 'Warning';
                    }

                    // 2. Extract dimensions (Dim_* values)
                    const dimensions = Object.entries(dept)
                        .filter(([key]) => key.startsWith("Dim_"))
                        .map(([key, val]) => ({
                            name: key.replace("Dim_", "").replace(/_/g, " "),
                            val: val as number
                        }));

                    const lowestDim = dimensions.sort((a, b) => a.val - b.val)[0];

                    // 3. Reasoning (if AI provides, use theirs)
                    let reasoning = "";

                    if (dept.ai_analysis?.diagnosis) {
                        reasoning = Object.entries(dept.ai_analysis.diagnosis)
                            .map(([title, desc]) => `• **${title}** – ${desc}`)
                            .join("\n");
                    } else {
                        reasoning = `Detected ${(dept.stress_rate || 0).toFixed(1)}% stress and ${(dept.attrition_rate || 0).toFixed(1)}% attrition.` +
                            (lowestDim ? ` Lowest score in ${lowestDim.name} (${lowestDim.val}).` : "");
                    }

                    // 4. Recommendation (if AI provides, use theirs)
                    let recommendation = "";

                    if (dept.ai_analysis?.recommendation) {
                        recommendation = Object.entries(dept.ai_analysis.recommendation)
                            .map(([title, desc]) => `• **${title}** – ${desc}`)
                            .join("\n");
                    } else {
                        recommendation = lowestDim
                            ? `Improve ${lowestDim.name} and balance workload to reduce stress.`
                            : "Monitor ongoing metrics for updates.";
                    }

                    // 5. Final output format
                    return {
                        id: dept.department_id,
                        name: dept.department_name,
                        size: dept.total_members ?? 0,          // NEW: use real headcount
                        riskLevel: risk,
                        stressScore: dept.stress_rate || 0,
                        attritionRate: dept.attrition_rate || 0,
                        reasoning,
                        recommendation
                    };
                });


            // Sort Critical first
            processedData.sort((a, b) => {
                const priority = { Critical: 3, Warning: 2, Healthy: 1, Unknown: 0 };
                return priority[b.riskLevel] - priority[a.riskLevel];
            });

            setDepartments(processedData);

        } catch (error) {
            console.error("Failed to fetch department risks", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    return { departments, loadingDepartments: loading };
};