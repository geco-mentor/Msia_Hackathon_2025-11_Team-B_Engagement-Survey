import React from 'react';
import {
    Zap, Shield, Activity, ArrowUpRight
} from 'lucide-react';
import {
    ResponsiveContainer, Sankey, Tooltip
} from 'recharts';

import { INTERVENTION_PLAYBOOK, SANKEY_DATA } from '@/constants';
import { Card } from '@/components/mockup/Card';
import { NudgePreview } from '@/components/mockup/NudgePreview';

export const InterventionAgent = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 mb-8">


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Risk Flow Chart */}
                <Card title="Risk-to-Action Flow" className="lg:col-span-2 min-h-[500px]">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={SANKEY_DATA}
                                node={({ x, y, width, height, index, payload }) => (
                                    <g>
                                        <rect x={x} y={y} width={width} height={height} fill={payload.fill || '#2B3990'} rx={4} />
                                        <text
                                            x={x > 200 ? x - 10 : x + width + 10}
                                            y={y + height / 2}
                                            dy={5}
                                            fontSize={12}
                                            textAnchor={x > 200 ? 'end' : 'start'}
                                            fill="currentColor"
                                            className="text-xs font-medium fill-muted-foreground"
                                        >
                                            {payload.name}
                                        </text>
                                    </g>
                                )}
                                nodePadding={50}
                                margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                                link={{ stroke: 'currentColor', strokeOpacity: 0.1, className: 'text-muted-foreground' }}
                            >
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--popover))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--popover-foreground))',
                                        borderRadius: '8px',
                                        opacity: 1,
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                />
                            </Sankey>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Right Column: Logic List */}
                <div className="space-y-6">
                    {/* Agent Logic List */}
                    <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Agent Logic</h3>
                        <div className="space-y-3">
                            {INTERVENTION_PLAYBOOK.map(play => (
                                <div key={play.id} className="bg-card border border-border p-3 rounded-lg flex justify-between items-center group hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${play.status === 'Active' ? 'bg-risk-healthy animate-pulse' : play.status === 'Pending' ? 'bg-muted-foreground' : 'bg-risk-warning'}`}></div>
                                            <p className="text-sm font-medium text-foreground">{play.title}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{play.trigger}</p>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${play.status === 'Active' ? 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/20' :
                                        play.status === 'Pending' ? 'bg-muted/10 text-muted-foreground border-border' :
                                            'bg-risk-warning-bg text-risk-warning border-risk-warning/20'
                                        }`}>
                                        {play.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom KPI Cards removed */}
        </div>
    );
};
