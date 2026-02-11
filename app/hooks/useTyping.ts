// hooks/useTyping.ts
import { useState, useEffect, useRef, useCallback } from 'react';

const loveLetters = [
  "My dearest, I am writing this because I simply cannot keep these feelings inside any longer. Your laughter is the melody that plays on repeat in my mind, and your smile is the sun that breaks through my cloudy days. I promise to stand by you through every storm.",
  "To my player two, do you remember the first time we met? It was as if the universe shifted to bring us together. You challenge me to be better, you comfort me when I am weak, and you love me in a way I never thought possible.",
  "System Log: I seem to have loved you in numberless forms, numberless times, in life after life, in age after age forever. You are my heart, my life, my one and only thought.",
  "My love, they say that time waits for no one, but when I am with you, time seems to lose all meaning. Hours feel like minutes. You are my past, my present, and undoubtedly my future.",
  "To the one who holds my heart, I often find myself wondering what I did to deserve a love like yours. It is patient, it is kind, and it is the most beautiful algorithm I have ever known."
];

export const useTyping = (duration: number = 60) => {
  const [text, setText] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    const randomLetter = loveLetters[Math.floor(Math.random() * loveLetters.length)];
    setText(randomLetter);
    setInput("");
    setTimeLeft(duration);
    setStatus('idle');
    setWpm(0);
    setAccuracy(100);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [duration]);

  const calculateStats = useCallback(() => {
    const timeElapsed = (duration - timeLeft) > 0 ? (duration - timeLeft) / 60 : 0.001;
    
    // 1. Calculate Correct Characters (Anti-mash logic)
    let correctChars = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === text[i]) correctChars++;
    }

    // 2. WPM = (CorrectChars / 5) / Time
    const netWPM = (correctChars / 5) / timeElapsed;
    setWpm(Math.round(netWPM));

    // 3. Accuracy
    const acc = input.length > 0 ? (correctChars / input.length) * 100 : 100;
    setAccuracy(Math.round(acc));

  }, [input, timeLeft, duration, text]);

  const start = () => {
    if (status === 'running') return;
    setStatus('running');
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('finished');
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === 'finished') return;
    if (status === 'idle') start();

    const val = e.target.value;
    if (val.length >= text.length) {
       setInput(val);
       setStatus('finished');
       if (intervalRef.current) clearInterval(intervalRef.current);
       return;
    }
    setInput(val);
  };

  useEffect(() => {
    if (status === 'running' || status === 'finished') calculateStats();
  }, [input, timeLeft, status, calculateStats]);

  useEffect(() => { reset(); }, [reset]);

  return { text, input, timeLeft, status, wpm, accuracy, reset, handleInput };
};