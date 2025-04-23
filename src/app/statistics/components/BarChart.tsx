'use client';

import React from 'react';

interface BarChartDataPoint {
  name: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  // Get max value for scaling
  const maxValue = Math.max(...data.map(item => item.value));
  const chartHeight = 200;
  const barWidth = 100 / data.length - 10; // Width of each bar as percentage
  
  // Function to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };
  
  // Colors for different bars
  const getBarColor = (index: number) => {
    const colors = [
      'var(--primary-color)',
      'var(--secondary-color)',
      'var(--accent-color)'
    ];
    return colors[index % colors.length];
  };
  
  return (
    <div 
      className="bar-chart-container"
      style={{ 
        position: 'relative',
        height: `${chartHeight + 60}px`,
        width: '100%',
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
          height: `${chartHeight}px`,
          borderLeft: '1px solid #ddd'
        }}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((percentage, index) => {
          const value = maxValue * percentage;
          return (
            <div 
              key={`y-label-${index}`}
              style={{ 
                position: 'absolute',
                right: '10px',
                top: `${chartHeight - (percentage * chartHeight)}px`,
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                color: '#666'
              }}
            >
              {formatNumber(value)}
            </div>
          );
        })}
      </div>
      
      {/* X-axis */}
      <div 
        className="x-axis"
        style={{ 
          position: 'absolute',
          left: '0',
          top: `${chartHeight}px`,
          width: '100%',
          borderTop: '1px solid #ddd'
        }}
      ></div>
      
      {/* Bars */}
      <div 
        className="bars-container"
        style={{ 
          position: 'absolute',
          left: '40px', // Make room for y-axis labels
          right: '20px',
          top: '0',
          height: `${chartHeight}px`
        }}
      >
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const barLeft = (index / data.length) * 100;
          const color = getBarColor(index);
          
          return (
            <div key={index} style={{ position: 'relative', height: '100%', width: `${barWidth}%`, left: `${barLeft}%`, float: 'left' }}>
              <div 
                className="bar"
                style={{ 
                  position: 'absolute',
                  bottom: '0',
                  width: '70%',
                  left: '15%',
                  height: `${barHeight}px`,
                  backgroundColor: color,
                  borderTopLeftRadius: '3px',
                  borderTopRightRadius: '3px',
                  transition: 'height 0.3s ease'
                }}
              >
                <div 
                  className="bar-value"
                  style={{ 
                    position: 'absolute',
                    top: '-25px',
                    left: '0',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    color: '#333'
                  }}
                >
                  {formatNumber(item.value)}
                </div>
              </div>
              
              <div 
                className="bar-label"
                style={{ 
                  position: 'absolute',
                  bottom: '-30px',
                  left: '0',
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#333',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart; 