import { Chart, registerables } from 'chart.js';

export function registerCharts() {
    Chart.register(...registerables);
}

export function winRateYAxis() {
    return {
        min: -5,
        max: 105,
        title: {
            display: true,
            text: 'Win rate (%)',
        },
        afterBuildTicks: (axis: any) => {
            axis.ticks = [
                { value: 0 }, { value: 25 }, { value: 50 }, { value: 75 }, { value: 100 },
            ];
        },
        ticks: {
            callback: (value: any) => value + '%',
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
        ...overrides,
    };
}
