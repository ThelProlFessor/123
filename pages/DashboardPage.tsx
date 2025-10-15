import React, { useState, useContext, useMemo } from 'react';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AppContext } from '../contexts/AppContext';
import { ICONS } from '../constants';

const COLORS = {
  positive: '#ef4444', 
  negative: '#22c55e',
  total: 'rgb(var(--color-primary))'
};

type PresetDateRange = 'today' | '7d' | '30d' | 'all';
type DateRange = PresetDateRange | 'custom';

const DateRangeButton: React.FC<{ label: string; range: PresetDateRange; activeRange: DateRange; onClick: (range: PresetDateRange) => void; }> = 
  ({ label, range, activeRange, onClick }) => {
    const isActive = activeRange === range;
    const baseClasses = "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 transform active:scale-95";
    const activeClasses = "bg-primary text-white shadow-md";
    const inactiveClasses = "bg-transparent text-text-secondary hover:bg-surface";
    return <button onClick={() => onClick(range)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>{label}</button>;
};

const DashboardPage: React.FC = () => {
  const { theme, history, isHistoryLoading, t, language } = useContext(AppContext);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const themeColors = {
    grid: theme === 'light' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(100, 116, 139, 0.2)',
    axis: theme === 'light' ? '#475569' : '#94a3b8',
    legend: theme === 'light' ? '#334155' : '#cbd5e1',
    tooltipBg: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.8)',
    tooltipText: theme === 'light' ? '#0f172a' : '#f1f5f9',
  };

  const handlePresetClick = (range: PresetDateRange) => {
    setDateRange(range);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleCustomDateChange = (part: 'start' | 'end', value: string) => {
    let start = customStartDate;
    let end = customEndDate;
    if (part === 'start') {
        setCustomStartDate(value);
        start = value;
    } else {
        setCustomEndDate(value);
        end = value;
    }
    if (start && end) {
        setDateRange('custom');
    }
  };

  const filteredHistory = useMemo(() => {
    const now = new Date();
    
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      if (new Date(customStartDate) > new Date(customEndDate)) return [];
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return history.filter(record => {
        const recordDate = new Date(record.DateOfRecord);
        return recordDate >= start && recordDate <= end;
      });
    }
    
    let startDate = new Date(0); // Default for 'all'

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case '30d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        break;
    }

    if (dateRange !== 'all') {
      startDate.setHours(0, 0, 0, 0);
    }
    
    return history.filter(record => new Date(record.DateOfRecord) >= startDate);
  }, [history, dateRange, customStartDate, customEndDate]);

  const { lineChartData, kpiData, pieChartData } = useMemo(() => {
    const totalSamples = filteredHistory.length;
    const positiveSamples = filteredHistory.filter(r => r.HPVDetectionStatus === 'Detected').length;
    const negativeSamples = totalSamples - positiveSamples;

    const kpi = {
      total: totalSamples,
      positive: positiveSamples,
      negative: negativeSamples,
      positivityRate: totalSamples > 0 ? ((positiveSamples / totalSamples) * 100).toFixed(1) : '0.0',
    };

    const pie = [
      { name: t('dashboard.charts.positive'), value: positiveSamples },
      { name: t('dashboard.charts.negative'), value: negativeSamples },
    ];

    const locale = language === 'fa' ? 'fa-IR-u-nu-latn' : 'en-CA';
    // FIX: Explicitly type `groupedByDay` to ensure correct type inference for its values,
    // which resolves the issue with `unknown` type in the subsequent `sort` function.
    const groupedByDay: { [key: string]: { date: string, total: number, positive: number, negative: number, originalDate: Date } } = filteredHistory.reduce((acc, record) => {
      const date = new Date(record.DateOfRecord).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
      if (!acc[date]) {
        acc[date] = { date, total: 0, positive: 0, negative: 0, originalDate: new Date(record.DateOfRecord) };
      }
      acc[date].total++;
      if (record.HPVDetectionStatus === 'Detected') {
        acc[date].positive++;
      } else {
        acc[date].negative++;
      }
      return acc;
    }, {} as { [key: string]: { date: string, total: number, positive: number, negative: number, originalDate: Date } });
    
    const line = Object.values(groupedByDay).sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());

    return { lineChartData: line, kpiData: kpi, pieChartData: pie };
  }, [filteredHistory, t, language]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-lg shadow-lg border border-border" style={{ backgroundColor: themeColors.tooltipBg, color: themeColors.tooltipText }}>
          <p className="font-bold mb-1">{`${t('dashboard.charts.date')}: ${label}`}</p>
          <p style={{ color: COLORS.total }}>{`${t('dashboard.charts.totalSamples')}: ${payload[0].value}`}</p>
          <p style={{ color: COLORS.positive }}>{`${t('dashboard.charts.positiveResults')}: ${payload[1].value}`}</p>
          {payload[2] && <p style={{ color: COLORS.negative }}>{`${t('dashboard.charts.negativeResults')}: ${payload[2].value}`}</p>}
        </div>
      );
    }
    return null;
  };
  
  if (isHistoryLoading) {
    return <div className="text-center text-text-muted">{t('dashboard.loading')}</div>;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-3xl font-extrabold text-text-primary">{t('dashboard.title')}</h1>
        <div className="flex flex-wrap items-center gap-2 p-1 bg-surface-alt rounded-xl">
            <DateRangeButton label={t('dashboard.dateRanges.today')} range="today" activeRange={dateRange} onClick={handlePresetClick} />
            <DateRangeButton label={t('dashboard.dateRanges.d7')} range="7d" activeRange={dateRange} onClick={handlePresetClick} />
            <DateRangeButton label={t('dashboard.dateRanges.d30')} range="30d" activeRange={dateRange} onClick={handlePresetClick} />
            <DateRangeButton label={t('dashboard.dateRanges.all')} range="all" activeRange={dateRange} onClick={handlePresetClick} />
            <div className={`flex items-center gap-x-2 p-1 rounded-lg transition-colors ${dateRange === 'custom' ? 'bg-primary/10' : ''}`}>
              <span className="text-sm font-semibold text-text-secondary ps-2">{t('dashboard.from')}:</span>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="bg-surface border-border text-sm rounded-md p-1.5 focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <span className="text-sm font-semibold text-text-secondary">{t('dashboard.to')}:</span>
               <input 
                type="date"
                value={customEndDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="bg-surface border-border text-sm rounded-md p-1.5 focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title={t('dashboard.kpi.totalSamples')} value={kpiData.total.toString()} icon={ICONS.samples} />
        <StatCard title={t('dashboard.kpi.positiveResults')} value={kpiData.positive.toString()} subtitle={t('dashboard.kpi.positivityRate', {rate: kpiData.positivityRate})} valueColor="text-danger" icon={ICONS.positive} />
        <StatCard title={t('dashboard.kpi.negativeResults')} value={kpiData.negative.toString()} valueColor="text-success" icon={ICONS.negative} />
        <StatCard title={t('dashboard.kpi.qcStatus')} value={t('dashboard.kpi.qcValue')} subtitle={t('dashboard.kpi.qcSubtitle')} valueColor="text-success" icon={ICONS.qc} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card title={t('dashboard.charts.trendsTitle')} className="xl:col-span-3">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {lineChartData.length > 0 ? (
                        <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid stroke={themeColors.grid} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fill: themeColors.axis }} fontSize={12} reversed={language === 'fa'} />
                            <YAxis tick={{ fill: themeColors.axis }} fontSize={12} allowDecimals={false} orientation={language === 'fa' ? 'right' : 'left'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ color: themeColors.legend, fontSize: '14px' }} />
                            <Line type="monotone" name={t('dashboard.charts.totalSamples')} dataKey="total" stroke={COLORS.total} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                            <Line type="monotone" name={t('dashboard.charts.positiveResults')} dataKey="positive" stroke={COLORS.positive} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                            <Line type="monotone" name={t('dashboard.charts.negativeResults')} dataKey="negative" stroke={COLORS.negative} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} />
                        </LineChart>
                    ) : (
                       <div className="flex items-center justify-center h-full text-text-muted">{t('dashboard.charts.noDataPeriod')}</div>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
        <Card title={t('dashboard.charts.resultDistributionTitle')} className="xl:col-span-2">
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {pieChartData.some(d => d.value > 0) ? (
                        <PieChart>
                            <Pie 
                                data={pieChartData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={110} 
                            >
                                <Cell key="cell-0" fill={COLORS.positive} />
                                <Cell key="cell-1" fill={COLORS.negative} />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, color: themeColors.tooltipText, borderRadius: '8px', border: '1px solid var(--color-border)'}}/>
                            <Legend wrapperStyle={{ color: themeColors.legend, fontSize: '14px' }} />
                        </PieChart>
                    ) : (
                       <div className="flex items-center justify-center h-full text-text-muted">{t('dashboard.charts.noDataPeriod')}</div>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;