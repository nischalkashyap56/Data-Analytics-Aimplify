import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

export function LoadingIndicator({ message = 'Processing...' }: LoadingIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-t-2 border-blue-300 animate-spin" style={{ animationDuration: '1.5s' }}></div>
      </div>
      <p className="mt-4 text-gray-600">{message}</p>
      <p className="mt-2 text-sm text-gray-500">Time elapsed: {elapsedTime} seconds</p>
    </div>
  );
} 