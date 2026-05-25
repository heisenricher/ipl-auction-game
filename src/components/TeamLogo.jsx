import React from 'react';

const TeamLogo = ({ teamId, className = "", style = {} }) => {
  if (!teamId) return null;
  
  // Try to extract width/height from className if style doesn't have it
  const isW12 = className.includes('w-12');
  const isW6 = className.includes('w-6');
  const defaultSize = isW12 ? '48px' : isW6 ? '24px' : '40px';
  
  const mergedStyle = {
    width: defaultSize,
    height: defaultSize,
    objectFit: 'contain',
    ...style
  };

  return (
    <img 
      src={`/logos/${teamId.toLowerCase()}.svg`} 
      alt={`${teamId} Logo`} 
      className={className}
      style={mergedStyle}
      onError={(e) => {
        // Fallback to text if image fails to load
        e.target.style.display = 'none';
        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
      }}
    />
  );
};

export default TeamLogo;
