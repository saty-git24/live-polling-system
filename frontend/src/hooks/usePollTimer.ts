import { useEffect, useState } from 'react';

export function usePollTimer(
  startTime: number | null,
  duration: number | null
): number {
  const [remainingTime, setRemainingTime] = useState<number>(0);

  useEffect(() => {
    if (startTime === null || duration === null) {
      setRemainingTime(0);
      return;
    }

    const calculateRemaining = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      return remaining;
    };

    setRemainingTime(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingTime(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, duration]);

  return remainingTime;
}