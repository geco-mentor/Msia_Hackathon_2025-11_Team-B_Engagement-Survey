import React from 'react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip
} from 'recharts';
import { Card } from '@/components/mockup/Card';
import { useDimension } from '@/hooks/useDimension';

interface DeepSentimentAnalyticsProps {
    employeeId: string;
}

export const DeepSentimentAnalytics: React.FC<DeepSentimentAnalyticsProps> = ({ employeeId }) => {
    const { radarData, rankedDimensions, loading } = useDimension(employeeId);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={`Cultural Dimensions (Pulse Analysis) - ${employeeId}`} className="min-h-[400px]">
                    <div className="h-[320px] w-full relative">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                Loading Metrics...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid gridType="polygon" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 600 }}
                                    />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
                                    <Radar
                                        name="Score"
                                        dataKey="score"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={3}
                                        fill="hsl(var(--primary))"
                                        fillOpacity={0.1}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Scale</span>
                            <span className="text-xs text-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border">1.0 - 5.0</span>
                        </div>
                    </div>
                </Card>

                <Card title="Dimension Breakdown">
                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-10 text-center text-muted-foreground">Loading Breakdown...</div>
                        ) : (
                            <div className="space-y-3">
                                {rankedDimensions.map((dim, index) => (
                                    <div key={dim.fullKey} className="bg-muted/30 p-3 rounded-lg border border-border flex items-center justify-between hover:border-primary/50 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-foreground text-background shadow-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{dim.subject}</p>
                                                <div className="w-24 md:w-32 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${dim.score >= 4.5 ? 'bg-risk-healthy' : dim.score >= 3.0 ? 'bg-risk-warning' : 'bg-risk-critical'
                                                            }`}
                                                        style={{ width: `${(dim.score / 5) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-foreground">{dim.score.toFixed(1)}</span>
                                            <span className="text-xs text-muted-foreground block">/ 5.0</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
