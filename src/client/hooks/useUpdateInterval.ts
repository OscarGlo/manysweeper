import { useEffect, useState } from "react";

export function useUpdateInterval(delay: number) {
  const getTime = () => Math.floor(Date.now()) / delay;

  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTime()), delay);
    return () => clearInterval(interval);
  });

  return time;
}
