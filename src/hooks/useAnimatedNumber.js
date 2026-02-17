import { useEffect, useState } from "react";

export default function useAnimatedNumber(target, duration = 550) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const startValue = value;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);
      setValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [target]);

  return value;
}
