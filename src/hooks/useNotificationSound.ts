import { useCallback, useRef } from 'react';

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const currentTime = ctx.currentTime;

      // Create a more attention-grabbing notification sound
      // First beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880; // A5
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.5, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
      osc1.start(currentTime);
      osc1.stop(currentTime + 0.2);

      // Second beep (higher)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100; // C#6
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.5, currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.45);
      osc2.start(currentTime + 0.25);
      osc2.stop(currentTime + 0.45);

      // Third beep (highest, longer)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.frequency.value = 1320; // E6
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0.6, currentTime + 0.5);
      gain3.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.9);
      osc3.start(currentTime + 0.5);
      osc3.stop(currentTime + 0.9);

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
}
