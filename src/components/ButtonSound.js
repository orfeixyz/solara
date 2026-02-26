import { useEffect } from "react";

export default function ButtonSound() {
  useEffect(() => {
    let audioCtx = null;

    const playClick = () => {
      try {
        if (!audioCtx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) {
            return;
          }
          audioCtx = new AudioCtx();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.value = 540;
        gain.gain.value = 0.02;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
        osc.stop(audioCtx.currentTime + 0.07);
      } catch (_error) {
        // Ignore audio failures silently.
      }
    };

    const onDocumentClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const clickable = target.closest("button, [role='button'], .nav-link");
      if (clickable) {
        playClick();
      }
    };

    document.addEventListener("click", onDocumentClick, true);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      if (audioCtx) {
        audioCtx.close();
      }
    };
  }, []);

  return null;
}
