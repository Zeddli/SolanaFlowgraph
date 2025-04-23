'use client';

import React from 'react';

interface PieChartDataPoint {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieChartDataPoint[];
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    'var(--primary-color)',
    'var(--secondary-color)',
    'var(--accent-color)',
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#9C27B0'
  ];
  
  // Calculate pie slices
  const createPieSlices = () => {
    let startAngle = 0;
    
    return data.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;
      
      // SVG coordinates
      const cx = 50;
      const cy = 50;
      const radius = 40;
      
      // Convert angles to radians for calculations
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);
      
      // Calculate coordinates
      const x1 = cx + radius * Math.cos(startAngleRad);
      const y1 = cy + radius * Math.sin(startAngleRad);
      const x2 = cx + radius * Math.cos(endAngleRad);
      const y2 = cy + radius * Math.sin(endAngleRad);
      
      // Determine if the arc should be drawn as a large arc
      const largeArc = angle > 180 ? 1 : 0;
      
      // Create SVG path
      const path = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;
      
      // Store the current end angle as the next start angle
      const currentStartAngle = startAngle;
      startAngle = endAngle;
      
      return {
        path,
        color: colors[index % colors.length],
        percentage,
        item,
        midAngle: currentStartAngle + angle / 2
      };
    });
  };
  
  const slices = createPieSlices();
  
  // Create labels
  const renderLabels = () => {
    return slices.map((slice, index) => {
      // Calculate label position
      const labelRadius = 55; // Slightly outside the pie
      const midAngleRad = (slice.midAngle - 90) * (Math.PI / 180);
      const labelX = 50 + labelRadius * Math.cos(midAngleRad);
      const labelY = 50 + labelRadius * Math.sin(midAngleRad);
      
      // Anchor text based on position
      const textAnchor = labelX > 50 ? 'start' : 'end';
      
      return (
        <g key={`label-${index}`}>
          <text
            x={labelX}
            y={labelY}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill="#333"
            fontSize="7"
            fontWeight="500"
          >
            {slice.item.name} ({Math.round(slice.percentage * 100)}%)
          </text>
        </g>
      );
    });
  };
  
  return (
    <div className="pie-chart-container">
      <svg viewBox="0 0 100 100" width="100%" height="200">
        {/* Pie slices */}
        {slices.map((slice, index) => (
          <path
            key={`slice-${index}`}
            d={slice.path}
            fill={slice.color}
            stroke="#fff"
            strokeWidth="0.5"
          />
        ))}
        
        {/* Labels */}
        {renderLabels()}
      </svg>
      
      {/* Legend */}
      <div className="pie-chart-legend">
        {data.map((item, index) => (
          <div key={`legend-${index}`} className="legend-item">
            <div 
              className="legend-color" 
              style={{ 
                backgroundColor: colors[index % colors.length],
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                marginRight: '6px'
              }}
            ></div>
            <div className="legend-label">
              {item.name}
            </div>
            <div className="legend-value">
              {item.value}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart; 