
import { useMemo, useState } from 'react';
import { MERGED_DATA, SURVEY_DIMENSION_MAPPING } from '../constants';

export const useAnalytics = () => {
    const [selectedDivision, setSelectedDivision] = useState('all');
    const [selectedRiskTeam, setSelectedRiskTeam] = useState<string | null>(null);

    const analytics = useMemo(() => {
        let data = MERGED_DATA;
        if (selectedDivision !== 'all') {
            data = data.filter(d => d.Division === selectedDivision);
        }

        const totalEmployees = data.length;

        // 1. KPI Calculations
        const attritionCount = data.filter(d =>
            (d.SentimentScore < 0.3) &&
            (d.MoodTag === 'Stressed' || d.DailyStressScore > 4)
        ).length;

        const attritionRate = totalEmployees > 0 ? Math.round((attritionCount / totalEmployees) * 100) : 0;

        const burnoutCount = data.filter(d => d.DailyStressScore > 4).length;
        const burnoutRate = totalEmployees > 0 ? Math.round((burnoutCount / totalEmployees) * 100) : 0;

        const avgSentiment = data.reduce((acc, curr) => acc + (curr.SentimentScore || 0), 0) / (totalEmployees || 1);
        const avgSentimentPct = Math.round(avgSentiment * 100);

        // Risk Distribution Data (Gauge)
        const highRisk = burnoutCount;
        const lowRisk = totalEmployees - highRisk;
        const riskData = [
            { name: 'Safe', value: lowRisk },
            { name: 'Risk', value: highRisk },
        ];

        // Deep Analytics: Teams at Risk Logic
        const teamRisks = Array.from(new Set(MERGED_DATA.map(d => d.Division))).map(div => {
            const teamEmployees = MERGED_DATA.filter(d => d.Division === div);
            const teamSize = teamEmployees.length;
            const teamBurnout = teamEmployees.filter(d => d.DailyStressScore > 3.5).length;
            const teamSentiment = teamEmployees.reduce((a, b) => a + b.SentimentScore, 0) / teamSize;

            let riskLevel = 'Low';
            let reasoning = 'Stable metrics.';
            let recommendation = 'Maintain current cadence.';

            if (teamSentiment < 0.3 || (teamBurnout / teamSize) > 0.4) {
                riskLevel = 'High';
            } else if (teamSentiment < 0.5 || (teamBurnout / teamSize) > 0.25) {
                riskLevel = 'Moderate';
            }

            if (riskLevel === 'High') {
                if (teamEmployees.some(d => d.WorkloadEvents > 6)) {
                    reasoning = 'Severe workload saturation detected combined with low sentiment.';
                    recommendation = 'Immediate workload audit required. Enforce "No-Meeting Fridays" to allow catch-up time.';
                } else {
                    reasoning = 'Disconnect between effort and recognition. Sentiment is plummeting despite manageable workload.';
                    recommendation = 'Schedule "Skip-level" meetings to listen to concerns directly. Focus on recognition programs.';
                }
            } else if (riskLevel === 'Moderate') {
                reasoning = 'Early signs of fatigue. Sentiment is trending downwards week-over-week.';
                recommendation = 'Organize a non-work related team bonding activity to reset morale.';
            }

            return {
                name: div,
                size: teamSize,
                riskLevel,
                avgSentiment: Math.round(teamSentiment * 100),
                burnoutPct: Math.round((teamBurnout / teamSize) * 100),
                reasoning,
                recommendation
            };
        }).sort((a, b) => (a.riskLevel === 'High' ? -1 : 1)); // High risk first

        // Filter Drill Down Data
        const drillDownData = selectedRiskTeam
            ? MERGED_DATA.filter(d => d.Division === selectedRiskTeam)
            : MERGED_DATA;

        // --- SURVEY DIMENSION CALCULATIONS ---
        const dimensionScores: Record<string, { total: number; count: number }> = {};

        // Initialize mapping
        Object.values(SURVEY_DIMENSION_MAPPING).forEach(d => {
            dimensionScores[d] = { total: 0, count: 0 };
        });

        // Aggregate scores from drillDownData (or global data if no team selected)
        drillDownData.forEach(emp => {
            Object.entries(SURVEY_DIMENSION_MAPPING).forEach(([qKey, dimension]) => {
                const score = emp[qKey];
                if (typeof score === 'number' && !isNaN(score)) {
                    dimensionScores[dimension].total += score;
                    dimensionScores[dimension].count += 1;
                }
            });
        });

        // Format for Radar Chart
        const radarData = Object.entries(dimensionScores)
            .map(([dim, data]) => ({
                subject: dim,
                score: data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0,
                fullMark: 5
            }));

        const rankedDimensions = [...radarData].sort((a, b) => b.score - a.score);

        return {
            kpi: { attritionRate, burnoutRate, avgSentimentPct, totalEmployees },
            riskData,
            teamRisks,
            drillDownData,
            radarData,
            rankedDimensions
        };

    }, [selectedDivision, selectedRiskTeam]);

    const divisions = Array.from(new Set(MERGED_DATA.map(d => d.Division)));

    return {
        analytics,
        divisions,
        selectedDivision,
        setSelectedDivision,
        selectedRiskTeam,
        setSelectedRiskTeam
    };
};
