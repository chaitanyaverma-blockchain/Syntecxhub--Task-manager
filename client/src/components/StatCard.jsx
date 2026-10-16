import React from 'react';

const colorThemes = {
  indigo: {
    bg: '#eef2ff',
    iconColor: '#4f46e5',
  },
  amber: {
    bg: '#fef3c7',
    iconColor: '#d97706',
  },
  emerald: {
    bg: '#ecfdf5',
    iconColor: '#059669',
  },
  rose: {
    bg: '#ffe4e6',
    iconColor: '#e11d48',
  },
};

const StatCard = ({ title, count, icon: Icon, theme = 'indigo' }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon-wrapper stat-icon-${theme}`}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <span className="text-muted text-sm font-medium">{title}</span>
        <h3>{count !== undefined && count !== null ? count : 0}</h3>
      </div>
    </div>
  );
};

export default StatCard;
