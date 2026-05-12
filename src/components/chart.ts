import { Chart, registerables } from 'chart.js';

let registered = false;

export function registerCharts() {
    if (registered) return;
    Chart.register(...registerables);

    Chart.defaults.color = '#8b8d96';
    Chart.defaults.borderColor = '#282b36';
    Chart.defaults.font.family = "'Work Sans', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    const legendDefaults = Chart.defaults.plugins.legend as any;
    legendDefaults.labels.color = '#8b8d96';
    legendDefaults.labels.font = { family: "'Work Sans', system-ui, sans-serif", size: 12 };
    legendDefaults.labels.usePointStyle = true;
    legendDefaults.labels.pointStyleWidth = 10;

    registered = true;
}

export function winRateYAxis() {
    return {
        min: -5,
        max: 105,
        title: {
            display: true,
            text: 'Win rate (%)',
            color: '#8b8d96',
        },
        afterBuildTicks: (axis: any) => {
            axis.ticks = [
                { value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
            ];
        },
        ticks: {
            callback: (value: any) => value + '%',
        },
        grid: {
            color: 'rgba(255, 255, 255, 0.06)',
        },
    };
}

export function baseChartOptions(overrides?: Record<string, unknown>) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.06)',
                },
                ticks: {
                    color: '#8b8d96',
                },
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.06)',
                },
                ticks: {
                    color: '#8b8d96',
                },
            },
        },
        ...overrides,
    };
}
