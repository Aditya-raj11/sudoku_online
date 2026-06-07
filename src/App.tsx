import React, { useCallback, useState, useEffect } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { useSudoku } from './hooks/useSudoku';
import type { Difficulty, SudokuSettings } from './engine/types';
import Header from './components/Header';
import SudokuBoard from './components/SudokuBoard';
import GameControls from './components/GameControls';
import GameOverModal from './components/GameOverModal';
import SettingsModal from './components/SettingsModal';
import RulesModal from './components/RulesModal';
import LobbyPage from './pages/LobbyPage';
import MultiplayerGamePage from './pages/MultiplayerGamePage';
import { MultiplayerProvider } from './contexts/MultiplayerContext';

// Layout wrapper that provides shared multiplayer state
const MultiplayerLayout: React.FC = () => (
  <MultiplayerProvider>
    <Outlet />
  </MultiplayerProvider>
);


// ========== Solo Game Page ==========
const SoloGame: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const [settings, setSettings] = useState<SudokuSettings>(() => {
    const saved = localStorage.getItem('sudoku-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      mistakesLimit: true,
      autoClearNotes: true,
      highlightAreas: true,
      highlightIdentical: true,
      highlightMistakes: true,
      timerEnabled: true,
      darkTheme: false,
    };
  });

  useEffect(() => {
    if (settings.darkTheme) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [settings.darkTheme]);

  const handleSettingChange = useCallback((key: keyof SudokuSettings, value: boolean) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('sudoku-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const {
    state,
    selectCell,
    placeNumber,
    erase,
    undo,
    toggleNotes,
    useHint,
    togglePause,
    newGame,
    getNumberCounts,
  } = useSudoku('easy', settings);

  const handleDifficultyChange = useCallback((d: Difficulty) => {
    newGame(d);
  }, [newGame]);

  const handleNewGameClick = useCallback(() => {
    newGame(state.difficulty);
  }, [newGame, state.difficulty]);

  const numberCounts = getNumberCounts();

  return (
    <div className="app">
      <Header
        difficulty={state.difficulty}
        onDifficultyChange={handleDifficultyChange}
        onRulesClick={() => setIsRulesOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <main className="game-layout">
        <SudokuBoard
          board={state.board}
          selectedCell={state.selectedCell}
          onCellClick={selectCell}
          isPaused={state.isPaused}
          settings={settings}
        />
        <GameControls
          mistakes={state.mistakes}
          maxMistakes={state.maxMistakes}
          timer={state.timer}
          isPaused={state.isPaused}
          isNotesMode={state.isNotesMode}
          hintsRemaining={state.hintsRemaining}
          score={state.score}
          numberCounts={numberCounts}
          onUndo={undo}
          onErase={erase}
          onToggleNotes={toggleNotes}
          onHint={useHint}
          onTogglePause={togglePause}
          onNumberClick={placeNumber}
          onNewGame={handleNewGameClick}
          settings={settings}
        />
      </main>
      <GameOverModal
        isGameOver={state.isGameOver}
        isGameWon={state.isGameWon}
        score={state.score}
        timer={state.timer}
        mistakes={state.mistakes}
        difficulty={state.difficulty}
        onNewGame={newGame}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
};

// ========== App with Routes ==========
const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SoloGame />} />
      <Route element={<MultiplayerLayout />}>
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/room/:code" element={<MultiplayerGamePage />} />
      </Route>
    </Routes>
  );
};

export default App;

