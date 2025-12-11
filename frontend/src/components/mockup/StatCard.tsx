
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subValue,
    icon: Icon,
    trend,
    trendValue,
    color = 'blue'
}) => {
    // Using theme tokens where possible, or tailwind colors that match the 'risk' palette
    const colorStyles = {
        blue: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
        red: { bg: 'bg-risk-critical-bg', text: 'text-risk-critical', border: 'border-risk-critical/20' },
        green: { bg: 'bg-risk-healthy-bg', text: 'text-risk-healthy', border: 'border-risk-healthy/20' },
        yellow: { bg: 'bg-risk-warning-bg', text: 'text-risk-warning', border: 'border-risk-warning/20' },
        purple: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/20' },
    };

    const selectedColor = colorStyles[color];

    return (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/20 transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${selectedColor.bg} ${selectedColor.text} shadow-inner`}>
                    <Icon size={22} />
                </div>
                {(subValue || trendValue) && (
                    <div className="flex items-center text-xs bg-muted px-2 py-1 rounded-lg border border-border">
                        {trendValue && (
                            <span className={`font-semibold ${trend === 'up' ? 'text-risk-healthy' :
                                    trend === 'down' ? 'text-risk-critical' : 'text-muted-foreground'
                                }`}>
                                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div>
                <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
                <h4 className="text-3xl font-bold text-foreground tracking-tight">{value}</h4>
                {subValue && <span className="text-muted-foreground text-xs mt-1 block font-medium">{subValue}</span>}
            </div>
        </div>
    );
};
