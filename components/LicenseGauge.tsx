import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';

const getStatusColor = (percentage: number): 'primary' | 'warning' | 'danger' => {
    if (percentage <= 10) return 'danger';
    if (percentage <= 25) return 'warning';
    return 'primary';
};

const LicenseGauge: React.FC = () => {
    const { remainingTests, maxTests } = useContext(AppContext);
    const [animatedPercentage, setAnimatedPercentage] = useState(0);

    const percentage = maxTests > 0 ? Math.max(0, Math.min(100, (remainingTests / maxTests) * 100)) : 0;

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedPercentage(percentage), 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    const status = getStatusColor(animatedPercentage);
    
    // SVG properties
    const strokeWidth = 18;
    const radius = 50;
    const viewBoxSize = 120;
    const center = viewBoxSize / 2;
    const circumference = Math.PI * radius;
    const dashOffset = circumference - (animatedPercentage / 100) * circumference;

    const statusColors = {
        primary: 'rgb(var(--color-primary))',
        warning: '#f59e0b',
        danger: '#ef4444',
    };
    
    const color = statusColors[status];

    const glowStyle: React.CSSProperties = {
        '--glow-color': color,
    } as React.CSSProperties;

    const textClasses = [
        "font-extrabold text-4xl fill-current text-text-primary transition-colors duration-500"
    ];
    if (status === 'warning' || status === 'danger') {
        textClasses.push('animate-pulse');
    }

    return (
        <div className="w-20 h-auto" title={`${remainingTests} / ${maxTests}`}>
            <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize / 2 + 25}`} className="w-full h-auto overflow-visible">
                {/* Background track */}
                <path
                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                    strokeWidth={strokeWidth}
                    fill="none"
                    stroke="rgb(var(--color-surface-alt))"
                    strokeLinecap="round"
                />
                {/* Progress bar */}
                <path
                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="stroke-current transition-all duration-700 ease-out animate-pulse-glow"
                    style={{ ...glowStyle, color: color }}
                />
                {/* Center Text */}
                <text
                    x="50%"
                    y="55%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className={textClasses.join(' ')}
                >
                    {remainingTests}
                </text>
                {/* Min/Max Labels */}
                <text x={center - radius} y={center + 25} textAnchor="middle" className="text-sm font-semibold fill-current text-text-muted">
                    0
                </text>
                <text x={center + radius} y={center + 25} textAnchor="middle" className="text-sm font-semibold fill-current text-text-muted">
                    {maxTests}
                </text>
            </svg>
        </div>
    );
};

export default LicenseGauge;
