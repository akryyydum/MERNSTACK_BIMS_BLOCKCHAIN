import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const GridDistortion = ({ 
  rows = 30, 
  cols = 30, 
  className = '',
  cellSize = 40,
  distortionStrength = 20,
  animationSpeed = 3,
  color = '#3b82f6',
  opacity = 0.15
}) => {
  const canvasRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let rect = canvas.getBoundingClientRect();
    
    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    
    const initializeCanvas = () => {
      rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      return rect;
    };
    
    initializeCanvas();

    let actualRows = Math.ceil(rect.height / cellSize) + 2;
    let actualCols = Math.ceil(rect.width / cellSize) + 2;

    // Initialize grid points
    const initializePoints = () => {
      const points = [];
      for (let i = 0; i < actualRows; i++) {
        points[i] = [];
        for (let j = 0; j < actualCols; j++) {
          points[i][j] = {
            x: j * cellSize,
            y: i * cellSize,
            originalX: j * cellSize,
            originalY: i * cellSize
          };
        }
      }
      return points;
    };
    
    let points = initializePoints();

    let time = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };

    const handleMouseLeave = () => {
      mousePos.current = {
        x: -1000,
        y: -1000,
        active: false
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      time += 0.01 * animationSpeed;

      // Update point positions with distortion
      for (let i = 0; i < actualRows; i++) {
        for (let j = 0; j < actualCols; j++) {
          const point = points[i][j];
          const dx = mousePos.current.x - point.originalX;
          const dy = mousePos.current.y - point.originalY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 200;

          // Add subtle wave animation
          const wave = Math.sin(time + i * 0.5 + j * 0.5) * 2;
          const targetX = point.originalX + wave;
          const targetY = point.originalY + wave;

          if (distance < maxDistance) {
            const force = (1 - distance / maxDistance) * distortionStrength;
            const angle = Math.atan2(dy, dx);
            const distortedX = point.originalX + Math.cos(angle) * force;
            const distortedY = point.originalY + Math.sin(angle) * force;
            
            // Smooth interpolation to distorted position
            point.x += (distortedX - point.x) * 0.15;
            point.y += (distortedY - point.y) * 0.15;
          } else {
            // Smooth interpolation back to original position (with wave)
            point.x += (targetX - point.x) * 0.1;
            point.y += (targetY - point.y) * 0.1;
          }
        }
      }

      // Draw grid
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 1;

      // Draw horizontal lines
      for (let i = 0; i < actualRows; i++) {
        ctx.beginPath();
        ctx.moveTo(points[i][0].x, points[i][0].y);
        for (let j = 1; j < actualCols; j++) {
          ctx.lineTo(points[i][j].x, points[i][j].y);
        }
        ctx.stroke();
      }

      // Draw vertical lines
      for (let j = 0; j < actualCols; j++) {
        ctx.beginPath();
        ctx.moveTo(points[0][j].x, points[0][j].y);
        for (let i = 1; i < actualRows; i++) {
          ctx.lineTo(points[i][j].x, points[i][j].y);
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    animate();

    const handleResize = () => {
      const newRect = initializeCanvas();
      actualRows = Math.ceil(newRect.height / cellSize) + 2;
      actualCols = Math.ceil(newRect.width / cellSize) + 2;
      points = initializePoints();
      rect = newRect;
    };

    // Listen for both resize and zoom events
    window.addEventListener('resize', handleResize);
    
    // Detect zoom changes
    const mediaQuery = window.matchMedia('screen');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResize);
    }
    
    // Additional zoom detection via resize observer
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleResize);
      }
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rows, cols, cellSize, distortionStrength, animationSpeed, color, opacity]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GridDistortion;
