import React, { useState, useRef, useEffect } from 'react';
import { 
  Trophy, Star, Compass, Upload, Clock, Target, FastForward, 
  ChevronRight, Heart, CheckCircle2, XCircle, 
  HelpCircle, FileText, Eye, RotateCcw, HelpCircle as QuestionIcon
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

const defaultQuestions = [
  {
    "id": "Sample 1",
    "question": "After taking 3 of the 4 exams in history class, the answer is 76",
    "answer": "76",
    "type": "input",
    "difficulty": 2,
    "solutionFile": "solutions/2021-mathcounts/2021-stretch-29.txt"
  },
  {
    "id": "Sample 2",
    "question": "How many ways can, the answer is 21.",
    "answer": "21",
    "type": "input",
    "difficulty": 5,
    "solutionFile": "solutions/2021-mathcounts/2021-stretch-30.txt"
  }
];

const getStorageItem = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
    return fallback;
  }
};

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
  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem('math_trainer_fileName') || '2021-stretch.json';
  });

  const [questions, setQuestions] = useState(() => getStorageItem('math_trainer_questions', defaultQuestions));
  const [index, setIndex] = useState(() => getStorageItem('math_trainer_index', 0));
  const [userInput, setUserInput] = useState('');
  const [selectedMcq, setSelectedMcq] = useState([]); 

  const [xp, setXp] = useState(() => getStorageItem('math_trainer_xp', 0));
  
  const getFileSpecificKey = (baseKey, currentFileName) => `${baseKey}_${currentFileName || 'default'}`;

  const [questionAttempts, setQuestionAttempts] = useState({});
  
  const [attemptHistory, setAttemptHistory] = useState(() => {
    const fn = localStorage.getItem('math_trainer_fileName') || '2021-stretch.json';
    return getStorageItem(getFileSpecificKey('math_trainer_attempt_history', fn), {});
  });
  
  // Track last submitted answers only in-memory (not persisted in localStorage across page loads)
  const [lastSubmittedAnswers, setLastSubmittedAnswers] = useState({});
  
  // Track which questions were just answered during this active session (in-memory only)
  const [justAnsweredSet, setJustAnsweredSet] = useState([]);

  const [history, setHistory] = useState(() => {
    const fn = localStorage.getItem('math_trainer_fileName') || '2021-stretch.json';
    return getStorageItem(getFileSpecificKey('math_trainer_history', fn), []);
  });

  const [isFinished, setIsFinished] = useState(() => getStorageItem('math_trainer_isFinished', false));
  const [isReviewMode, setIsReviewMode] = useState(() => getStorageItem('math_trainer_isReviewMode', false));
  const [seconds, setSeconds] = useState(() => getStorageItem('math_trainer_seconds', 0));
  const [isActive, setIsActive] = useState(() => getStorageItem('math_trainer_isActive', true));

  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [isSolutionLoading, setIsSolutionLoading] = useState(false);
  const [solutionCache, setSolutionCache] = useState({});
  const [starPos, setStarPos] = useState(null);

  const [shakeHearts, setShakeHearts] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_questions', JSON.stringify(questions)); } catch (e) {}
  }, [questions]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_fileName', fileName); } catch (e) {}
  }, [fileName]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_index', JSON.stringify(index)); } catch (e) {}
  }, [index]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_xp', JSON.stringify(xp)); } catch (e) {}
  }, [xp]);

  useEffect(() => {
    try { localStorage.setItem(getFileSpecificKey('math_trainer_attempt_history', fileName), JSON.stringify(attemptHistory)); } catch (e) {}
  }, [attemptHistory, fileName]);

  useEffect(() => {
    try { localStorage.setItem(getFileSpecificKey('math_trainer_history', fileName), JSON.stringify(history)); } catch (e) {}
  }, [history, fileName]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_isFinished', JSON.stringify(isFinished)); } catch (e) {}
  }, [isFinished]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_isReviewMode', JSON.stringify(isReviewMode)); } catch (e) {}
  }, [isReviewMode]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_seconds', JSON.stringify(seconds)); } catch (e) {}
  }, [seconds]);

  useEffect(() => {
    try { localStorage.setItem('math_trainer_isActive', JSON.stringify(isActive)); } catch (e) {}
  }, [isActive]);

  const safeIndex = Math.min(Math.max(0, index), Math.max(0, questions.length - 1));
  const currentQuestion = questions[safeIndex] || questions[0];
  const maxPotentialXP = questions.length * 50;

  const currentLives = questionAttempts[currentQuestion?.id] !== undefined ? questionAttempts[currentQuestion?.id] : 3;

  const xpBarRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (currentLives > 0 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [safeIndex, isReviewMode, currentLives]);

  useEffect(() => {
    let interval = null;
    if (isActive && !isFinished) {
      interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isFinished]);

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
    fetch(`/${name}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Solution file not found`);
        return res.text();
      })
      .then((text) => {
        setSolutionCache((prev) => ({ ...prev, [name]: text }));
        setSolutionText(text);
        setIsSolutionLoading(false);
      })
      .catch(() => {
        setSolutionText('Solution explanation file is not present in the public directory.');
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
    setUserInput('');
    setSelectedMcq([]);
  };

  const navNext = () => {
    if (safeIndex < questions.length - 1) {
      jumpToQuestion(safeIndex + 1);
    }
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

  const recordQuestionOutcome = (qId, outcomeResult) => {
    setAttemptHistory(prev => {
      const currentList = prev[qId] || [];
      const updatedList = [...currentList, outcomeResult];
      return { ...prev, [qId]: updatedList.slice(-5) };
    });
  };

  const markAsJustAnswered = (qId) => {
    setJustAnsweredSet(prev => prev.includes(qId) ? prev : [...prev, qId]);
  };

  const checkAnswer = () => {
    if (currentLives <= 0) return;

    let finalInput = currentQuestion.type === 'mcq' 
      ? [...selectedMcq].sort().join(", ") 
      : userInput.trim();

    if (finalInput === "") {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 500);
      return;
    }

    setLastSubmittedAnswers(prev => ({ ...prev, [currentQuestion.id]: finalInput }));
    markAsJustAnswered(currentQuestion.id);
    setUserInput(''); 

    const attemptsUsed = 3 - currentLives + 1;
    const isCorrect = finalInput.replace(/\s/g, '') === String(currentQuestion.answer).replace(/\s/g, '');

    if (isCorrect) {
      recordQuestionOutcome(currentQuestion.id, true);

      const earnedXP = 50 - ((attemptsUsed - 1) * 10);
      setHistory(prev => {
        const filtered = prev.filter(item => item.id !== currentQuestion.id);
        return [...filtered, { id: currentQuestion.id, status: "Correct", solved: true, userAnswer: finalInput, earnedXP, attempts: attemptsUsed }];
      });
      triggerStarAnimation(earnedXP);
    } else {
      triggerWrongAnswerFeedback();
      const newLives = currentLives - 1;
      
      setQuestionAttempts(prev => ({ ...prev, [currentQuestion.id]: newLives }));

      if (newLives <= 0) {
        recordQuestionOutcome(currentQuestion.id, false);

        setHistory(prev => {
          const filtered = prev.filter(item => item.id !== currentQuestion.id);
          return [...filtered, { id: currentQuestion.id, status: "Failed", solved: false, userAnswer: finalInput, earnedXP: 0, attempts: 3 }];
        });
        
        setTimeout(() => {
          navNext();
        }, 1000);
      }
    }
  };

  const skipQuestion = () => {
    setUserInput('');
    const attemptsUsed = 3 - currentLives + 1;
    setLastSubmittedAnswers(prev => ({ ...prev, [currentQuestion.id]: "SKIPPED" }));
    markAsJustAnswered(currentQuestion.id);
    
    recordQuestionOutcome(currentQuestion.id, false);

    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== currentQuestion.id);
      return [...filtered, { 
        id: currentQuestion.id, 
        status: "Skipped", 
        solved: false, 
        userAnswer: "SKIPPED", 
        earnedXP: 0, 
        attempts: attemptsUsed 
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

  const resetProgress = () => {
    // Clear only storage keys associated with the current file and general session progress
    localStorage.removeItem(getFileSpecificKey('math_trainer_history', fileName));
    localStorage.removeItem(getFileSpecificKey('math_trainer_attempt_history', fileName));
    localStorage.removeItem('math_trainer_isFinished');
    localStorage.removeItem('math_trainer_isReviewMode');
    localStorage.removeItem('math_trainer_seconds');
    localStorage.removeItem('math_trainer_isActive');
    localStorage.removeItem('math_trainer_xp');

    // Reset local state for the current file while preserving the current question set
    setHistory([]);
    setXp(0);
    setSeconds(0);
    setQuestionAttempts({});
    setAttemptHistory({});
    setLastSubmittedAnswers({});
    setJustAnsweredSet([]);
    setIsActive(true);
    setIsFinished(false);
    setIsReviewMode(false);
    setSolutionCache({});
    setUserInput('');
    setSelectedMcq([]);
    setShowAnswer(false);
    setShowSolution(false);
    setIndex(0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const newFileName = file.name;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) throw new Error("JSON must be an array of question objects");
        
        setFileName(newFileName);
        setQuestions(data);
        setIndex(0); 
        
        const savedHistory = getStorageItem(getFileSpecificKey('math_trainer_history', newFileName), []);
        const savedAttemptHist = getStorageItem(getFileSpecificKey('math_trainer_attempt_history', newFileName), {});

        setHistory(savedHistory);
        setQuestionAttempts({}); 
        setAttemptHistory(savedAttemptHist);
        setLastSubmittedAnswers({});
        setJustAnsweredSet([]);
        
        setXp(0); 
        setSeconds(0); 
        setIsActive(true); 
        setIsFinished(false); 
        setIsReviewMode(false);
        setSolutionCache({});
        setUserInput('');
        setSelectedMcq([]);
        setShowAnswer(false);
        setShowSolution(false);
      } catch (err) { alert("Invalid JSON file format."); }
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const headerUI = (
    <div className="flex justify-between items-center mb-6 text-white">
      <div className="bg-[#1e3238]/60 px-4 py-2 rounded-xl flex items-center gap-3 font-mono font-bold text-sm">
        <Clock size={16} /> {formatTime(seconds)}
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={resetProgress}
          title="Clear History"
          className="bg-[#2a454d] px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black text-white hover:bg-[#34555f] transition-all cursor-pointer"
        >
          <RotateCcw size={14} /> Clear History
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-[#2a454d] px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black text-white hover:bg-[#34555f] transition-all cursor-pointer"
        >
          <Upload size={14} /> Load JSON
        </button>
      </div>
      <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
    </div>
  );

  if (isFinished) {
    const totalQuestions = questions.length;
    const totalCorrect = history.filter(h => h.solved).length;
    const totalIncorrect = history.filter(h => h.status === "Failed").length;
    
    const accuracyPercent = totalQuestions > 0 
      ? (totalCorrect / totalQuestions) * 100 
      : 0;

    return (
      <div className="min-h-screen bg-[#354f52] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[40px] p-8 shadow-2xl max-w-2xl w-full text-[#2d3a4b]">
          {headerUI}
          <div className="text-center mb-6">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={50} />
            <h2 className="text-4xl font-black text-[#354f52] mb-1">Level Complete!</h2>
            <p className="text-gray-400 font-bold mb-6">{formatTitle(fileName)}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 rounded-3xl p-5 border border-gray-100">
               <div className="flex flex-col items-center justify-center p-2">
                 <div className="flex items-center gap-1 text-gray-400 font-black text-[10px] uppercase tracking-wider mb-1">
                   <QuestionIcon size={12} /> Total
                 </div>
                 <div className="text-2xl font-black text-[#354f52]">{totalQuestions}</div>
               </div>

               <div className="flex flex-col items-center justify-center p-2 border-l border-gray-200">
                 <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase tracking-wider mb-1">
                   <CheckCircle2 size={12} /> Correct
                 </div>
                 <div className="text-2xl font-black text-green-600">{totalCorrect}</div>
               </div>

               <div className="flex flex-col items-center justify-center p-2 border-l border-gray-200">
                 <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase tracking-wider mb-1">
                   <XCircle size={12} /> Incorrect
                 </div>
                 <div className="text-2xl font-black text-red-500">{totalIncorrect}</div>
               </div>

               <div className="flex flex-col items-center justify-center p-2 border-l border-gray-200">
                 <div className="flex items-center gap-1 text-[#6165ed] font-black text-[10px] uppercase tracking-wider mb-1">
                   <Target size={12} /> Accuracy
                 </div>
                 <div className="text-2xl font-black text-[#6165ed]">{accuracyPercent.toFixed(1)}%</div>
               </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 px-1">Question Results</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {questions.map((q, qIdx) => {
                const qHistory = history.find(h => h.id === q.id);
                let badge = null;
                let bgClass = "bg-gray-50 border-gray-200";

                if (qHistory?.status === "Correct") {
                  badge = (
                    <span className="flex items-center gap-1.5 text-green-600 font-extrabold text-xs bg-green-100 px-3 py-1 rounded-full">
                      <CheckCircle2 size={14} /> Correct
                    </span>
                  );
                  bgClass = "bg-green-50/50 border-green-200";
                } else if (qHistory?.status === "Failed") {
                  badge = (
                    <span className="flex items-center gap-1.5 text-red-600 font-extrabold text-xs bg-red-100 px-3 py-1 rounded-full">
                      <XCircle size={14} /> Incorrect
                    </span>
                  );
                  bgClass = "bg-red-50/50 border-red-200";
                } else if (qHistory?.status === "Skipped") {
                  badge = (
                    <span className="flex items-center gap-1.5 text-amber-600 font-extrabold text-xs bg-amber-100 px-3 py-1 rounded-full">
                      <HelpCircle size={14} /> Skipped
                    </span>
                  );
                  bgClass = "bg-amber-50/50 border-amber-200";
                } else {
                  badge = (
                    <span className="text-gray-400 font-bold text-xs bg-gray-100 px-3 py-1 rounded-full">
                      Unattempted
                    </span>
                  );
                }

                return (
                  <div key={q.id || qIdx} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${bgClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#354f52]">{q.id}</span>
                      <span className="text-xs font-bold text-gray-400">(Difficulty: {q.difficulty ?? 1})</span>
                    </div>
                    <div className="shrink-0">{badge}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => {
                setIsReviewMode(true); 
                setIsFinished(false); 
                jumpToQuestion(0);
              }} 
              className="flex-1 bg-[#6165ed] text-white py-4 rounded-2xl font-black shadow-[0_5px_0_rgb(79,83,209)] cursor-pointer"
            >
              Review
            </button>
            <button 
              onClick={() => {
                setQuestionAttempts({});
                setJustAnsweredSet([]);
                setLastSubmittedAnswers({});
                setIsFinished(false);
                setIsReviewMode(false);
                setIsActive(true);
                jumpToQuestion(0);
              }} 
              className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isReviewingQuestion = isReviewMode;

  return (
    <div className={`min-h-screen p-8 text-white font-sans overflow-hidden transition-colors duration-300 ${flashRed ? 'bg-red-900' : 'bg-[#354f52]'}`}>
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
      
      <div className="max-w-7xl mx-auto">
        {headerUI}
        
        {/* Header Navigation */}
        <nav className="flex justify-between items-center mb-8 gap-4">
           <div className="flex items-center gap-3">
              <div className="bg-white p-2.5 rounded-2xl shrink-0"><Compass className="text-[#354f52]" size={30} /></div>
              <h1 className="text-2xl font-black tracking-tight shrink-0">MATH TRAINER</h1>
           </div>

           <div className="text-center font-black text-3xl tracking-wide text-white drop-shadow-sm truncate px-4">
              {formatTitle(fileName)}
           </div>

           <div ref={xpBarRef} className="bg-[#1e3238]/80 rounded-full px-5 py-2.5 flex items-center gap-4 border border-white/10 shrink-0">
              <span className="font-mono text-xs font-black">{xp} XP</span>
              <div className="w-36 h-2 bg-black/40 rounded-full overflow-hidden">
                <div className="bg-yellow-400 h-full transition-all duration-500" style={{ width: `${(xp / Math.max(maxPotentialXP, 1)) * 100}%` }}></div>
              </div>
           </div>
        </nav>

        {/* Sidebar & Workspace */}
        <div className="flex flex-col md:flex-row gap-8 items-stretch">
          
          {/* Sidebar Questions List */}
          <aside className="w-full md:w-80 bg-[#2a4144]/80 rounded-[35px] p-6 border border-white/5 shrink-0 flex flex-col justify-between">
            <div className="flex flex-col min-h-0 h-full">
              <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-5 px-1 shrink-0">
                QUESTIONS ({questions.length})
              </h3>
              
              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar p-0.5 flex-1 min-h-0">
                {questions.map((q, qIdx) => {
                  const isCurrent = qIdx === safeIndex;
                  const attemptResults = attemptHistory[q.id] || [];
                  const wasJustAnswered = justAnsweredSet.includes(q.id);

                  let bgClass = "bg-[#3f5d60]/60 text-white/90 hover:bg-[#48696d]";
                  if (isCurrent) {
                    bgClass = "bg-[#48696d] text-white font-black ring-2 ring-white/30";
                  }

                  return (
                    <button
                      key={q.id || qIdx}
                      onClick={() => jumpToQuestion(qIdx)}
                      className={`relative flex items-center justify-between w-full px-4 py-3.5 rounded-full font-bold text-xs transition-all duration-200 cursor-pointer shrink-0 ${bgClass}`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {/* Highlight indicator in Review Mode for questions just answered in this run */}
                        {isReviewMode && wasJustAnswered && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_6px_rgba(129,140,248,0.9)]" title="You just answered this question in this run" />
                        )}
                        <span className="truncate">{q.id} ({q.difficulty ?? 1})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {attemptResults.length > 0 && (
                          <div className="flex items-center gap-1">
                            {attemptResults.map((wasCorrect, i) => (
                              <span 
                                key={i} 
                                className={`w-2.5 h-2.5 rounded-full ${wasCorrect ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Bottom Action Buttons (Outside scroll view) */}
            <div className="mt-6 flex flex-col gap-3 shrink-0">
              {!isReviewMode && (
                <button 
                  onClick={() => {
                    setIsFinished(true);
                    setIsActive(false);
                  }} 
                  className="w-full bg-emerald-500 text-white py-4 px-4 rounded-2xl font-black shadow-[0_4px_0_rgb(16,150,90)] hover:bg-emerald-400 active:translate-y-0.5 transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Done
                </button>
              )}

              {isReviewMode && (
                <button 
                  onClick={() => setIsFinished(true)} 
                  className="w-full bg-[#6b67f5] text-white py-4 px-4 rounded-2xl font-black shadow-[0_4px_0_rgb(82,78,200)] hover:bg-[#5b57e0] active:translate-y-0.5 transition-all cursor-pointer text-sm"
                >
                  Back to Summary
                </button>
              )}
            </div>
          </aside>

          {/* Question Card */}
          <main className="flex-1 w-full">
            <div className={`bg-white rounded-[50px] p-12 text-[#2d3a4b] shadow-2xl relative min-h-[560px] flex flex-col justify-between border-b-[14px] transition-all duration-300 ${flashRed ? 'translate-y-2' : ''} border-gray-100`}>
              
              <button onClick={navNext} disabled={safeIndex === questions.length - 1} className="absolute right-[-24px] top-1/2 -translate-y-1/2 bg-white text-[#354f52] p-4 rounded-full shadow-xl hover:bg-gray-50 disabled:opacity-0 transition-all z-10 cursor-pointer border border-gray-100">
                <ChevronRight size={28} />
              </button>

              <div>
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#eeeffc] text-[#6165ed] px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                      QUESTION: {currentQuestion.id}
                    </span>
                    {/* Badge showing if user just answered this question in this run */}
                    {isReviewMode && justAnsweredSet.includes(currentQuestion.id) && (
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Just Answered
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {(attemptHistory[currentQuestion.id] && attemptHistory[currentQuestion.id].length > 0) && (
                      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 mr-0.5">History:</span>
                        {attemptHistory[currentQuestion.id].map((wasCorrect, i) => (
                          <span 
                            key={i} 
                            className={`w-3 h-3 rounded-full ${wasCorrect ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'}`}
                          />
                        ))}
                      </div>
                    )}

                    {!isReviewMode && (
                      <div className={`flex gap-2 items-center ${shakeHearts ? 'animate-shake' : ''}`}> 
                        {[...Array(3)].map((_, i) => (
                          <Heart 
                            key={i} 
                            size={28}
                            className={`transition-all duration-500 ${i >= currentLives ? 'text-gray-200 fill-gray-200 scale-75' : 'text-red-500 fill-red-500'}`}
                          />
                        ))} 
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-3xl font-bold mb-10 leading-relaxed text-[#2c3e50]">
                  {renderContent(currentQuestion.question)}
                </div>

                {currentQuestion.image && (
                  <div className="mb-8 flex justify-center">
                    <img 
                      src={currentQuestion.image} 
                      alt={`Diagram for ${currentQuestion.id}`} 
                      className="max-h-64 object-contain rounded-2xl border border-gray-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Question Options / Input */}
                {currentQuestion.type === 'mcq' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentQuestion.options && Object.entries(currentQuestion.options).map(([key, value]) => {
                      const isCorrect = String(currentQuestion.answer).includes(key);
                      let style = "border-gray-100";
                      
                      if (isReviewingQuestion) {
                        if (showAnswer && isCorrect) {
                          style = "border-green-500 bg-green-50 shadow-md";
                        } else {
                          style = "opacity-40";
                        }
                      } else if (selectedMcq.includes(key)) {
                        style = "border-[#6165ed] bg-[#f0f4ff]";
                      }

                      return (
                        <button 
                          key={key} 
                          disabled={!isReviewMode && currentLives <= 0}
                          onClick={() => !isReviewingQuestion && currentLives > 0 && setSelectedMcq(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])} 
                          className={`p-4 rounded-2xl border-4 text-left flex items-start gap-4 transition-all ${style} ${!isReviewMode && currentLives <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span className="w-8 h-8 rounded bg-gray-100 font-bold text-sm flex items-center justify-center shrink-0">
                            {key}
                          </span>
                          <div className="pt-0.5">{renderContent(value)}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!isReviewingQuestion && currentLives > 0 && (
                      <input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                        className={`text-4xl sm:text-5xl font-black text-[#2c3e50] border-b-4 border-gray-300 focus:border-[#6165ed] outline-none pb-3 w-full transition-all ${shakeInput ? 'animate-shake border-red-500' : ''}`}
                      />
                    )}
                  </div>
                )}

                {/* Review Mode: Display Your Most Recent Answer ONLY IF YOU JUST ANSWERED IT IN THIS RUN */}
                {isReviewingQuestion && justAnsweredSet.includes(currentQuestion.id) && (
                  <div className="mt-6 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[240px] bg-gray-50 border-2 border-gray-200 p-5 rounded-2xl">
                      <p className="text-xs font-black text-gray-400 uppercase mb-1">Your Most Recent Answer:</p>
                      <p className={`text-2xl font-black ${
                        lastSubmittedAnswers[currentQuestion.id] === undefined || lastSubmittedAnswers[currentQuestion.id] === "SKIPPED" 
                          ? "text-amber-600" 
                          : String(lastSubmittedAnswers[currentQuestion.id]).replace(/\s/g, '') === String(currentQuestion.answer).replace(/\s/g, '')
                            ? "text-emerald-600"
                            : "text-rose-600"
                      }`}>
                        {lastSubmittedAnswers[currentQuestion.id] !== undefined 
                          ? renderContent(lastSubmittedAnswers[currentQuestion.id]) 
                          : <span className="text-gray-400 italic text-lg">No answer recorded yet</span>}
                      </p>
                    </div>

                    {showAnswer && (
                      <div className="flex-1 min-w-[240px] bg-emerald-50 border-2 border-emerald-200 p-5 rounded-2xl">
                        <p className="text-xs font-black text-emerald-600 uppercase mb-1">Correct Answer:</p>
                        <p className="text-2xl font-black text-emerald-700">{renderContent(currentQuestion.answer)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* If reviewing a question you didn't just answer in this run, but Show Answer is clicked */}
                {isReviewingQuestion && !justAnsweredSet.includes(currentQuestion.id) && showAnswer && (
                  <div className="mt-6 bg-emerald-50 border-2 border-emerald-200 p-6 rounded-2xl">
                    <p className="text-xs font-black text-emerald-600 uppercase mb-1">Correct Answer:</p>
                    <p className="text-3xl font-black text-emerald-700">{renderContent(currentQuestion.answer)}</p>
                  </div>
                )}

                {/* Revealed Solution Panel */}
                {isReviewingQuestion && showSolution && currentQuestion?.solutionFile && (
                  <div className="mt-6 bg-blue-50 border-2 border-blue-200 p-6 rounded-2xl">
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
              
              {/* Bottom Controls */}
              <div className="mt-8 flex justify-between items-center">
                {!isReviewMode && (
                  <div className="flex w-full justify-between items-center">
                    <button 
                      onClick={checkAnswer} 
                      disabled={currentLives <= 0}
                      className="bg-[#6165ed] text-white px-10 py-5 rounded-2xl font-black text-xl shadow-[0_6px_0_rgb(79,83,209)] active:translate-y-1 cursor-pointer hover:bg-[#5256e0] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Check Answer
                    </button>
                    <button onClick={skipQuestion} className="flex items-center gap-2 text-gray-400 font-bold hover:text-orange-500 transition-colors cursor-pointer">
                      <FastForward size={20} /> Skip
                    </button>
                  </div>
                )}

                {isReviewMode && (
                  <div className="flex w-full justify-start items-center gap-4">
                    <button 
                      onClick={() => setShowAnswer(!showAnswer)} 
                      className="bg-[#1e2a38] text-white px-7 py-3.5 rounded-2xl font-black text-sm hover:bg-[#2b3a4c] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Eye size={18} /> {showAnswer ? "Hide Answer" : "Show Answer"}
                    </button>

                    {Boolean(currentQuestion?.solutionFile) && (
                      <button 
                        onClick={() => setShowSolution(!showSolution)} 
                        className="bg-[#6165ed] text-white px-7 py-3.5 rounded-2xl font-black text-sm hover:bg-[#5b57e0] transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <FileText size={18} /> {showSolution ? "Hide Solution" : "Show Solution"}
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