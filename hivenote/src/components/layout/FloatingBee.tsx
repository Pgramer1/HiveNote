'use client';

import { useState, useEffect } from 'react';

export default function FloatingBee() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += 0.02;
      // Create a gentle floating motion
      const newX = Math.sin(time) * 10;
      const newY = Math.cos(time * 0.8) * 8;
      setPosition({ x: newX, y: newY });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div
      className="fixed bottom-8 right-8 z-50 cursor-pointer transition-transform duration-300"
      style={{
        transform: `translate(${position.x}px, ${position.y}px) scale(${isHovered ? 1.2 : 1})`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="HiveNote Bee 🐝"
    >
      <div className="relative">
        {/* Bee SVG/Emoji */}
        <div className="text-6xl animate-bounce-slow">
          🐝
        </div>
        
        {/* Tooltip on hover */}
        {isHovered && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
            Buzzing with knowledge! 🍯
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground"></div>
          </div>
        )}
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl -z-10 animate-pulse"></div>
      </div>
    </div>
  );
}
