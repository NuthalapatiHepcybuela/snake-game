import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music2, Gamepad2, Trophy, Volume2, VolumeX } from 'lucide-react';

// --- Constants & Config ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIR = { x: 0, y: -1 };
const BASE_SPEED = 150;

const TRACKS = [
  { id: 1, title: 'SYNTH-WAVE // GEN-01', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'NEON-NIGHTS // GEN-02', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'CYBER-GRID // GEN-03', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

// --- Utility Functions ---
const getRandomFoodPosition = (snake: {x: number, y: number}[]) => {
  let newFood;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Ensure food doesn't spawn on the snake
    const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (!isOnSnake) break;
  }
  return newFood;
};

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIR);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER' | 'PAUSED'>('IDLE');

  // We use refs to avoid stale closures in the game loop interval
  const snakeRef = useRef(snake);
  const dirRef = useRef(direction);
  const foodRef = useRef(food);
  const stateRef = useRef(gameState);

  // Sync refs when state changes
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { dirRef.current = direction; }, [direction]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  // --- Music State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio lifecycle
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.warn('Audio playback blocked:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const nextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  }, []);

  const prevTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  }, []);

  const togglePlay = () => setIsPlaying(!isPlaying);

  // --- Game Mechanics ---
  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIR);
    setScore(0);
    setFood(getRandomFoodPosition(INITIAL_SNAKE));
    setGameState('PLAYING');
    
    // Auto-start music if not playing, helps build the vibe
    if (!isPlaying) setIsPlaying(true);
  };

  const pauseGame = () => {
    setGameState(prev => prev === 'PAUSED' ? 'PLAYING' : 'PAUSED');
  };

  useEffect(() => {
    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent zooming/scrolling on directional keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && stateRef.current === 'PLAYING') {
        pauseGame();
        return;
      }
      if (e.key === ' ' && stateRef.current === 'PAUSED') {
        pauseGame();
        return;
      }
      if (e.key === ' ' && (stateRef.current === 'IDLE' || stateRef.current === 'GAME_OVER')) {
        startGame();
        return;
      }

      if (stateRef.current !== 'PLAYING') return;

      const curDir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (curDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (curDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (curDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (curDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Game Loop
  useEffect(() => {
    let interval: number | null = null;
    if (gameState === 'PLAYING') {
      // Create slight speedup over time logic (optional), keeping it constant for now
      interval = window.setInterval(() => {
        const currentSnake = [...snakeRef.current];
        const head = { ...currentSnake[0] };
        const dir = dirRef.current;
        const curFood = foodRef.current;

        // Move head
        head.x += dir.x;
        head.y += dir.y;

        // Collision Check: Walls
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameState('GAME_OVER');
          return;
        }

        // Collision Check: Self
        if (currentSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
           setGameState('GAME_OVER');
           return;
        }

        currentSnake.unshift(head); // Add new head

        // Check Food
        if (head.x === curFood.x && head.y === curFood.y) {
          setScore((s) => {
            const newScore = s + 10;
            if (newScore > highScore) setHighScore(newScore);
            return newScore;
          });
          setFood(getRandomFoodPosition(currentSnake));
        } else {
          currentSnake.pop(); // Remove tail if no food eaten
        }

        setSnake(currentSnake);
      }, BASE_SPEED);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, highScore]);


  // --- Render Helpers ---
  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen w-full bg-[#050508] text-slate-200 font-sans flex flex-col p-4 md:p-8 overflow-x-hidden relative">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onEnded={nextTrack} 
        preload="auto"
      />

      {/* Mesh Background Accents */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-900/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Top Header Area */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 z-10 w-full max-w-[1200px] mx-auto gap-6 md:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-fuchsia-500 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Neon<span className="text-cyan-400">Synth</span>Snake</h1>
        </div>
        <div className="flex gap-4 md:gap-6 flex-wrap justify-center">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center">
            <span className="text-xs uppercase tracking-widest text-slate-400 mr-2">Current Score</span>
            <span className="text-xl font-mono font-bold text-cyan-400">{score.toString().padStart(5, '0')}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center">
            <span className="text-xs uppercase tracking-widest text-slate-400 mr-2">High Score</span>
            <span className="text-xl font-mono font-bold text-fuchsia-500">{highScore.toString().padStart(5, '0')}</span>
          </div>
        </div>
      </header>

      {/* Main Viewport Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 z-10 w-full max-w-[1200px] mx-auto">
        
        {/* Sidebar Left: Playlist */}
        <aside className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Atmospheric Queue</h2>
          <div className="flex flex-col gap-2">
            {TRACKS.map((track, i) => {
              const isActive = i === currentTrackIndex;
              if (isActive) {
                return (
                  <button key={track.id} onClick={() => setCurrentTrackIndex(i)} className="text-left w-full p-4 bg-white/10 backdrop-blur-xl border-l-2 border-cyan-400 rounded-r-xl flex items-center gap-4 transition-all">
                    <div className="w-12 h-12 bg-cyan-900/30 rounded flex items-center justify-center shrink-0">
                      {isPlaying ? <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div> : <Music2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{track.title}</p>
                      <p className="text-xs text-cyan-400">AI Synthesist • 3:42</p>
                    </div>
                  </button>
                );
              } else {
                return (
                  <button key={track.id} onClick={() => setCurrentTrackIndex(i)} className="text-left w-full p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 rounded-xl flex items-center gap-4 opacity-60 transition-all">
                    <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center shrink-0 text-slate-400">0{i + 1}</div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-slate-200 truncate">{track.title}</p>
                      <p className="text-xs text-slate-500">AI Synthesist • 3:42</p>
                    </div>
                  </button>
                );
              }
            })}
          </div>
          
          {/* Mini Stats Board */}
          <div className="mt-auto p-5 bg-gradient-to-b from-fuchsia-500/10 to-transparent border border-fuchsia-500/20 rounded-2xl hidden lg:block">
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-400 mb-3">Snake Vitals</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Speed</p>
                <p className="text-lg font-mono">{BASE_SPEED}ms</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Length</p>
                <p className="text-lg font-mono">{snake.length} u</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Snake Game Console */}
        <section className="lg:col-span-6 flex flex-col order-1 lg:order-2 items-center lg:items-stretch">
          <div className="w-full flex-1 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-4 relative shadow-2xl overflow-hidden flex items-center justify-center min-h-[400px] lg:min-h-0">
            {/* Game Grid Container */}
            <div 
              className="relative bg-transparent border border-cyan-500/10"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: '100%',
                aspectRatio: '1/1',
                maxWidth: '600px'
              }}
            >
              {/* Grid Cells Rendering */}
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                
                const isHead = snake[0].x === x && snake[0].y === y;
                const isSnake = snake.some((segment) => segment.x === x && segment.y === y);
                const isFood = food.x === x && food.y === y;
                
                if (isHead) {
                  return <div key={i} className="w-full h-full bg-cyan-500 rounded-sm border-2 border-white/40 shadow-[0_0_20px_#22d3ee] flex items-center justify-center z-10"><div className="w-1 h-1 bg-black rounded-full" /></div>;
                } else if (isSnake) {
                  return <div key={i} className="w-full h-full bg-cyan-400 rounded shadow-[0_0_10px_#22d3ee]"></div>;
                } else if (isFood) {
                  return <div key={i} className="w-full h-full bg-fuchsia-500 rounded-full shadow-[0_0_15px_#d946ef] animate-pulse z-10 scale-75"></div>;
                } else {
                  return <div key={i} className="w-full h-full border-r border-b border-white/5 opacity-40"></div>;
                }
              })}

              {/* Overlays */}
              {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 bg-[#050508]/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-opacity">
                  {gameState === 'IDLE' && (
                    <div className="text-center animate-bounce">
                      <button 
                        onClick={startGame}
                        className="px-6 py-3 border border-white/20 text-white font-bold bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-white hover:text-black transition-all uppercase tracking-widest"
                      >
                        Insert Coin
                      </button>
                    </div>
                  )}
                  
                  {gameState === 'PAUSED' && (
                    <div className="text-center animate-pulse text-cyan-400 text-2xl font-bold tracking-[0.3em]">
                      PAUSED
                    </div>
                  )}

                  {gameState === 'GAME_OVER' && (
                    <div className="text-center">
                      <h2 className="text-4xl font-extrabold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] mb-2">SYSTEM FAILURE</h2>
                      <p className="text-slate-300 text-lg mb-6">FINAL SCORE: <span className="text-fuchsia-400 font-bold">{score}</span></p>
                      
                      <button 
                        onClick={startGame}
                        className="px-6 py-2 border border-white/20 text-white font-bold bg-white/10 backdrop-blur-md rounded-full hover:bg-white hover:text-black transition-all uppercase tracking-widest text-sm"
                      >
                        REBOOT SEQUENCE
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Sidebar: Legend & Instructions */}
        <aside className="lg:col-span-3 flex flex-col gap-6 order-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Controls</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase">Move</span>
                <div className="flex gap-1 font-mono text-[10px]">
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/5 shadow-sm">W</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/5 shadow-sm">A</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/5 shadow-sm">S</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded border border-white/5 shadow-sm">D</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase">Pause</span>
                <kbd className="px-3 py-1 bg-white/10 rounded border border-white/5 shadow-sm font-mono text-[10px]">SPACE</kbd>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent border border-white/5 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">Pro Tip</h3>
            <p className="text-xs leading-relaxed text-slate-300">Eating <span className="text-fuchsia-400 font-semibold">Neon Nodes</span> increases the snake length and telemetry score.</p>
          </div>
          
          {/* Volume Control widget */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md mt-auto">
            <div className="flex items-center justify-between gap-3 text-slate-300 relative">
               <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white transition-colors shrink-0">
                 {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
               </button>
               <input 
                 type="range" 
                 min="0" max="1" step="0.05"
                 value={isMuted ? 0 : volume}
                 onChange={(e) => {
                   setVolume(parseFloat(e.target.value));
                   if(isMuted) setIsMuted(false);
                 }}
                 className="w-full h-1 bg-slate-800 rounded-full appearance-none outline-none cursor-pointer"
               />
               <style>{`
                 input[type=range]::-webkit-slider-thumb {
                   -webkit-appearance: none;
                   appearance: none;
                   width: 12px;
                   height: 12px;
                   border-radius: 50%;
                   background: white;
                   cursor: pointer;
                 }
               `}</style>
            </div>
          </div>
        </aside>
      </main>

      {/* Music Player Footer Bar */}
      <footer className="mt-8 z-20 w-full max-w-[1200px] mx-auto">
        <div className="bg-white/5 border border-white/10 backdrop-blur-3xl rounded-3xl p-4 flex items-center gap-4 lg:gap-8 shadow-2xl flex-wrap lg:flex-nowrap">
          {/* Song Progress */}
          <div className="flex flex-col flex-1 min-w-[200px] lg:w-auto">
            <div className="flex justify-between items-center mb-2 px-1">
              <p className="text-xs font-bold tracking-wide text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] font-mono text-slate-400 shrink-0 select-none">3:42</p>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                 className={`h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-[width] duration-1000 ease-linear ${isPlaying ? 'w-full origin-left' : 'w-0'}`} 
                 style={{ 
                    transition: isPlaying ? 'width 222s linear' : 'width 0.3s ease-out',
                    width: isPlaying ? '100%' : '2%'
                 }}
              />
            </div>
          </div>
          
          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 lg:pr-4 w-full lg:w-auto order-last lg:order-none mt-2 lg:mt-0">
            <button onClick={prevTrack} className="text-slate-400 hover:text-white transition-colors">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button onClick={togglePlay} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button onClick={nextTrack} className="text-slate-400 hover:text-white transition-colors">
               <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Visualizer (Static Representation) */}
          <div className="hidden lg:flex items-end gap-1 h-10 px-4 border-l border-white/10 shrink-0">
            {isPlaying ? (
               <>
                 <div className="w-1.5 h-4 bg-cyan-400/40 rounded-t-sm animate-[bounce_0.7s_infinite]"></div>
                 <div className="w-1.5 h-8 bg-cyan-400/60 rounded-t-sm animate-[bounce_0.9s_infinite]"></div>
                 <div className="w-1.5 h-6 bg-cyan-400/40 rounded-t-sm animate-[bounce_1.1s_infinite]"></div>
                 <div className="w-1.5 h-10 bg-fuchsia-400 rounded-t-sm shadow-[0_0_5px_#d946ef] animate-[bounce_0.8s_infinite]"></div>
                 <div className="w-1.5 h-7 bg-cyan-400/50 rounded-t-sm animate-[bounce_1.2s_infinite]"></div>
                 <div className="w-1.5 h-4 bg-cyan-400/30 rounded-t-sm animate-[bounce_0.6s_infinite]"></div>
               </>
            ) : (
               <>
                 <div className="w-1.5 h-2 bg-cyan-400/40 rounded-t-sm transition-all duration-300"></div>
                 <div className="w-1.5 h-2 bg-cyan-400/60 rounded-t-sm transition-all duration-300"></div>
                 <div className="w-1.5 h-2 bg-cyan-400/40 rounded-t-sm transition-all duration-300"></div>
                 <div className="w-1.5 h-2 bg-fuchsia-400 rounded-t-sm transition-all duration-300"></div>
                 <div className="w-1.5 h-2 bg-cyan-400/50 rounded-t-sm transition-all duration-300"></div>
                 <div className="w-1.5 h-2 bg-cyan-400/30 rounded-t-sm transition-all duration-300"></div>
               </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

