import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Terminal, Archive, PlusCircle, Send, Copy, Check, Cpu, ShieldCheck, Zap, 
  ChevronRight, Search, Code2, Trash2, Lock, Settings, User, ShieldAlert, Hash, 
  Database, Bell, HardDrive, Eye, Edit3, X, ArrowUpCircle, FileCode, 
  Calendar, Layers, MapPin, Package, Command, PlayCircle, Wrench, Info, Server, 
  FileSearch, ShieldQuestion, BookOpen, Lightbulb, Rocket, ListChecks, TerminalSquare,
  Sparkles, Globe, Shield, Radio, Power, History, Star, MessageSquare,
  TrendingUp, BarChart3, Activity as ActivityIcon, ShieldEllipsis, AlertTriangle,
  Download, Share2, Filter, Gauge, Fingerprint, RefreshCcw, Microscope,
  Bug, ShieldX, Scan, EyeOff, FlaskConical, Binary, 
  Sliders, LayoutGrid, Network, Key, Bot, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = window.location.pathname.includes('/1818/') ? '/1818/api/v1' : 'api/v1';
const FALLBACK_LANGUAGES = ["python", "bash", "javascript", "typescript", "c++", "rust", "go", "ruby", "php", "java", "sql"];
const NOTICE_TIMEOUT_MS = 4500;

function App() {
  const [activeTab, setActiveTab] = useState('navigator');
  const [adminSubTab, setAdminSubTab] = useState('dashboard');
  const [userInput, setUserInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [availableLanguages, setAvailableLanguages] = useState(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scripts, setScripts] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [notice, setNotice] = useState(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [config, setConfig] = useState({ chat_limit: 50, storage_limit: 500, node_limit: 20, request_rate: 100, broadcast: '', maintenance_mode: false });
  const [govLimits, setGovLimits] = useState({ chat_limit: 50, storage_limit: 500, node_limit: 20, request_rate: 100 });
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const configInitialised = useRef(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [systemHealth, setSystemHealth] = useState({ cpu_usage: 0, memory_usage: 0, active_threads: 0, disk_io: 0, network_latency: 0, uptime_seconds: 0, ollama_status: 'unknown' });
  const [healthHistory, setHealthHistory] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [sandboxCode, setSandboxCode] = useState('');
  const [sandboxOutput, setSandboxOutput] = useState('');
  const [sandboxing, setSandboxing] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inspectDeployment, setInspectDeployment] = useState(null);
  const [deployForm, setDeployForm] = useState({ name: '', description: '', author: '', language: 'python', code: '', quality_score: 'B', version: '1.0.0' });
  const [messages, setMessages] = useState([{ id: 1, role: 'bot', text: 'Hello. I am your Neural Assistant. How can I help you today?' }]);
  const [aiModels, setAiModels] = useState([]);
  const [modelForgeFile, setModelForgeFile] = useState(null);
  const [modelForging, setModelForging] = useState(false);
  const [forgedModelData, setForgedModelData] = useState(null);
  const [neuralModels, setNeuralModels] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const chatEndRef = useRef(null);
  const termEndRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  const adminTokenRef = useRef('');
  const isAdminRef = useRef(false);

  const setAdminTokenSafe = (token) => {
    adminTokenRef.current = token;
    setAdminToken(token);
  };
  const setIsAdminSafe = (val) => {
    isAdminRef.current = val;
    setIsAdmin(val);
  };

  const showNotice = (text, type = 'info') => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    setNotice({ text, type });
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
  };

  const addNotice = (text, type = 'info') => showNotice(text, type);

  // --- SERVERLESS MOCK INFRASTRUCTURE ---
  const MOCK_AI_RESPONSES = [
    "Neural sequence initialized. I have analyzed your objective and optimized the protocol for maximum efficiency.",
    "Data integrity verified. The requested script has been staged in the Archive Vault for review.",
    "GHOST_SHELL core active. I am standing by for further instructions on the current deployment.",
    "Protocol forge complete. The generated code adheres to all safety and performance guidelines.",
  ];

  const getLocalStorageData = (key, defaultValue) => {
    const saved = localStorage.getItem(`ghost_shell_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  const setLocalStorageData = (key, data) => {
    localStorage.setItem(`ghost_shell_${key}`, JSON.stringify(data));
  };

  const fetchScripts = useCallback(() => {
    const data = getLocalStorageData('scripts', [
      { slug: 'system-monitor', name: 'System Monitor', description: 'Real-time telemetry collector.', author: 'ROOT', language: 'python', code: '# Mock System Monitor Code\nprint("Monitoring active...")', created_at: new Date().toISOString() }
    ]);
    setScripts(data);
  }, []);

  const fetchDeployments = useCallback(() => {
    const data = getLocalStorageData('deployments', []);
    setDeployments(data);
  }, []);

  const fetchConfig = useCallback(() => {
    const data = getLocalStorageData('config', {
      chat_limit: 50, storage_limit: 500, node_limit: 20, request_rate: 100, maintenance_mode: false, broadcast: "GHOST_SHELL STATIC DEMO ACTIVE"
    });
    setConfig(data);
    if (!configInitialised.current) {
      setGovLimits({
        chat_limit: data.chat_limit,
        storage_limit: data.storage_limit,
        node_limit: data.node_limit,
        request_rate: data.request_rate,
      });
      setBroadcastDraft(data.broadcast);
      setMaintenanceMode(data.maintenance_mode);
      configInitialised.current = true;
    }
  }, []);

  const fetchLanguages = useCallback(() => {
    const langs = ["python", "javascript", "bash", "rust", "go", "typescript"];
    setAvailableLanguages(langs);
    setSelectedLanguage(langs[0]);
    setDeployForm(c => ({ ...c, language: langs[0] }));
  }, []);

  const fetchHealth = useCallback(() => {
    setSystemHealth({
      cpu_usage: Math.floor(Math.random() * 20) + 5,
      memory_usage: 1024 + Math.floor(Math.random() * 512),
      active_threads: 12,
      disk_io: 45,
      network_latency: 12,
      uptime_seconds: 3600,
      ollama_status: "running"
    });
    setHealthHistory(prev => [...prev.slice(-15), Math.floor(Math.random() * 20) + 5]);
  }, []);

  const fetchActivity = useCallback(() => {
    const data = getLocalStorageData('activity', [
      { action: "Platform Initialized", user: "SYSTEM", timestamp: new Date().toISOString(), details: {} }
    ]);
    setActivityFeed(data);
  }, []);

  const fetchModels = useCallback(() => {
    setAiModels(["qwen3:4b", "llama3:8b", "mistral:7b"]);
  }, []);

  const fetchNeuralModels = useCallback(() => {
    const data = getLocalStorageData('neural_models', []);
    setNeuralModels(data);
  }, []);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem('script_shell_admin_token');
    if (savedToken) {
      adminTokenRef.current = savedToken;
      isAdminRef.current = true;
      setAdminToken(savedToken);
      setIsAdmin(true);
    }
    const syncLayout = () => setIsCompactLayout(window.innerWidth < 1100);
    syncLayout();
    window.addEventListener('resize', syncLayout);
    
    fetchScripts(); fetchDeployments(); fetchConfig(); fetchLanguages(); fetchModels(); fetchNeuralModels();
    
    const interval = setInterval(() => {
      fetchConfig();
      fetchDeployments();
      fetchModels();
      if (isAdminRef.current) { fetchHealth(); fetchActivity(); fetchNeuralModels(); }
    }, 4000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', syncLayout);
    };
  }, [fetchConfig, fetchScripts, fetchDeployments, fetchModels, fetchHealth, fetchActivity, fetchLanguages, fetchNeuralModels]);

  const updateConfig = (patch) => {
    const newConfig = { ...config, ...patch };
    setLocalStorageData('config', newConfig);
    setConfig(newConfig);
    if (patch.broadcast !== undefined) setBroadcastDraft(patch.broadcast);
    if (patch.maintenance_mode !== undefined) setMaintenanceMode(patch.maintenance_mode);
    if (patch.chat_limit !== undefined || patch.storage_limit !== undefined || patch.node_limit !== undefined || patch.request_rate !== undefined) {
      setGovLimits(prev => ({
        chat_limit: patch.chat_limit ?? prev.chat_limit,
        storage_limit: patch.storage_limit ?? prev.storage_limit,
        node_limit: patch.node_limit ?? prev.node_limit,
        request_rate: patch.request_rate ?? prev.request_rate,
      }));
    }
    showNotice('Governance updated successfully.', 'success');
  };

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isChatLoading) return;
    const userMsg = { id: Date.now(), role: 'user', text: userInput };
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setIsChatLoading(true);
    
    setTimeout(() => {
      const aiMsg = { id: Date.now() + 1, role: 'assistant', text: MOCK_AI_RESPONSES[Math.floor(Math.random() * MOCK_AI_RESPONSES.length)] };
      setMessages(prev => [...prev, aiMsg]);
      setIsChatLoading(false);
    }, 1500);
  };

  const analyzeCode = async () => {
    if (!deployForm.code) return;
    setAnalyzing(true);
    setTimeout(() => {
      setDeployForm(prev => ({
        ...prev,
        name: "ANALYSED_PROTOCOL_" + Math.floor(Math.random() * 1000),
        description: "Static analysis completed on neural stream. High efficiency detected.",
        author: "STATIC_ANALYSER",
        quality_score: "A",
        version: "1.0.0"
      }));
      showNotice('Analysis completed.', 'success');
      setAnalyzing(false);
    }, 1500);
  };

  const finalizeDeployment = async () => {
    if (!deployForm.name || !deployForm.code) return;
    setLoading(true);
    setTimeout(() => {
      const newScript = {
        ...deployForm,
        slug: deployForm.name.toLowerCase().replace(/ /g, '-'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const current = getLocalStorageData('scripts', []);
      setLocalStorageData('scripts', [...current, newScript]);
      setScripts([...current, newScript]);
      setDeployForm({ name: '', description: '', author: '', language: availableLanguages[0] || 'python', code: '', quality_score: 'B', version: '1.0.0' });
      showNotice('Protocol indexed successfully.', 'success');
      setLoading(false);
      setActiveTab('library');
    }, 1000);
  };

  const stageScript = async (script) => {
    const newDep = {
      ...script,
      status: "STAGED",
      staged_at: new Date().toISOString(),
      deployed_at: null
    };
    const current = getLocalStorageData('deployments', []);
    const updated = [...current, newDep];
    setLocalStorageData('deployments', updated);
    setDeployments(updated);
    showNotice(`Staged ${script.name}.`, 'success');
  };

  const deployToDisk = async (name) => {
    const current = getLocalStorageData('deployments', []);
    const updated = current.map(d => d.name === name ? { ...d, status: 'DEPLOYED', deployed_at: new Date().toISOString() } : d);
    setLocalStorageData('deployments', updated);
    setDeployments(updated);
    showNotice(`${name} activated successfully.`, 'success');
  };

  const terminateDeployment = async (name) => {
    const current = getLocalStorageData('deployments', []);
    const updated = current.map(d => d.name === name ? { ...d, status: 'TERMINATED' } : d);
    setLocalStorageData('deployments', updated);
    setDeployments(updated);
    showNotice(`${name} terminated.`, 'success');
  };

  const deleteDeployment = async (name) => {
    if (!window.confirm(`TERMINATE_NODE: Permanently wipe ${name}?`)) return;
    const current = getLocalStorageData('deployments', []);
    const updated = current.filter(d => d.name !== name);
    setLocalStorageData('deployments', updated);
    setDeployments(updated);
    showNotice(`${name} removed from registry.`, 'success');
  };

  const deleteScript = async (name) => {
    if (!window.confirm(`PURGE_PROTOCOL: Permanently wipe ${name} from Archive Vault?`)) return;
    const current = getLocalStorageData('scripts', []);
    const updated = current.filter(s => s.name !== name);
    setLocalStorageData('scripts', updated);
    setScripts(updated);
    showNotice(`Purged ${name} from archive.`, 'success');
  };

  const forgeModel = async () => {
    if (!modelForgeFile) return;
    setModelForging(true);
    setTimeout(() => {
      setForgedModelData({
        name: modelForgeFile.name.split('.')[0],
        description: "Neural core logic extracted from binary weights.",
        author: "FORGE_PROCESS",
        technical_overview: "Advanced neural patterns detected. Optimization level: ALPHA.",
        key_features: ["Neural Link", "Pattern Recognition", "Logic Synthesis"],
        quality_score: "A",
        risk_level: "LOW",
        classes: ["object", "anomaly", "pattern"]
      });
      showNotice('Neural model forged successfully.', 'success');
      setModelForging(false);
    }, 2000);
  };

  const saveForgedModel = async () => {
    if (!forgedModelData) return;
    const newScript = {
      ...forgedModelData,
      slug: forgedModelData.name.toLowerCase().replace(/ /g, '-'),
      code: '# Forged Neural Logic\nprint("Neural model active")',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const current = getLocalStorageData('scripts', []);
    setLocalStorageData('scripts', [...current, newScript]);
    setScripts([...current, newScript]);
    setForgedModelData(null);
    setModelForgeFile(null);
    showNotice('Forged model indexed to vault.', 'success');
    setActiveTab('neural_vault');
  };

  const deleteNeuralModel = async (name) => {
    if (!window.confirm(`PURGE_MODEL: Permanently wipe ${name}?`)) return;
    const current = getLocalStorageData('neural_models', []);
    const updated = current.filter(m => m.name !== name);
    setLocalStorageData('neural_models', updated);
    setNeuralModels(updated);
    showNotice(`Purged ${name}.`, 'success');
  };

  const handleTerminalKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      execTerminal();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
        const newIdx = historyIndex + 1; setHistoryIndex(newIdx); setTerminalInput(terminalHistory[terminalHistory.length - 1 - newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1; setHistoryIndex(newIdx); setTerminalInput(terminalHistory[terminalHistory.length - 1 - newIdx]);
      } else { setHistoryIndex(-1); setTerminalInput(''); }
    }
  };

  const execTerminal = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput; setTerminalHistory(prev => [...prev, cmd]); setHistoryIndex(-1); setTerminalInput('');
    setTerminalOutput(prev => [...prev, { type: 'in', text: `root@script_shell:~$ ${cmd}` }]);
    setTimeout(() => {
      setTerminalOutput(prev => [...prev, { type: 'out', text: `Executing: ${cmd}...\nCommand simulated successfully in static mode.` }]);
    }, 500);
  };

  const runSandbox = () => {
    if (!sandboxCode.trim()) return;
    setSandboxing(true); setSandboxOutput('NEURAL_SIMULATION_ACTIVE...');
    setTimeout(() => {
      setSandboxOutput('Simulation successful.\nNo logic breaches detected.\nOutput: Hello from GHOST_SHELL');
      setSandboxing(false);
    }, 1500);
  };

  const handleLogin = () => {
    if (adminPass === 'admin123') {
      const token = 'mock_token_' + Date.now();
      window.sessionStorage.setItem('script_shell_admin_token', token);
      setAdminTokenSafe(token);
      setIsAdminSafe(true);
      setShowLogin(false);
      setAdminPass('');
      setActiveTab('admin');
      showNotice('Admin authentication successful.', 'success');
    } else {
      showNotice('ACCESS DENIED: Invalid Credentials', 'error');
    }
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem('script_shell_admin_token');
    setAdminTokenSafe('');
    setIsAdminSafe(false);
    setActiveTab('navigator');
    showNotice('Logged out of admin console.', 'info');
  };

  const MarkdownContent = ({ content }) => {
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            
            return !inline ? (
              <div className="script-ingot" style={{ margin: '32px 0', borderRadius: '24px', background: '#08090a', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                <div className="ingot-header" style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyber-primary)' }} />
                     <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '0.05em' }}>{lang.toUpperCase() || 'CORE_LOGIC'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-micro" onClick={() => {
                       setDeployForm({ name: 'UNNAMED_IMPORT', description: 'Imported from Neural Assistant', language: lang || 'python', code: codeString, quality_score: 'B', version: '1.0.0' });
                       setActiveTab('deploy');
                       showNotice('Code imported to Protocol Forge.', 'success');
                    }} style={{ background: 'rgba(0,242,255,0.1)', color: 'var(--cyber-primary)' }}>FORGE</button>
                    <button className="btn-micro" onClick={() => {
                       navigator.clipboard.writeText(codeString);
                       showNotice('Copied to clipboard.', 'success');
                    }}>COPY</button>
                  </div>
                </div>
                <pre className="custom-scrollbar" style={{ padding: '32px', fontSize: '0.92rem', color: '#999', lineHeight: '1.8', overflowX: 'auto', margin: 0, background: 'linear-gradient(to bottom right, #08090a, #0c0d0f)' }}>
                  <code className={className} {...props}>{children}</code>
                </pre>
              </div>
            ) : (
              <code className="mono" style={{ background: 'rgba(0,242,255,0.08)', color: 'var(--cyber-primary)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.9em', fontWeight: '600' }} {...props}>{children}</code>
            );
          },
          h1: ({ children }) => <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: 'white', margin: '48px 0 24px', letterSpacing: '-0.02em' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white', margin: '40px 0 20px', letterSpacing: '-0.01em' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--cyber-primary)', margin: '32px 0 16px' }}>{children}</h3>,
          p: ({ children }) => <p style={{ marginBottom: '24px', lineHeight: '1.9', color: '#b0b0b0', fontSize: '1.05rem' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ marginBottom: '28px', paddingLeft: '28px', listStyleType: 'square' }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: '12px', color: '#b0b0b0', lineHeight: '1.7' }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: '900', color: 'white', borderBottom: '1px solid rgba(0,242,255,0.2)' }}>{children}</strong>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: '4px solid var(--cyber-primary)', padding: '16px 32px', background: 'rgba(0,242,255,0.03)', margin: '32px 0', borderRadius: '0 16px 16px 0', color: '#999', fontStyle: 'italic' }}>{children}</blockquote>
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const LineChart = ({ data }) => {
    const width = 120, height = 30;
    if (!data.length) return null;
    const points = data.map((d, i) => `${(i / (data.length - 1 || 1)) * width},${height - (d / 100) * height}`).join(' ');
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline fill="none" stroke="var(--cyber-primary)" strokeWidth="2" points={points} style={{ transition: 'all 0.4s' }} />
      </svg>
    );
  };

  const formatTimestamp = (value) => {
    if (!value) return 'Pending sync';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Pending sync';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatUptime = (seconds = 0) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const deployLineCount = deployForm.code.split('\n').filter(line => line.trim()).length;
  const deployedCount = deployments.filter(item => item.status === 'DEPLOYED').length;
  const stagedCount = deployments.filter(item => item.status === 'STAGED').length;
  const topStatusTone = config.maintenance_mode ? 'danger' : 'success';

  const quickPrompts = [
    {
      title: 'Release Checklist',
      language: 'bash',
      prompt: 'Create a bash script that verifies env vars, runs tests, and prepares a release checklist.'
    },
    {
      title: 'Data Cleaner',
      language: 'python',
      prompt: 'Write a Python script that loads a CSV, cleans null values, and exports a summarized report.'
    },
    {
      title: 'API Watchdog',
      language: 'javascript',
      prompt: 'Build a JavaScript script that polls an API, logs latency, and alerts on failures.'
    }
  ];

  const systemAlerts = [
    config.maintenance_mode
      ? { tone: 'danger', title: 'Maintenance lock enabled', description: 'Write operations are paused until governance reopens the platform.' }
      : { tone: 'success', title: 'Operations ready', description: 'The platform is currently accepting chat, archive, and deployment actions.' },
    { tone: 'success', title: 'Model channel online', description: `Static simulation is active and responding.` },
    deployedCount > 0
      ? { tone: 'info', title: `${deployedCount} live node${deployedCount === 1 ? '' : 's'} active`, description: 'Deployment tracking is reflecting actively promoted protocols.' }
      : { tone: 'info', title: 'No live nodes yet', description: 'Stage and activate a protocol to populate live operations.' }
  ];

  const StatusBadge = ({ label, tone = 'neutral' }) => (
    <span className={`signal-chip ${tone}`} style={{ 
      padding: '6px 14px', 
      fontSize: '0.65rem', 
      fontWeight: '800', 
      letterSpacing: '0.1em',
      boxShadow: tone !== 'neutral' ? `0 0 15px hsla(var(--${tone === 'success' ? 'p' : tone === 'warning' ? 's' : 'a'}-h), 100%, 50%, 0.2)` : 'none'
    }}>
      {label}
    </span>
  );

  const SectionHero = ({ icon, eyebrow, title, description, stats = [], action = null }) => (
    <div className="section-hero" style={{ padding: '24px 0', borderBottom: '1px solid var(--surface-border)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="section-copy">
        <div className="section-eyebrow" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '600', marginBottom: '8px' }}>
          {icon}
          <span>{eyebrow.toUpperCase()}</span>
        </div>
        <h2 className="section-title" style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>{title}</h2>
        {description ? <p className="section-description" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '600px' }}>{description}</p> : null}
      </div>
      <div className="section-hero-side" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {stats.length > 0 ? (
          <div className="section-stat-grid" style={{ display: 'flex', gap: '16px' }}>
            {stats.map((stat) => (
              <div key={stat.label} className="section-stat" style={{ textAlign: 'right' }}>
                <span className="section-stat-label" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>{stat.label}</span>
                <strong style={{ fontSize: '1rem', fontWeight: '700' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {action}
      </div>
    </div>
  );

  const EmptyState = ({ icon, title, description, action = null }) => (
    <div className="empty-state glass-dark">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );

  return (
    <div className="app-shell">
      <div className={`mobile-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      {/* Sidebar - ChatGPT Style */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => { setMessages([{ id: 1, role: 'bot', text: 'Hello. I am your Neural Assistant. How can I help you today?' }]); setActiveTab('navigator'); }}>
            <PlusCircle size={18} />
            New Chat
          </button>
        </div>

        <div className="nav-group custom-scrollbar">
          <div className="nav-item active" onClick={() => setActiveTab('navigator')}>
            <MessageSquare size={18} />
            Assistant
          </div>
          <div className="nav-item" onClick={() => setActiveTab('library')}>
            <Archive size={18} />
            Archive Vault
          </div>
          <div className="nav-item" onClick={() => setActiveTab('deploy')}>
            <PlusCircle size={18} />
            Protocol Forge
          </div>
          <div className="nav-item" onClick={() => setActiveTab('deployments')}>
            <ActivityIcon size={18} />
            Live Operations
          </div>
          <div className="nav-item" onClick={() => setActiveTab('neural_vault')}>
            <Database size={18} />
            Neural Archive
          </div>
          <div className="nav-item" onClick={() => setActiveTab('models')}>
            <Cpu size={18} />
            Model Forge
          </div>
          {isAdmin && (
            <div className="nav-item" onClick={() => setActiveTab('admin')}>
              <ShieldCheck size={18} />
              Admin Console
            </div>
          )}
        </div>

        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '12px' }}>
          {!isAdmin ? (
            <div className="nav-item" onClick={() => setShowLogin(true)}>
              <Lock size={18} />
              Authenticate
            </div>
          ) : (
            <div className="nav-item" onClick={handleLogout} style={{ color: '#ff4b4b' }}>
              <Power size={18} />
              Logout Root
            </div>
          )}
        </div>
      </aside>

      <main className="main-viewport">
        <div className="top-ribbon">
          <button className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="ribbon-status" style={{ gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>GHOST_SHELL</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/ Neural Core</span>
          </div>
          <div className="ribbon-meta">
            {isAdmin && <span className="signal-chip success">Admin Active</span>}
          </div>
        </div>

        <AnimatePresence>
          {notice && (
            <motion.div
              className={`notice-banner ${notice.type || 'info'}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ position: 'absolute', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, borderRadius: '8px' }}
            >
              {notice.text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'navigator' && (
            <motion.div key="nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="chat-container custom-scrollbar">
              <div className="chat-content">
                {messages.length <= 1 && !isChatLoading && (
                  <div className="welcome-screen slide-up">
                    <div className="welcome-logo">G</div>
                    <h2 className="welcome-title">How can I help you today?</h2>
                    
                    <div className="prompt-suggestions">
                      {quickPrompts.map((item) => (
                        <div
                          key={item.title}
                          className="suggestion-card"
                          onClick={() => {
                            setSelectedLanguage(item.language);
                            setUserInput(item.prompt);
                          }}
                        >
                          <strong>{item.title}</strong>
                          <p>{item.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={msg.id} className={`message-row ${msg.role} ${idx === messages.length - 1 ? 'slide-up' : ''}`}>
                    <div className="message-wrapper">
                      <div className={`avatar ${msg.role}`}>
                        {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                      </div>
                      <div className="message-text">
                        <MarkdownContent content={msg.text} />
                      </div>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="message-row bot">
                    <div className="message-wrapper">
                      <div className="avatar bot"><RefreshCcw size={18} className="spin" /></div>
                      <div className="message-text">
                        <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} style={{ height: 20 }} />
              </div>

              <div className="input-area">
                <div className="input-wrapper">
                  <PlusCircle size={20} className="text-dim" style={{ cursor: 'pointer' }} />
                  <textarea 
                    value={userInput} 
                    onChange={e => {
                      setUserInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }} 
                    placeholder="Message GHOST_SHELL..." 
                    className="chat-input"
                    rows={1}
                  />
                  <button 
                    onClick={() => handleChatSubmit()} 
                    className="send-btn" 
                    disabled={isChatLoading || !userInput.trim()}
                  >
                    <ArrowUpCircle size={24} />
                  </button>
                </div>
                <p className="footer-text">GHOST_SHELL can make mistakes. Check important info.</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'deploy' && (
            <motion.div key="deploy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <SectionHero
                icon={<Rocket size={16} />}
                eyebrow="Protocol Forge"
                title="Deploy New Protocol"
                description="Audit, refine, and package source logic into a premium deployment record ready for your archive and live node pipeline."
                stats={[
                  { label: 'Lines', value: deployLineCount || '0' },
                  { label: 'Language', value: deployForm.language.toUpperCase() },
                  { label: 'Quality', value: deployForm.quality_score || 'B' },
                ]}
              />
              <div className="forge-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="glass-premium editor-shell" style={{ flex: 1, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="surface-header" style={{ padding: '16px 24px', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><FileCode size={14} color="var(--primary)" /><span className="mono" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)' }}>CORE_LOGIC</span></div>
                      <select value={deployForm.language} onChange={e => setDeployForm({...deployForm, language: e.target.value})} className="mono" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', outline: 'none' }}>{availableLanguages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
                    </div>
                    <textarea value={deployForm.code} onChange={e => setDeployForm({ ...deployForm, code: e.target.value })} placeholder="# Protocol logic here..." className="mono custom-scrollbar code-editor" style={{ flex: 1, padding: '24px', background: 'rgba(0,0,0,0.2)', border: 'none', outline: 'none', color: '#a0aec0', fontSize: '0.95rem', lineHeight: '1.7', resize: 'none' }} />
                  </div>
                  <button onClick={analyzeCode} disabled={analyzing || !deployForm.code} className="btn-premium" style={{ padding: '20px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.1em' }}>{analyzing ? 'NEURAL_AUDIT_IN_PROGRESS...' : 'COMMENCE_NEURAL_AUDIT'}</button>
                </div>
                <div className="glass-premium editor-side" style={{ padding: '40px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}><Info size={18} color="var(--primary)" /><h3 style={{ fontSize: '1rem', fontWeight: '800' }}>SPECIFICATION</h3></div>
                   <div className="field-stack"><label className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PROTOCOL_IDENTIFIER</label><input value={deployForm.name} onChange={e => setDeployForm({ ...deployForm, name: e.target.value })} className="matrix-field" style={{ width: '100%', marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', color: '#fff' }} /></div>
                   <div className="field-stack"><label className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OPERATOR_SIGNATURE</label><input value={deployForm.author} onChange={e => setDeployForm({ ...deployForm, author: e.target.value })} placeholder="ROOT" className="matrix-field" style={{ width: '100%', marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', color: '#fff' }} /></div>
                   <div className="field-stack"><label className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PROTOCOL_SUMMARY</label><textarea value={deployForm.description} onChange={e => setDeployForm({ ...deployForm, description: e.target.value })} className="matrix-field" style={{ width: '100%', height: '140px', marginTop: '8px', resize: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '12px', color: '#fff', fontSize: '0.9rem', lineHeight: '1.6' }} /></div>
                   <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                     <StatusBadge label={`VER ${deployForm.version}`} tone="neutral" />
                     <StatusBadge label={`CONFIDENCE ${deployForm.quality_score || 'B'}`} tone="warning" />
                   </div>
                   <button onClick={finalizeDeployment} disabled={loading || !deployForm.name} className="btn-premium" style={{ marginTop: 'auto', padding: '20px', background: 'var(--primary)', color: '#000', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: '800' }}>COMMIT_TO_VAULT</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'deployments' && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '24px 20px', height: '100%', overflowY: 'auto' }}>
              <SectionHero
                icon={<ActivityIcon size={16} />}
                eyebrow="Operations"
                title="Live Operations"
                description="Track staged and deployed runtime artifacts with a cleaner control deck and stronger visual telemetry."
                stats={[
                  { label: 'Deployed', value: deployedCount },
                  { label: 'Staged', value: stagedCount },
                ]}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
                {deployments.length === 0 ? (
                  <EmptyState
                    icon={<ActivityIcon size={32} />}
                    title="No active operations"
                    description="Stage a protocol from the Archive Vault to initialize your first live node."
                  />
                ) : deployments.map((dep, idx) => (
                  <motion.div 
                    key={dep.name} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setInspectDeployment(dep)} 
                    className="card" 
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: dep.status === 'DEPLOYED' ? '#10a37f' : '#f59e0b' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Hash size={12} color="var(--text-dim)" /><span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{dep.language.toUpperCase()}</span></div>
                      <StatusBadge label={dep.status} tone={dep.status === 'DEPLOYED' ? 'success' : 'warning'} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{dep.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>{dep.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{dep.author || 'ROOT'}</span>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setInspectDeployment(dep)} className="btn-micro">INSPECT</button>
                        {dep.status === 'STAGED' && isAdmin && <button onClick={() => deployToDisk(dep.name)} className="btn-micro" style={{ background: '#fff', color: '#000' }}>ACTIVATE</button>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div key="models_vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              <SectionHero 
                icon={<Cpu size={16} />} 
                eyebrow="Neural Assets" 
                title="Neural Forge" 
                description="Securely analyze neural weights files to extract class labels and metadata."
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {forgedModelData ? (
                  <div className="glass-dark premium-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--cyber-primary)', fontWeight: '900' }}>NEURAL_SPECIFICATION (DATA.YAML)</span>
                        <StatusBadge label="AUTO_CONFIGURED" tone="success" />
                      </div>
                    </div>
                    
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '240px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px' }}>
                       <pre className="mono" style={{ fontSize: '0.75rem', color: '#7ec8a0', lineHeight: '1.6' }}>
{`# Auto-generated data.yaml
names:
${(forgedModelData.classes || []).map((c, i) => `  ${i}: ${c}`).join('\n')}
nc: ${(forgedModelData.classes || []).length}`}
                       </pre>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setForgedModelData(null)} className="btn-micro" style={{ flex: 1 }}>CLEAR</button>
                      <button onClick={saveForgedModel} className="btn-micro" style={{ flex: 1, background: 'var(--cyber-primary)', color: 'black' }}>INDEX_MODEL</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div onClick={() => document.getElementById('neural-upload').click()} className="glass-dark premium-card hover-glow" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '220px', border: '2px dashed rgba(59,130,246,0.2)', cursor: 'pointer' }}>
                       <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                          <PlusCircle size={24} color="var(--cyber-primary)" />
                       </div>
                       <h3 className="heading-cyber" style={{ fontSize: '1rem', marginBottom: '8px', textAlign: 'center' }}>FORGE NEURAL ANALYSIS</h3>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', textAlign: 'center', maxWidth: '240px' }}>Drop a .pt weights file to extract neural class labels.</p>
                       <input
                         type="file"
                         id="neural-upload"
                         accept=".pt"
                         style={{ display: 'none' }}
                         onChange={e => {
                           if (e.target.files?.[0]) {
                             setModelForgeFile(e.target.files[0]);
                             forgeModel();
                           }
                         }}
                       />
                    </div>
                    <div className="glass-dark premium-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '180px' }}>
                      <Cpu size={32} color="var(--text-dim)" style={{ opacity: 0.2 }} />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '16px' }}>READY_FOR_NEURAL_INPUT</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'neural_vault' && (
            <motion.div key="neural_vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '24px 20px', height: '100%', overflowY: 'auto' }}>
              <SectionHero
                icon={<Database size={16} />}
                eyebrow="Neural Archive"
                title="Neural Model Vault"
                description="Secure storage for your forged neural models and extracted class specifications."
                stats={[
                  { label: 'Saved Models', value: neuralModels.length }
                ]}
              />
              <div className="protocol-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {neuralModels.length === 0 ? (
                  <EmptyState
                    icon={<Database size={28} />}
                    title="Vault is empty"
                    description="Forge and index a neural model from the Neural Data tab to see it here."
                  />
                ) : neuralModels.map(model => (
                  <div key={model.name} className="glass-dark premium-card protocol-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="protocol-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--cyber-primary)' }}>NEURAL_MODEL</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-micro" onClick={() => setInspectDeployment(model)}>INSPECT</button>
                        {isAdmin && <button onClick={() => deleteNeuralModel(model.name)} className="btn-micro danger"><Trash2 size={14} /></button>}
                      </div>
                    </div>
                    <h3 className="protocol-title" style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '12px' }}>{model.name}</h3>
                    <div className="meta-inline" style={{ marginTop: 'auto' }}>
                      <StatusBadge label={`${(model.classes || []).length} Classes`} tone="info" />
                      <StatusBadge label={model.version || '1.0.0'} tone="neutral" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'library' && (() => {
            const unstagedScripts = scripts.filter(s => !deployments.some(d => d.name === s.name));
            return (
              <motion.div key="lib" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '24px 20px', height: '100%', overflowY: 'auto' }}>
                <SectionHero 
                  icon={<Archive size={16} />}
                  eyebrow="Knowledge Base"
                  title="Archive Vault"
                  description="Secure storage for verified neural protocols and forged operation scripts."
                  stats={[
                    { label: 'Protocols', value: scripts.length },
                    { label: 'Unstaged', value: unstagedScripts.length }
                  ]}
                />
                
                <div className="protocol-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '32px' }}>
                  {unstagedScripts.map((script, idx) => (
                    <motion.div 
                      key={script.name} 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card" 
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Command size={12} color="var(--text-dim)" /><span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{script.slug}</span></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setInspectDeployment(script)} className="btn-micro">VIEW</button>
                          {isAdmin && <button onClick={() => deleteScript(script.name)} className="btn-micro danger"><Trash2 size={12} /></button>}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{script.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>{script.description}</p>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <StatusBadge label={script.language.toUpperCase()} tone="neutral" />
                      </div>
                      <button 
                        onClick={() => {
                          setDeployForm(prev => ({ ...prev, name: script.name, code: script.code, language: script.language }));
                          setActiveTab('deploy');
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', marginTop: 'auto', background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        STAGE PROTOCOL
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })()}

          {activeTab === 'admin' && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="glass-premium admin-tab-row" style={{ padding: '16px 24px', display: 'flex', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'nowrap', overflowX: 'auto', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.02)' }}>
                {[
                  { id: 'dashboard', label: 'HEALTH_METRICS', icon: <Cpu size={16} /> },
                  { id: 'governance', label: 'GOVERNANCE_PROTOCOL', icon: <ShieldAlert size={16} /> },
                  { id: 'sandbox', label: 'SIMULATION_LAB', icon: <FlaskConical size={16} /> },
                  { id: 'terminal', label: 'ROOT_DECK', icon: <Terminal size={16} /> }
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setAdminSubTab(t.id)} 
                    className={`admin-tab ${adminSubTab === t.id ? 'active' : ''}`} 
                    style={{ 
                      border: 'none', 
                      background: 'none', 
                      color: adminSubTab === t.id ? 'var(--primary)' : 'var(--text-dim)', 
                      fontWeight: '800', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      fontSize: '0.7rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.15em',
                      transition: 'all 0.3s ease',
                      opacity: adminSubTab === t.id ? 1 : 0.6
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                <AnimatePresence mode="wait">
                  {adminSubTab === 'dashboard' && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: 'auto' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <SectionHero
                            icon={<Gauge size={16} />}
                            eyebrow="Admin Telemetry"
                            title="Neural Health"
                            description="Track system load, archive activity, and model reachability from one premium operations console."
                            stats={[
                              { label: 'Latency', value: `${systemHealth.network_latency || 0}ms` },
                              { label: 'Uptime', value: formatUptime(systemHealth.uptime_seconds) },
                            ]}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                             {[
                               { label: 'CPU_LOAD', val: `${systemHealth.cpu_usage}%`, icon: <Cpu size={16} />, col: 'var(--cyber-primary)', hist: healthHistory },
                               { label: 'ACTIVE_NODES', val: deployments.length, icon: <ActivityIcon size={16} />, col: 'var(--cyber-success)', hist: [] },
                               { label: 'MEM_ALLOC', val: `${(systemHealth.memory_usage/1024).toFixed(1)}GB`, icon: <Database size={16} />, col: 'var(--cyber-secondary)', hist: [] }
                             ].map(s => (
                               <div key={s.label} className="glass-dark premium-card metric-card" style={{ padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                   <div style={{ color: s.col }}>{s.icon}</div>
                                   {s.hist && s.hist.length > 0 && <LineChart data={s.hist} />}
                                 </div>
                                 <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '0.1em' }}>{s.label}</p>
                                 <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{s.val}</p>
                               </div>
                             ))}
                          </div>
                          <div className="glass-dark premium-card" style={{ flex: 1, borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}><ActivityIcon color="var(--cyber-primary)" /><h3 className="heading-cyber" style={{ fontSize: '1rem' }}>ACTIVITY_PULSE</h3></div>
                             <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                                {activityFeed.map((a, i) => (
                                  <div key={i} className="activity-item" style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '0.65rem', color: 'var(--cyber-primary)', fontWeight: '900' }}>{a.user}</span><span style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>{new Date(a.timestamp).toLocaleTimeString()}</span></div>
                                    <p style={{ fontSize: '0.75rem', color: '#888' }}>{a.action}</p>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <div className="glass-dark premium-card" style={{ borderRadius: '48px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><Bell size={24} color="var(--cyber-primary)" /><h3 className="heading-cyber" style={{ fontSize: '1rem' }}>SYSTEM_ALERTS</h3></div>
                          {systemAlerts.map((alert) => (
                            <div key={alert.title} className={`glass-dark alert-card ${alert.tone}`} style={{ padding: '24px', borderRadius: '24px' }}>
                              <p style={{ fontSize: '0.78rem', fontWeight: '900', marginBottom: '8px' }}>{alert.title}</p>
                              <p style={{ fontSize: '0.8rem', color: '#97aab5', lineHeight: '1.6' }}>{alert.description}</p>
                            </div>
                          ))}
                       </div>
                    </motion.div>
                  )}
                  {adminSubTab === 'governance' && (
                    <motion.div key="gov" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                       <div className="glass-dark premium-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><Sliders color="var(--cyber-primary)" /> <h3 className="heading-cyber">PROTOCOL_LIMITS</h3></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                             {[
                               { label: 'CHAT_SESSION_MAX', key: 'chat_limit', min: 1 },
                               { label: 'ARCHIVE_STORAGE_MAX', key: 'storage_limit', min: 1 },
                               { label: 'LIVE_NODE_CAPACITY', key: 'node_limit', min: 1 },
                               { label: 'API_REQUEST_RATE', key: 'request_rate', min: 5 }
                             ].map(limit => (
                               <div key={limit.key}>
                                  <label className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{limit.label}</label>
                                  <input 
                                    type="number" 
                                    value={govLimits[limit.key]} 
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      setGovLimits(prev => ({...prev, [limit.key]: isNaN(val) ? limit.min : Math.max(val, limit.min)}));
                                    }} 
                                    className="matrix-field" 
                                    style={{ width: '100%', marginTop: '8px' }} 
                                  />
                               </div>
                             ))}
                          </div>
                          <button onClick={() => updateConfig(govLimits)} className="btn-premium" style={{ padding: '16px', borderRadius: '16px' }}>SYNCHRONIZE_GOVERNANCE</button>
                       </div>
                       <div className="glass-dark premium-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><Shield color="var(--cyber-primary)" /> <h3 className="heading-cyber">SYSTEM_OVERRIDE</h3></div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                             <div className="glass-dark premium-card" style={{ padding: '24px', borderRadius: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                   <div><p style={{ fontWeight: '700', fontSize: '1rem' }}>MAINTENANCE_LOCK</p></div>
                                   <button onClick={() => updateConfig({ maintenance_mode: !maintenanceMode })} className="btn-micro" style={{ background: maintenanceMode ? 'var(--cyber-error)' : 'rgba(255,255,255,0.02)', color: maintenanceMode ? 'white' : 'var(--text-soft)', padding: '10px 20px' }}>{maintenanceMode ? 'ACTIVE' : 'READY'}</button>
                                </div>
                             </div>
                             <div>
                                <label className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>BROADCAST_PULSE</label>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                   <input 
                                     value={broadcastDraft} 
                                     onChange={e => setBroadcastDraft(e.target.value)}
                                     placeholder="Broadcast..."
                                     className="matrix-field" 
                                     style={{ flex: 1 }} 
                                   />
                                   <button onClick={() => updateConfig({ broadcast: broadcastDraft })} className="btn-micro" style={{ padding: '0 20px' }}>PULSE</button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  )}
                  {adminSubTab === 'sandbox' && (
                    <motion.div key="sandbox" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ height: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="glass-dark premium-card editor-shell" style={{ flex: 1, borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '300px' }}>
                             <div className="surface-header" style={{ padding: '12px 24px', background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span className="mono" style={{ fontSize: '0.65rem', color: 'var(--cyber-primary)' }}>NEURAL_LAB_STRESS_TEST</span></div>
                             <textarea value={sandboxCode} onChange={e => setSandboxCode(e.target.value)} placeholder="# Construct protocol..." className="mono custom-scrollbar code-editor" style={{ flex: 1, padding: '24px', background: 'none', border: 'none', outline: 'none', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.7', resize: 'none' }} />
                          </div>
                          <button onClick={runSandbox} disabled={sandboxing} className="btn-premium" style={{ padding: '16px', borderRadius: '16px' }}>COMMENCE_SIMULATION</button>
                       </div>
                       <div className="glass-dark premium-card" style={{ borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}><Binary size={18} color="var(--cyber-primary)" /><h3 className="heading-cyber" style={{ fontSize: '0.75rem' }}>SIMULATED_OUTPUT</h3></div>
                          <div className="custom-scrollbar output-shell" style={{ flex: 1, background: '#000', borderRadius: '16px', padding: '20px', border: '1px solid #111', color: '#0f0', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{sandboxOutput || "Awaiting neural trigger..."}</div>
                       </div>
                    </motion.div>
                  )}
                  {adminSubTab === 'terminal' && (
                    <motion.div key="term" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="terminal-shell" style={{ height: '500px', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: '24px', padding: '24px', border: '1px solid #111' }}>
                      <div className="custom-scrollbar terminal-output" style={{ flex: 1, overflowY: 'auto', fontFamily: 'IBM Plex Mono', color: '#0f0', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        <div style={{ color: 'var(--text-dim)', marginBottom: '16px', fontSize: '0.65rem' }}>ROOT_SESSION_ACTIVE // UID: 0 // SCRIPT_SHELL_v4.5</div>
                        {terminalOutput.map((o, i) => <div key={i} style={{ marginBottom: '8px', color: o.type === 'err' ? 'var(--cyber-error)' : o.type === 'in' ? '#555' : '#0f0' }}>{o.text}</div>)}
                        {terminalLoading && <div className="mono" style={{ color: 'var(--cyber-primary)', opacity: 0.6, animation: 'pulse 1.5s infinite' }}>PRODUCING_OUTPUT...</div>}
                        <div ref={termEndRef} />
                      </div>
                      <div className="terminal-input-row" style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid #111', paddingTop: '20px', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ color: 'var(--text-dim)', fontWeight: '700', fontSize: '0.75rem' }}>root@script_shell:~$</span>
                        <input value={terminalInput} onChange={e => setTerminalInput(e.target.value)} onKeyDown={handleTerminalKeyDown} className="mono terminal-input" style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '0.85rem', minWidth: '100%' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {inspectDeployment && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.98)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2vw' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass modal-shell"
              style={{ width: '96vw', maxWidth: '1400px', height: '90vh', borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: isCompactLayout ? 'column' : 'row', border: '1px solid rgba(59,130,246,0.1)' }}
            >
                     {/* LEFT PANEL — Source Code */}
              <div
                className="modal-code-panel"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: isCompactLayout ? 'none' : '1px solid rgba(255,255,255,0.05)', borderBottom: isCompactLayout ? '1px solid rgba(255,255,255,0.05)' : 'none', minHeight: isCompactLayout ? '40vh' : '0', overflow: 'hidden' }}
              >
                <div className="surface-header" style={{ padding: '20px 32px', background: 'rgba(59,130,246,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><FileCode size={18} color="var(--primary)" /><span className="mono" style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.1em' }}>PROTOCOL_SOURCE_CORE</span></div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{inspectDeployment.language?.toUpperCase() || 'UNKNOWN'}</span>
                    <button className="btn-micro" style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px' }} onClick={() => navigator.clipboard.writeText(inspectDeployment.code || '')}>COPY_LOGIC</button>
                  </div>
                </div>
                <div className="custom-scrollbar" style={{ flex: 1, padding: '32px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)' }}>
                  <pre className="mono" style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#a0aec0', whiteSpace: 'pre-wrap' }}><code>{inspectDeployment.code || inspectDeployment.description}</code></pre>
                </div>
              </div>

              {/* RIGHT PANEL — Inspection Deck */}
              <div
                className="custom-scrollbar modal-pane modal-pane-side"
                style={{
                  flex: isCompactLayout ? 'none' : '0 0 520px',
                  height: isCompactLayout ? '50%' : '100%',
                  background: 'rgba(5,7,10,0.98)',
                  overflowY: 'auto',
                  padding: isCompactLayout ? '2rem' : '4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '48px',
                }}
              >
                {/* Close */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        const name = inspectDeployment.name;
                        const isLive = !!inspectDeployment.status;
                        if (isLive) {
                          deleteDeployment(name);
                          setInspectDeployment(null);
                        } else {
                          deleteScript(name);
                          setInspectDeployment(null);
                        }
                      }} 
                      className="btn-micro danger" 
                      style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--cyber-error)', fontWeight: '800' }}
                    >
                      PURGE_PROTOCOL
                    </button>
                  )}
                  <button onClick={() => setInspectDeployment(null)} className="btn-micro" style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}>
                    <X size={24} />
                  </button>
                </div>

                {/* Title block */}
                <div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <StatusBadge label={inspectDeployment.author || 'ROOT'} tone="neutral" />
                    <StatusBadge label={inspectDeployment.language.toUpperCase()} tone="info" />
                    <StatusBadge label={`VER ${inspectDeployment.version || '1.0.0'}`} tone="neutral" />
                    {inspectDeployment.status && (
                      <StatusBadge label={inspectDeployment.status} tone={inspectDeployment.status === 'DEPLOYED' ? 'success' : 'warning'} />
                    )}
                  </div>
                  <h2 style={{ fontSize: '2.8rem', fontWeight: '800', marginBottom: '20px', lineHeight: 1, letterSpacing: '-0.02em', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {inspectDeployment.name}
                  </h2>
                  <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '32px' }}>
                    {inspectDeployment.description}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px' }}>
                    <div className="meta-box">
                      <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>TIMESTAMP</span>
                      <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatTimestamp(inspectDeployment.updated_at || inspectDeployment.staged_at || inspectDeployment.created_at)}</span>
                    </div>
                    <div className="meta-box">
                      <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>SIGNATURE</span>
                      <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{inspectDeployment.author || 'ROOT_OPERATOR'}</span>
                    </div>
                  </div>
                </div>

                {/* Technical Overview */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--cyber-primary)', marginBottom: '16px' }}>
                    <BookOpen size={18} />
                    <h3 className="heading-cyber" style={{ fontSize: '0.8rem' }}>TECHNICAL_OVERVIEW</h3>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: '#999', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>
                    {inspectDeployment.technical_overview || inspectDeployment.description}
                  </p>
                </div>

                {/* Neural Classes */}
                {(inspectDeployment.classes || []).length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--cyber-primary)', marginBottom: '16px' }}>
                      <Scan size={18} />
                      <h3 className="heading-cyber" style={{ fontSize: '0.8rem' }}>NEURAL_CLASSES</h3>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {(inspectDeployment.classes || []).map(c => (
                        <div key={c} className="glass" style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(0,242,255,0.2)', color: 'var(--cyber-primary)', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.05em' }}>
                          {c.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Features */}
                {(inspectDeployment.key_features || []).length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--cyber-primary)', marginBottom: '16px' }}>
                      <Lightbulb size={18} />
                      <h3 className="heading-cyber" style={{ fontSize: '0.8rem' }}>KEY_FEATURES</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(inspectDeployment.key_features || []).map(f => (
                        <div key={f} className="glass-dark" style={{ padding: '16px 20px', borderRadius: '16px', borderLeft: '4px solid var(--cyber-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyber-primary)', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: '700' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies — copyable install block */}
                {(inspectDeployment.dependency_details || []).length > 0 && (() => {
                  const deps = inspectDeployment.dependency_details || [];
                  const lang = (inspectDeployment.language || 'python').toLowerCase();
                  const installCmd = lang === 'python'
                    ? `pip install ${deps.map(d => d.name.toLowerCase()).join(' ')}`
                    : lang === 'javascript' || lang === 'typescript'
                    ? `npm install ${deps.map(d => d.name.toLowerCase()).join(' ')}`
                    : lang === 'go'
                    ? deps.map(d => `go get ${d.name.toLowerCase()}`).join('\n')
                    : lang === 'rust'
                    ? deps.map(d => `cargo add ${d.name.toLowerCase()}`).join('\n')
                    : `install ${deps.map(d => d.name.toLowerCase()).join(' ')}`;

                  const annotated = deps.map(d => {
                    const prefix = lang === 'python' ? `pip install ${d.name.toLowerCase()}`
                      : lang === 'javascript' || lang === 'typescript' ? `npm install ${d.name.toLowerCase()}`
                      : lang === 'go' ? `go get ${d.name.toLowerCase()}`
                      : lang === 'rust' ? `cargo add ${d.name.toLowerCase()}`
                      : d.name.toLowerCase();
                    return `${prefix}  # ${d.purpose}`;
                  }).join('\n');

                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--cyber-primary)' }}>
                          <Package size={18} />
                          <h3 className="heading-cyber" style={{ fontSize: '0.8rem' }}>CORE_DEPENDENCIES</h3>
                        </div>
                      </div>
                      <div style={{ background: '#000', borderRadius: '20px', border: '1px solid rgba(0,242,255,0.1)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(0,242,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
                            <span className="mono" style={{ marginLeft: 10, fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                              INSTALL_COMMANDS
                            </span>
                          </div>
                          <button
                            className="btn-micro"
                            onClick={() => navigator.clipboard.writeText(installCmd)}
                            style={{ padding: '6px 14px', fontSize: '0.6rem' }}
                          >
                            COPY
                          </button>
                        </div>
                        <pre className="mono custom-scrollbar" style={{ margin: 0, padding: '20px 24px', fontSize: '0.82rem', lineHeight: '2', color: '#7ec8a0', overflowX: 'auto', whiteSpace: 'pre' }}>
                          <code>{annotated}</code>
                        </pre>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-dark auth-card" style={{ width: '100%', maxWidth: '400px', padding: '32px', borderRadius: '32px', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                 <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><ShieldCheck size={32} color="var(--cyber-primary)" /></div>
                 <h2 className="heading-cyber" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>ROOT_ACCESS</h2>
                 <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)' }}>Enter authorization code to unlock administrative overrides.</p>
              </div>
              <div className="field-stack" style={{ marginBottom: '24px' }}>
                <label className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ACCESS_CODE</label>
                <input 
                  type="password" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••" 
                  className="matrix-field" 
                  style={{ width: '100%', marginTop: '12px', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '0.3em' }} 
                  autoFocus
                />
              </div>
              <button onClick={handleLogin} className="btn-premium" style={{ width: '100%', padding: '16px', borderRadius: '16px' }}>AUTHORIZE_SESSION</button>
              <button onClick={() => setShowLogin(false)} className="btn-micro" style={{ width: '100%', marginTop: '16px', color: 'var(--text-dim)' }}>CANCEL_REQUEST</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
