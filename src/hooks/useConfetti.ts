import { useCallback } from "react";
import confetti from "canvas-confetti";
import { useProfile } from "@/contexts/ProfileContext";

export const useConfetti = () => {
  const { selectedProfile } = useProfile();

  const triggerConfetti = useCallback(() => {
    // Only trigger if fun mode is enabled
    if (!selectedProfile?.fun_mode) return;

    // Create multiple bursts for more excitement
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Fire from multiple positions for fuller effect
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Also trigger an immediate burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 999999
    });
  }, [selectedProfile?.fun_mode]);

  return { triggerConfetti };
};