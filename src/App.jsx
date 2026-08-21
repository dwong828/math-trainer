import React, { useState, useRef, useEffect } from 'react';
import { 
  Trophy, Star, Compass, Upload, Clock, Target, FastForward, ChevronLeft, ChevronRight, Heart, CheckCircle2, XCircle, HelpCircle, FileText, Eye
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const defaultQuestions = [
  {
    "id": 1,
    "question": "If you have \\$10.00 and spend \\$4.50, how much is left?",
    "answer": "5.50",
    "type": "input",
    "difficulty": 1,
    "solutionFile": "q1_solution.txt"
  },
  {
    "id": 2,
    "question": "Which of the following expressions are equivalent to 360? Select all that apply.",
    "answer": "A, D",
    "type": "mcq",
    "difficulty": 3,
    "options": {
      "A": "$2^3 * 3^2 * 5$",
      "B": "$600 \\div 3/5 $",
      "C": "$2400 \\div 8$",
      "D": "$\\frac{3}{4}$ of 480"
    },
    "solutionFile": "q2_solution.txt"
  }
];

// Helper function to format filenames to Capitalized Words
const formatTitle = (filename) => {
  if (!filename) return "Math Trainer";
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function MathTrainer() {
  const [questions, setQuestions] = useState(defaultQuestions);
  const [fileName, setFileName] = useState('2021-stretch-work.json');
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedMcq, setSelectedMcq] = useState([]); 
  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [attemptsThisQuestion, setAttemptsThisQuestion] = useState(1);
  const [history, setHistory] = useState([]); 
  const [isFinished, setIsFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [isSolutionLoading, setIsSolutionLoading] = useState(false);
  const [solutionCache, setSolutionCache] = useState({});
  const [starPos, setStarPos] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  const [shakeHearts, setShakeHearts] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);

  const currentQuestion = questions[index] || questions[0];
  const maxPotentialXP = questions.length * 50;
  
  const xpBarRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const revealButtonRef = useRef(null);

  const isQuestionCorrect = history[index]?.status === "Correct";
  const isQuestionSkipped = history[index]?.status === "Skipped";

  // Keybindings for Review Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isReviewMode) return;
      if (e.key === 'ArrowLeft') navPrev();
      if (e.key === 'ArrowRight') navNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReviewMode, index, history.length]);

  // Focus Logic
  useEffect(() => {
    if (isFinished) return;

    if (isReviewMode) {
      if (!isQuestionCorrect && revealButtonRef.current) {
        revealButtonRef.current.focus();
      }
    } else {
      if (currentQuestion?.type === 'input' && inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [index, isFinished, isReviewMode, currentQuestion?.type, isQuestionCorrect]);

  useEffect(() => {
    let interval = null;
    if (isActive && !isFinished) {
      interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, isFinished]);

  // Solution fetching logic when showSolution is toggled
  useEffect(() => {
    if (!showSolution || !currentQuestion?.solutionFile) {
      if (!showSolution) setSolutionText('');
      return;
    }

    const name = currentQuestion.solutionFile;

    if (solutionCache[name]) {
      setSolutionText(solutionCache[name]);
      return;
    }

    setIsSolutionLoading(true);
    fetch(`/solutions/${name}`)
      .then((res) => {
        if (!res.ok) throw new Error('Solution file not found');
        return res.text();
      })
      .then((text) => {
        setSolutionCache((prev) => ({ ...prev, [name]: text }));
        setSolutionText(text);
        setIsSolutionLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setSolutionText('Unable to load solution file.');
        setIsSolutionLoading(false);
      });
  }, [showSolution, currentQuestion?.solutionFile, solutionCache]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = (content) => {
    if (typeof content !== 'string') return content;
    const escapedContent = content.replace(/\\(\$)/g, '___ESC_DOLLAR___');
    const parts = escapedContent.split(/(\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const mathEquation = part.substring(1, part.length - 1);
        return <InlineMath key={i} math={mathEquation} />;
      }
      return <span key={i}>{part.replace(/___ESC_DOLLAR___/g, '$')}</span>;
    });
  };

  const jumpToQuestion = (targetIndex) => {
    setIndex(targetIndex);
    setShowAnswer(false);
    setShowSolution(false);
    setSolutionText('');
    if (!isReviewMode) {
      prepareNextQuestion();
    }
  };

  const navNext = () => {
    const limit = isReviewMode ? history.length : questions.length;
    if (index < limit - 1) {
      jumpToQuestion(index + 1);
    } else if (!isReviewMode) {
      setIsFinished(true);
      setIsActive(false);
    }
  };

  const navPrev = () => {
    if (index > 0) {
      jumpToQuestion(index - 1);
    }
  };

  const prepareNextQuestion = () => {
    setShowAnswer(false);
    setShowSolution(false);
    setSolutionText('');
    setUserInput('');
    setSelectedMcq([]);
    setLives(3);
    setAttemptsThisQuestion(1);
  };

  const triggerWrongAnswerFeedback = () => {
    setShakeHearts(true);
    setFlashRed(true);
    setShakeInput(true);
    setTimeout(() => {
      setShakeHearts(false);
      setFlashRed(false);
      setShakeInput(false);
      if (inputRef.current) inputRef.current.focus();
    }, 500);
  };

  const checkAnswer = () => {
    if (isReviewMode || lives <= 0) return;
    
    let finalInput = currentQuestion.type === 'mcq' 
      ? [...selectedMcq].sort().join(", ") 
      : userInput.trim();

    if (finalInput === "") {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    setUserInput(''); 

    if (finalInput.replace(/\s/g, '') === currentQuestion.answer.replace(/\s/g, '')) {
      const earnedXP = 50 - ((attemptsThisQuestion - 1) * 10);
      setHistory(prev => {
        const filtered = prev.filter(item => item.id !== currentQuestion.id);
        return [...filtered, { id: currentQuestion.id, status: "Correct", solved: true, userAnswer: finalInput, earnedXP, attempts: attemptsThisQuestion }];
      });
      triggerStarAnimation(earnedXP);
    } else {
      triggerWrongAnswerFeedback();
      const newLives = lives - 1;
      if (newLives <= 0) {
        setLives(0);
        setHistory(prev => {
          const filtered = prev.filter(item => item.id !== currentQuestion.id);
          return [...filtered, { id: currentQuestion.id, status: "Failed", solved: false, userAnswer: finalInput, earnedXP: 0, attempts: 3 }];
        });
        setTimeout(navNext, 1000);
      } else {
        setLives(newLives);
        setAttemptsThisQuestion(prev => prev + 1);
      }
    }
  };

  const skipQuestion = () => {
    if (isReviewMode) return;
    setUserInput('');
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== currentQuestion.id);
      return [...filtered, { 
        id: currentQuestion.id, 
        status: "Skipped", 
        solved: false, 
        userAnswer: "SKIPPED", 
        earnedXP: 0, 
        attempts: attemptsThisQuestion 
      }];
    });
    navNext();
  };

  const triggerStarAnimation = (earned) => {
    setStarPos({ x: window.innerWidth / 2, y: window.innerHeight / 2, animating: false });
    setTimeout(() => {
        const endRect = xpBarRef.current?.getBoundingClientRect();
        if (endRect) setStarPos({ x: endRect.right - 40, y: endRect.top + 10, animating: true });
    }, 50);
    setTimeout(() => { setStarPos(null); setXp(prev => prev + earned); navNext(); }, 850);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setQuestions(data);
        setIndex(0); setHistory([]); setXp(0); setSeconds(0); 
        setIsActive(true); setIsFinished(false); setIsReviewMode(false);
        setSolutionCache({});
        prepareNextQuestion();
      } catch (err) { alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const headerUI = (
    <div className="flex justify-between items-center mb-6 text-white">
      <div className="bg-black/20 px-4 py-2 rounded-xl flex items-center gap-3 font-mono font-bold">
        <Clock size={18} /> {formatTime(seconds)}
      </div>
      <button 
        onClick={() => fileInputRef.current?.click()} 
        className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
      >
        <Upload size={18} /> Load JSON
      </button>
      <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
    </div>
  );

  if (isFinished) {
    const totalCorrect = history.filter(h => h.solved).length;
    const totalAttempts = history.reduce((sum, item) => sum + item.attempts, 0);
    const accuracyPercent = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    return (
      <div className="min-h-screen bg-[#2d5a61] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl max-w-2xl w-full border-8 border-white/20 text-[#2d3a4b]">
          {headerUI}
          <div className="text-center mb-8">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={50} />
            <h2 className="text-4xl font-black text-[#2d5a61] mb-1">Level Complete!</h2>
            <p className="text-gray-400 font-bold mb-4">{formatTitle(fileName)}</p>
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center gap-3">
               <div className="flex items-center gap-2 text-gray-400 uppercase font-black text-xs tracking-widest"><Target size={16} /> Accuracy</div>
               <div className="text-5xl font-black text-[#2d5a61]">{accuracyPercent.toFixed(1)}%</div>
               <div className="flex gap-1">
                {[0, 1, 2].map((i) => {
                    const startRange = (i / 3) * 100;
                    const endRange = ((i + 1) / 3) * 100;
                    let fillPercent = 0;
                    if (accuracyPercent > endRange) fillPercent = 100;
                    else if (accuracyPercent > startRange) fillPercent = ((accuracyPercent - startRange) / (33.33)) * 100;
                    return (
                      <div key={i} className="relative">
                        <Star size={44} className="text-gray-300 fill-gray-300" />
                        <div className="absolute top-0 left-0 overflow-hidden transition-all duration-700" style={{ width: `${fillPercent}%` }}>
                          <Star size={44} className="text-yellow-400 fill-yellow-400" />
                        </div>
                      </div>
                    );
                })}
               </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex flex-col items-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Total XP</p>
              <p className="text-2xl font-black text-yellow-700">{xp}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Attempts</p>
              <p className="text-2xl font-black text-blue-600">{totalAttempts}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Correct</p>
              <p className="text-2xl font-black text-green-600">{totalCorrect}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col items-center">
              <p className="text-[10px] font-black text-gray-400 uppercase">Time</p>
              <p className="text-2xl font-black text-purple-600">{formatTime(seconds)}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 mb-8 overflow-hidden">
             <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-[10px] uppercase font-black text-gray-400">
                        <tr>
                            <th className="px-5 py-2">Q</th>
                            <th className="px-5 py-2 text-center">Attempts</th>
                            <th className="px-5 py-2">Status</th>
                            <th className="px-5 py-2 text-right">XP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((item, i) => {
                        let rowClass = "bg-white";
                        if (!item.solved) rowClass = "bg-red-100 text-red-900";
                        else if (item.attempts === 1) rowClass = "bg-green-100 text-green-900";
                        else rowClass = "bg-yellow-100 text-yellow-900";
                        return (
                          <tr key={i} className={`${rowClass} transition-colors`}>
                            <td className="px-5 py-3 font-bold">#{item.id}</td>
                            <td className="px-5 py-3 text-center font-mono font-bold">{item.attempts}</td>
                            <td className="px-5 py-3 uppercase text-[10px] font-black">{item.status}</td>
                            <td className="px-5 py-3 text-right font-black">+{item.earnedXP}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
             </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setIsReviewMode(true); 
                setIsFinished(false); 
                setIndex(0);
                setShowAnswer(false);
                setShowSolution(false);
                setSolutionText('');
              }} 
              className="flex-1 bg-[#6165ed] text-white py-4 rounded-2xl font-black shadow-[0_5px_0_rgb(79,83,209)] cursor-pointer"
            >
              Review
            </button>
            <button onClick={() => window.location.reload()} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black cursor-pointer">Restart</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 text-white font-sans overflow-hidden transition-colors duration-300 ${flashRed ? 'bg-red-900' : 'bg-[#2d5a61]'}`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {starPos && (
        <div className="fixed z-[100] text-yellow-400 pointer-events-none transition-all duration-700 ease-in-out" 
             style={{ left: starPos.x, top: starPos.y, transform: starPos.animating ? 'scale(2) rotate(720deg)' : 'scale(1)', opacity: starPos.animating ? 0 : 1 }}>
          <Star size={40} fill="currentColor" />
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {headerUI}
        <nav className="flex justify-between items-center mb-8 gap-4">
           <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shrink-0"><Compass className="text-[#2d5a61]" size={28} /></div>
              <h1 className="text-2xl font-black tracking-tighter shrink-0">MATH TRAINER</h1>
           </div>

           {/* Page Title from Formatted Filename */}
           <div className="text-center font-black text-2xl tracking-wide text-white drop-shadow-sm truncate px-4">
              {formatTitle(fileName)}
           </div>

           <div ref={xpBarRef} className="bg-[#1e3a3f]/80 rounded-full px-5 py-2 flex items-center gap-4 border border-white/10 shrink-0">
              <span className="font-mono text-sm">{xp} XP</span>
              <div className="w-32 h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${(xp / Math.max(maxPotentialXP, 1)) * 100}%` }}></div>
              </div>
           </div>
        </nav>

        {/* Main Content Layout with Sidebar */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          
          {/* Sidebar Panel */}
          <aside className="w-full md:w-64 bg-black/20 backdrop-blur-md rounded-[30px] p-5 border border-white/10 shrink-0 flex flex-col justify-between md:sticky md:top-6 md:max-h-[calc(100vh-120px)]">
            <div className="flex flex-col min-h-0 h-full">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/70 mb-4 px-2 shrink-0">
                Questions ({questions.length})
              </h3>
              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar p-1.5 flex-1 min-h-0">
                {questions.map((q, qIdx) => {
                  const qHistory = history.find(h => h.id === q.id);
                  const isCurrent = qIdx === index;

                  let statusBadge = null;
                  let borderClass = isCurrent ? "ring-2 ring-white border-white z-10" : "border-white/10 hover:border-white/40";
                  let bgClass = "bg-white/10 hover:bg-white/20";
                  let attemptStars = 0;

                  if (qHistory) {
                    if (qHistory.status === "Correct") {
                      if (qHistory.attempts === 1) {
                        bgClass = isCurrent ? "bg-green-500" : "bg-green-600/80 hover:bg-green-600";
                      } else {
                        // Lighter shade of yellow for multi-attempt correct answers
                        bgClass = isCurrent ? "bg-yellow-400" : "bg-yellow-500/80 hover:bg-yellow-500";
                      }
                      statusBadge = <CheckCircle2 size={16} className="text-white shrink-0" />;
                      attemptStars = qHistory.attempts;
                    } else if (qHistory.status === "Failed") {
                      bgClass = isCurrent ? "bg-red-500" : "bg-red-600/80 hover:bg-red-600";
                      statusBadge = <XCircle size={16} className="text-white shrink-0" />;
                      attemptStars = 0; // Hide stars on failure
                    } else if (qHistory.status === "Skipped") {
                      // Lighter shade of yellow for skipped items
                      bgClass = isCurrent ? "bg-yellow-400" : "bg-yellow-500/80 hover:bg-yellow-500";
                      statusBadge = <HelpCircle size={16} className="text-white shrink-0" />;
                      attemptStars = 0; // Hide stars on skip
                    }
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(qIdx)}
                      className={`relative flex items-center justify-between w-full px-4 py-3 rounded-2xl font-black text-base transition-all duration-200 border cursor-pointer shrink-0 ${bgClass} ${borderClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm opacity-90">
                          {q.id} ({q.difficulty ?? 1})
                        </span>
                        {statusBadge}
                      </div>

                      <div className="flex gap-0.5 items-center">
                        {qHistory?.solved && attemptStars > 0 && Array.from({ length: attemptStars }).map((_, sIdx) => (
                          <Star key={sIdx} size={12} className="text-yellow-300 fill-yellow-300" />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Back to Summary Button under sidebar during Review Mode */}
            {isReviewMode && (
              <button 
                onClick={() => setIsFinished(true)} 
                className="mt-4 w-full bg-[#6165ed] text-white py-3 px-4 rounded-2xl font-black shadow-[0_4px_0_rgb(79,83,209)] active:translate-y-0.5 hover:bg-[#5256e0] transition-all cursor-pointer text-sm shrink-0"
              >
                Back to Summary
              </button>
            )}
          </aside>

          {/* Main Question Workspace */}
          <main className="flex-1 w-full">
            <div className={`bg-white rounded-[50px] p-10 text-[#2d3a4b] shadow-2xl relative min-h-[520px] flex flex-col justify-between border-b-[12px] transition-all duration-300 ${flashRed ? 'translate-y-2' : ''} ${isReviewMode ? (isQuestionCorrect ? 'border-green-500' : 'border-red-500') : 'border-gray-100'}`}>
              {isReviewMode && (
                <>
                  <button onClick={navPrev} disabled={index === 0} className="absolute left-[-20px] top-1/2 -translate-y-1/2 bg-white text-[#2d5a61] p-3 rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-0 transition-all z-10 cursor-pointer"><ChevronLeft size={32} /></button>
                  <button onClick={navNext} disabled={index === history.length - 1} className="absolute right-[-20px] top-1/2 -translate-y-1/2 bg-white text-[#2d5a61] p-3 rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-0 transition-all z-10 cursor-pointer"><ChevronRight size={32} /></button>
                </>
              )}

              <div>
                <div className="flex justify-between mb-8">
                  <span className="bg-[#f0f4ff] text-[#6165ed] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Question: {currentQuestion.id}</span>
                  
                  {!isReviewMode && (
                    <div className={`flex gap-2 items-center ${shakeHearts ? 'animate-shake' : ''}`}> 
                      {[...Array(3)].map((_, i) => (
                        <Heart 
                          key={i} 
                          size={28}
                          className={`transition-all duration-500 ${i >= lives ? 'text-gray-200 fill-gray-200 scale-75' : 'text-red-500 fill-red-500'}`}
                        />
                      ))} 
                    </div>
                  )}
                </div>
                
                <div className="text-3xl font-medium mb-10 leading-snug">{renderContent(currentQuestion.question)}</div>
                
                {currentQuestion.type === 'mcq' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(currentQuestion.options).map(([key, value]) => {
                        const rawUserAnswer = history[index]?.userAnswer || "";
                        const wasSelected = isReviewMode 
                            ? (rawUserAnswer !== "SKIPPED" && rawUserAnswer.includes(key)) 
                            : selectedMcq.includes(key);
                        const isCorrect = currentQuestion.answer.includes(key);
                        
                        let style = "border-gray-100";
                        
                        if (isReviewMode) {
                          if ((isQuestionCorrect && isCorrect) || (showAnswer && isCorrect)) {
                            style = "border-green-500 bg-green-50 shadow-md scale-[1.02] ring-4 ring-green-100 ring-inset";
                          } 
                          else if (wasSelected && !isQuestionCorrect) {
                            style = "border-red-500 bg-red-50";
                          } 
                          else if (showAnswer || isQuestionCorrect) {
                            style = "opacity-30 grayscale blur-[0.5px]";
                          } else {
                            style = "opacity-50";
                          }
                        } else if (selectedMcq.includes(key)) {
                          style = "border-[#6165ed] bg-[#f0f4ff]";
                        }

                        return (
                          <button 
                            key={key} 
                            onClick={() => !isReviewMode && setSelectedMcq(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} 
                            className={`p-4 rounded-2xl border-4 text-left flex items-start gap-4 transition-all duration-300 ${style} ${isReviewMode ? 'cursor-default' : 'cursor-pointer hover:border-[#6165ed]'}`}
                          >
                            <span className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 ${
                              wasSelected 
                                ? (isReviewMode ? (((isQuestionCorrect || showAnswer) && isCorrect) ? 'bg-green-600' : 'bg-red-600') : 'bg-[#6165ed]') 
                                : 'bg-gray-100 text-gray-400'
                            } text-white`}>
                              {key}
                            </span>
                            <div className="pt-0.5">{renderContent(value)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <input 
                      ref={inputRef} 
                      type="text" 
                      disabled={isReviewMode} 
                      value={isReviewMode ? (isQuestionSkipped ? "" : (history[index]?.userAnswer || '')) : userInput} 
                      onChange={(e) => setUserInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && checkAnswer()} 
                      className={`w-full bg-transparent border-b-8 text-5xl font-black focus:outline-none pb-4 transition-all duration-300 
                        ${shakeInput ? 'animate-shake border-red-500' : ''}
                        ${isReviewMode ? (isQuestionCorrect || showAnswer ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700') : 'border-gray-100 focus:border-[#6165ed]'}`} 
                    />
                  </div>
                )}

                {/* Revealed Answer Box */}
                {isReviewMode && showAnswer && (
                  <div className="mt-6 bg-green-50 border-2 border-green-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
                    <p className="text-xs font-black text-green-600 uppercase mb-1">Answer:</p>
                    <p className="text-3xl font-black text-green-700">{currentQuestion.answer}</p>
                  </div>
                )}

                {/* Revealed Solution Text Box */}
                {isReviewMode && showSolution && (
                  <div className="mt-6 bg-blue-50 border-2 border-blue-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
                    <p className="text-xs font-black text-blue-600 uppercase mb-2 flex items-center gap-2">
                      <FileText size={16} /> Solution Explanation:
                    </p>
                    {isSolutionLoading ? (
                      <p className="text-blue-500 font-bold animate-pulse">Loading solution file...</p>
                    ) : (
                      <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-line font-medium">
                        {renderContent(solutionText)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-between items-center">
                {!isReviewMode ? (
                  <div className="flex w-full justify-between items-center">
                    <button onClick={checkAnswer} className="bg-[#6165ed] text-white px-10 py-5 rounded-2xl font-black text-xl shadow-[0_6px_0_rgb(79,83,209)] active:translate-y-1 cursor-pointer">Check Answer</button>
                    <button onClick={skipQuestion} className="flex items-center gap-2 text-gray-400 font-bold hover:text-orange-500 transition-colors cursor-pointer">
                      <FastForward size={20} /> Skip
                    </button>
                  </div>
                ) : (
                  <div className="flex w-full justify-start items-center gap-4 flex-wrap">
                    <button 
                      ref={revealButtonRef}
                      onClick={() => setShowAnswer(!showAnswer)} 
                      className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 focus:outline-none transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Eye size={18} /> {showAnswer ? "Hide Answer" : "Reveal Answer"}
                    </button>

                    {currentQuestion.solutionFile && (
                      <button 
                        onClick={() => setShowSolution(!showSolution)} 
                        className="bg-[#6165ed] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#5256e0] focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <FileText size={18} /> {showSolution ? "Hide Solution" : "Reveal Solution"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}