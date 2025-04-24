'use client';

import React from 'react';

interface DataPoint {
  time: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  timeRange: 'day' | 'week' | 'month' | 'year';
}

const LineChart: React.FC<LineChartProps> = ({ data, timeRange }) => {
  // Get min and max values for scaling
  const maxValue = Math.max(...data.map(point => point.value));
  const chartHeight = 200;
  const chartWidth = '100%';
  
  // Scale values to fit in the chart height
  const getYPosition = (value: number) => {
    return chartHeight - (value / maxValue) * chartHeight;
  };
  
  // Build the SVG path
  const buildPath = () => {
    if (data.length === 0) return '';
    
    const width = 100 / (data.length - 1);
    
    return data.map((point, index) => {
      const x = index * width;
      const y = getYPosition(point.value);
      
      return index === 0 
        ? `M ${x} ${y}` 
        : `L ${x} ${y}`;
    }).join(' ');
  };
  
  // Create x-axis labels
  const renderXLabels = () => {
    // Show fewer labels on mobile or when there are many data points
    const skipFactor = timeRange === 'month' ? 5 : (timeRange === 'year' ? 2 : 1);
    
    return data.map((point, index) => {
      if (index % skipFactor !== 0 && index !== data.length - 1) return null;
      
      const width = 100 / (data.length - 1);
      const x = index * width;
      
      return (
        <div 
          key={`label-${index}`}
          className="x-label"
          style={{ 
            position: 'absolute',
            left: `${x}%`,
            bottom: '-25px',
            transform: 'translateX(-50%)',
            fontSize: '0.7rem',
            color: '#666'
          }}
        >
          {point.time}
        </div>
      );
    });
  };
  
  // Format y-axis value labels
  const formatYLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };
  
  // Create y-axis labels
  const renderYLabels = () => {
    // Create 5 evenly spaced labels
    const labels = [0, 0.25, 0.5, 0.75, 1];
    
    return labels.map((percentage, index) => {
      const value = maxValue * percentage;
      const y = getYPosition(value);
      
      return (
        <div 
          key={`y-label-${index}`}
          className="y-label"
          style={{ 
            position: 'absolute',
            left: '-40px',
            top: `${y}px`,
            fontSize: '0.7rem',
            color: '#666'
          }}
        >
          {formatYLabel(value)}
        </div>
      );
    });
  };
  
  return (
    <div 
      className="line-chart-container"
      style={{ 
        position: 'relative',
        height: `${chartHeight + 40}px`,
        width: chartWidth,
        marginLeft: '40px',
        marginBottom: '30px'
      }}
    >
      {/* Y-axis */}
      <div 
        className="y-axis"
        style={{ 
          position: 'absolute',
          left: '0',
          top: '0',
          height: '100%',
          borderLeft: '1px solid #ddd'
        }}
      >
        {renderYLabels()}
      </div>
      
      {/* X-axis */}
      <div 
        className="x-axis"
        style={{ 
          position: 'absolute',
          left: '0',
          bottom: '0',
          width: '100%',
          borderTop: '1px solid #ddd'
        }}
      >
        {renderXLabels()}
      </div>
      
      {/* Chart */}
      <div 
        className="chart-area"
        style={{ 
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: `${chartHeight}px`
        }}
      >
        {/* Line */}
        <svg width="100%" height={chartHeight} viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
          <path
            d={buildPath()}
            fill="none"
            stroke="var(--primary-color)"
            strokeWidth="2"
          />
          
          {/* Area under the line */}
          <path
            d={`${buildPath()} L 100 ${chartHeight} L 0 ${chartHeight} Z`}
            fill="var(--primary-color)"
            opacity="0.1"
          />
          
          {/* Data points */}
          {data.map((point, index) => {
            const width = 100 / (data.length - 1);
            const x = index * width;
            const y = getYPosition(point.value);
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="var(--primary-color)"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default LineChart; 