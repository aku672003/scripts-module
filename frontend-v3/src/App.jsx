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
  Sliders, LayoutGrid, Network, Key, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/api/v1';
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
  // govLimits: only the numeric limits — completely isolated from broadcast
  const [govLimits, setGovLimits] = useState({ chat_limit: 50, storage_limit: 500, node_limit: 20, request_rate: 100 });
  // broadcastDraft: standalone editable string, never touched by polling
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

  const chatEndRef = useRef(null);
  const termEndRef = useRef(null);
  const noticeTimeoutRef = useRef(null);
  // Refs so interval callbacks always see live values — no stale closures
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

  const getAdminHeaders = (includeJson = false) => {
    const headers = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    // Use ref so this always reads the CURRENT token even inside stale intervals
    if (adminTokenRef.current) headers['X-Admin-Token'] = adminTokenRef.current;
    return headers;
  };

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/models`);
      const data = await readResponseJson(res);
      if (res.ok) setAiModels(data.models || []);
    } catch (err) {
      console.error("Failed to fetch models", err);
    }
  }, []);

  const forgeModel = async () => {
    if (!modelForgeFile) return;
    setModelForging(true);
    setForgedModelData(null);
    try {
      const res = await fetch(`${API_BASE}/models/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: modelForgeFile.name })
      });
      const data = await readResponseJson(res);
      if (res.ok) {
        setForgedModelData(data);
        showNotice('Neural node forged successfully.', 'success');
      } else {
        showNotice('Forge failed. Neural architecture invalid.', 'error');
      }
    } catch (err) {
      showNotice('Communication failure during forging.', 'error');
    } finally {
      setModelForging(false);
    }
  };

  const saveForgedModel = async () => {
    if (!forgedModelData) return;
    try {
      const payload = {
        ...forgedModelData,
        author: deployForm.author || 'NEURAL_FORGE',
      };
      const res = await fetch(`${API_BASE}/scripts`, {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showNotice('Neural protocol indexed to Archive Vault.', 'success');
        setForgedModelData(null);
        setModelForgeFile(null);
        fetchScripts();
      } else {
        showNotice('Save failed. Indexing collision.', 'error');
      }
    } catch (err) {
      showNotice('Critical failure during indexing.', 'error');
    }
  };

  const readResponseJson = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return {};
    try {
      return await response.json();
    } catch (err) {
      return {};
    }
  };

  const getErrorMessage = (payload, fallback) => {
    if (payload?.detail && Array.isArray(payload.detail)) {
      return payload.detail.map(err => `${err.loc?.join('.')} ${err.msg}`).join(', ');
    }
    return payload?.detail || payload?.message || payload?.error || fallback;
  };

  const handleAdminAuthFailure = (response) => {
    if (response.status === 401) {
      setIsAdminSafe(false);
      setAdminTokenSafe('');
      window.sessionStorage.removeItem('script_shell_admin_token');
      setShowLogin(true);
      showNotice('Admin session expired. Please log in again.', 'error');
      return true;
    }
    return false;
  };


  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalOutput]);

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/scripts`);
      const data = await readResponseJson(res);
      if (res.ok) setScripts(data.scripts || []);
    } catch (err) {}
  }, []);
  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/deployments`);
      const data = await readResponseJson(res);
      if (res.ok) setDeployments(data.deployments || []);
    } catch (err) {}
  }, []);
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      const data = await readResponseJson(res);
      if (res.ok) {
        setConfig(data);
        
        // Initialise editable states only ONCE to prevent polling from overwriting user input
        if (!configInitialised.current) {
          setGovLimits({
            chat_limit: data.chat_limit,
            storage_limit: data.storage_limit,
            node_limit: data.node_limit,
            request_rate: data.request_rate,
          });
          setBroadcastDraft(data.broadcast || '');
          setMaintenanceMode(!!data.maintenance_mode);
          configInitialised.current = true;
        }
      }
    } catch (err) {}
  }, []);
  const fetchLanguages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/languages`);
      const data = await readResponseJson(res);
      if (res.ok && Array.isArray(data.languages) && data.languages.length > 0) {
        setAvailableLanguages(data.languages);
        setSelectedLanguage(current => data.languages.includes(current) ? current : data.languages[0]);
        setDeployForm(current => ({ ...current, language: data.languages.includes(current.language) ? current.language : data.languages[0] }));
      }
    } catch (err) {}
  }, []);
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/system/health`, { headers: getAdminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (!res.ok) return;
      setSystemHealth(data);
      setHealthHistory(prev => [...prev.slice(-15), data.cpu_usage]);
    } catch (err) {}
  }, []);
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/activity`, { headers: getAdminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (!res.ok) return;
      setActivityFeed(data.activity || []);
    } catch (err) {}
  }, []);

  // One-time mount effect — no dependencies on isAdmin/adminToken to avoid restarts
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
    fetchScripts(); fetchDeployments(); fetchConfig(); fetchLanguages(); fetchModels();
    // Interval uses refs — always sees the current token/admin state
    const interval = setInterval(() => {
      fetchConfig();
      fetchDeployments();
      fetchModels();
      if (isAdminRef.current) { fetchHealth(); fetchActivity(); }
    }, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', syncLayout);
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, [fetchConfig, fetchScripts, fetchDeployments, fetchModels, fetchHealth, fetchActivity, fetchLanguages]);

  const updateConfig = async (patch) => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: getAdminHeaders(true),
        body: JSON.stringify(patch)
      });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (res.ok) {
        // Reflect saved values back into config and editable states
        setConfig(prev => ({ ...prev, ...patch }));
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
      } else {
        const error = getErrorMessage(data, 'Unable to update governance settings.');
        showNotice(`Update Failed: ${error}`, 'error');
      }
    } catch (err) {
      showNotice('Communication failure during governance sync.', 'error');
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || loading) return;
    const prompt = userInput.trim();
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: prompt }]);
    setUserInput(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: messages })
      });
      const data = await readResponseJson(res);
      if (res.ok && data.response) {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: data.response }]);
      } else {
        const message = getErrorMessage(data, 'The neural response pipeline is currently unavailable.');
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: message }]);
        showNotice(message, 'error');
      }
    } catch (err) {
      const message = 'Unable to reach the chat service.';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', text: message }]);
      showNotice(message, 'error');
    } finally { setLoading(false); }
  };

  const analyzeCode = async () => {
    if (!deployForm.code) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: deployForm.code, language: deployForm.language }) });
      const data = await readResponseJson(res);
      if (res.ok) {
        setDeployForm(prev => ({ 
          ...prev, 
          ...data,
          language: data.language || prev.language,
          author: data.author || prev.author || "UNKNOWN_OPERATOR",
          name: data.name || prev.name || "UNNAMED_PROTOCOL",
          description: data.description || data.technical_overview || prev.description 
        }));
        showNotice('Analysis completed.', 'success');
      } else {
        showNotice(getErrorMessage(data, 'Code analysis failed.'), 'error');
      }
    } catch (err) {
      showNotice('Code analysis failed.', 'error');
    } finally { setAnalyzing(false); }
  };

  const finalizeDeployment = async () => {
    if (!deployForm.name || !deployForm.code) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/scripts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deployForm) });
      const data = await readResponseJson(res);
      if (res.ok) {
        setDeployForm({ name: '', description: '', author: '', language: availableLanguages[0] || 'python', code: '', quality_score: 'B', version: '1.0.0' });
        fetchScripts();
        setActiveTab('library');
        showNotice('Protocol indexed successfully.', 'success');
      } else {
        showNotice(getErrorMessage(data, 'Unable to index this protocol.'), 'error');
      }
    } catch (err) {
      showNotice('Unable to index this protocol.', 'error');
    } finally { setLoading(false); }
  };

  const stageScript = async (script) => {
    try {
      const res = await fetch(`${API_BASE}/stage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(script) });
      const data = await readResponseJson(res);
      if (res.ok) {
        fetchDeployments();
        showNotice(`Staged ${script.name}.`, 'success');
      } else {
        showNotice(getErrorMessage(data, 'Unable to stage this protocol.'), 'error');
      }
    } catch (err) {
      showNotice('Unable to stage this protocol.', 'error');
    }
  };

  const deployToDisk = async (name) => {
    try {
      const res = await fetch(`${API_BASE}/deployments/${encodeURIComponent(name)}/deploy`, { method: 'POST', headers: getAdminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (!res.ok) {
        showNotice(getErrorMessage(data, `Unable to activate ${name}.`), 'error');
        return;
      }
      fetchDeployments();
      showNotice(`Activated ${name}.`, 'success');
    } catch (err) {
      showNotice(`Unable to activate ${name}.`, 'error');
    }
  };

  const deleteDeployment = async (name) => {
    if (!window.confirm(`TERMINATE_NODE: Permanently wipe ${name}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/deployments/${encodeURIComponent(name)}`, { method: 'DELETE', headers: getAdminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (!res.ok) {
        showNotice(getErrorMessage(data, `Unable to terminate ${name}.`), 'error');
        return;
      }
      fetchDeployments();
      showNotice(`Terminated ${name}.`, 'success');
    } catch (err) {
      showNotice(`Unable to terminate ${name}.`, 'error');
    }
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

  const execTerminal = async () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput; setTerminalHistory(prev => [...prev, cmd]); setHistoryIndex(-1); setTerminalInput('');
    setTerminalOutput(prev => [...prev, { type: 'in', text: `root@script_shell:~$ ${cmd}` }]);
    try {
      setTerminalLoading(true);
      const res = await fetch(`${API_BASE}/admin/terminal`, { method: 'POST', headers: getAdminHeaders(true), body: JSON.stringify({ command: cmd }) });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      const outputType = res.ok && !(data.output || '').startsWith('ERROR') ? 'out' : 'err';
      setTerminalOutput(prev => [...prev, { type: outputType, text: data.output || 'TERMINAL_IO_FAILURE' }]);
    } catch (err) {
      setTerminalOutput(prev => [...prev, { type: 'err', text: `TERMINAL_IO_FAILURE` }]);
      showNotice('Terminal command failed.', 'error');
    } finally {
      setTerminalLoading(false);
    }
  };

  const runSandbox = async () => {
    if (!sandboxCode.trim()) return;
    setSandboxing(true); setSandboxOutput('NEURAL_SIMULATION_ACTIVE...');
    try {
      const res = await fetch(`${API_BASE}/admin/sandbox`, { method: 'POST', headers: getAdminHeaders(true), body: JSON.stringify({ code: sandboxCode }) });
      if (handleAdminAuthFailure(res)) return;
      const data = await readResponseJson(res);
      if (res.ok) {
        setSandboxOutput(data.output);
      } else {
        const message = getErrorMessage(data, 'Sandbox simulation failed.');
        setSandboxOutput(message);
        showNotice(message, 'error');
      }
    } catch (err) {
      setSandboxOutput('FAILURE');
      showNotice('Sandbox simulation failed.', 'error');
    } finally { setSandboxing(false); }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPass }) });
      const data = await readResponseJson(res);
      if (res.ok && data.token) {
        window.sessionStorage.setItem('script_shell_admin_token', data.token);
        setAdminTokenSafe(data.token);
        setIsAdminSafe(true);
        setShowLogin(false);
        setAdminPass('');
        setActiveTab('admin');
        showNotice('Admin authentication successful.', 'success');
      } else {
        showNotice(getErrorMessage(data, 'Admin authentication failed.'), 'error');
      }
    } catch (err) { showNotice('Unable to reach the admin login service.', 'error'); }
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
    systemHealth.ollama_status === 'online'
      ? { tone: 'success', title: 'Model channel online', description: `Local generation is reachable with ${systemHealth.network_latency || 0}ms response latency.` }
      : { tone: 'warning', title: 'Model fallback active', description: 'The UI stays usable even when the local model is offline or still booting.' },
    deployedCount > 0
      ? { tone: 'info', title: `${deployedCount} live node${deployedCount === 1 ? '' : 's'} active`, description: 'Deployment tracking is reflecting actively promoted protocols.' }
      : { tone: 'info', title: 'No live nodes yet', description: 'Stage and activate a protocol to populate live operations.' }
  ];

  const StatusBadge = ({ label, tone = 'neutral' }) => (
    <span className={`signal-chip ${tone}`}>{label}</span>
  );

  const SectionHero = ({ icon, eyebrow, title, description, stats = [], action = null }) => (
    <div className="section-hero">
      <div className="section-copy">
        <div className="section-eyebrow">
          {icon}
          <span>{eyebrow}</span>
        </div>
        <h2 className="heading-cyber section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
      <div className="section-hero-side">
        {stats.length > 0 ? (
          <div className="section-stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="section-stat">
                <span className="section-stat-label">{stat.label}</span>
                <strong>{stat.value}</strong>
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
    <div className={`app-shell ${isCompactLayout ? 'compact' : ''}`}>
      <aside className="sidebar glass premium-shell">
        <div className="brand-block">
          <div className="logo-box">S</div>
          <div className="brand-copy">
            <h1>SCRIPT_SHELL</h1>
            <p>Premium script operations deck</p>
          </div>
        </div>
        <div className="sidebar-intel glass-dark">
          <div className="sidebar-intel-row">
            <div>
              <span className="sidebar-kicker">Broadcast</span>
              <p>{config.broadcast || 'Neural systems online'}</p>
            </div>
            <StatusBadge label={config.maintenance_mode ? 'Lockdown' : 'Open'} tone={topStatusTone} />
          </div>
          <div className="sidebar-metrics">
            <div className="sidebar-metric">
              <span>Archive</span>
              <strong>{scripts.length}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Live</span>
              <strong>{deployedCount}</strong>
            </div>
            <div className="sidebar-metric">
              <span>Staged</span>
              <strong>{stagedCount}</strong>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {[
            { id: 'navigator', label: 'Neural Assistant', icon: <Terminal size={18} /> },
            { id: 'library', label: 'Archive Vault', icon: <Archive size={18} /> },
            { id: 'deploy', label: 'Deploy New', icon: <PlusCircle size={18} /> },
            { id: 'deployments', label: 'Live Nodes', icon: <ActivityIcon size={18} /> },
            { id: 'models', label: 'AI Models', icon: <Cpu size={18} /> },
            ...(isAdmin ? [{ id: 'admin', label: 'Root Console', icon: <ShieldCheck size={18} /> }] : [])
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!isAdmin ? (
            <button onClick={() => setShowLogin(true)} className="nav-item sidebar-auth" style={{ width: '100%', border: 'none', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}><Lock size={16} /> Admin Login</button>
          ) : (
            <button onClick={handleLogout} className="nav-item sidebar-auth active-root" style={{ width: '100%', color: 'var(--cyber-primary)', background: 'rgba(0,242,255,0.05)', border: 'none', fontWeight: '800', cursor: 'pointer' }}><ShieldAlert size={16} /> LOGOUT_ROOT</button>
          )}
        </div>
      </aside>

      <main className="main-viewport glass">
        <div className="glass-dark top-ribbon">
          <div className="ribbon-status">
            <Radio size={14} className="status-dot" />
            <span className="mono">{config.broadcast || 'NEURAL_SYSTEMS_ONLINE'}</span>
            <StatusBadge label={config.maintenance_mode ? 'Maintenance' : 'Realtime'} tone={topStatusTone} />
          </div>
          <div className="ribbon-meta">
            <span className="mono">Archive {scripts.length}</span>
            <span className="mono">Live {deployedCount}</span>
          </div>
        </div>
        <AnimatePresence>
          {notice && (
            <motion.div
              className={`notice-banner ${notice.type || 'info'}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {notice.text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'navigator' && (
            <motion.div key="nav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="chat-window">
              <div className="chat-header" style={{ padding: '32px 64px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="logo-box" style={{ width: '48px', height: '48px', fontSize: '1.4rem' }}>S</div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0 }}>Neural Assistant</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0, marginTop: '4px' }}>Expert AI companion</p>
                  </div>
                </div>
              </div>
              <div className="chat-feed custom-scrollbar" style={{ padding: '40px 64px' }}>
                {messages.length === 1 && !loading && (
                  <div className="prompt-grid">
                    {quickPrompts.map((item) => (
                      <button
                        key={item.title}
                        className="prompt-card glass-dark"
                        onClick={() => {
                          setSelectedLanguage(item.language);
                          setUserInput(item.prompt);
                        }}
                      >
                        <div className="prompt-card-top">
                           <StatusBadge label={item.language.toUpperCase()} tone="info" />
                           <ChevronRight size={16} />
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.prompt}</p>
                      </button>
                    ))}
                  </div>
                )}
                {messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={`msg ${msg.role === 'user' ? 'msg-user' : 'msg-bot'}`} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', background: 'none', border: 'none', maxWidth: '100%', marginBottom: '48px' }}>
                    <div className={`message-avatar glass-dark ${msg.role === 'user' ? 'user' : 'bot'}`} style={{ padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', color: msg.role === 'user' ? 'var(--cyber-primary)' : 'var(--cyber-secondary)', flexShrink: 0, marginTop: '8px' }}>
                      {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                    </div>
                    <div className={`glass-dark message-shell ${msg.role === 'user' ? 'user' : 'bot'}`} style={{ padding: '32px 40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', flex: 1, color: '#ccc', fontSize: '0.98rem', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                      <MarkdownContent content={msg.text} />
                    </div>
                  </motion.div>
                ))}
                {loading && <div className="loading-row" style={{ display: 'flex', gap: '8px', padding: '20px 88px' }}><div className="status-dot"/><div className="status-dot"/><div className="status-dot"/></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="input-matrix" style={{ padding: '32px 64px 48px' }}>
                <div className="composer-shell">
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} type="text" placeholder="State your neural objective..." className="matrix-field composer-input" style={{ width: '100%', background: 'rgba(0,0,0,0.4)', padding: '24px 32px', fontSize: '1.05rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', outline: 'none' }} />
                    <button onClick={sendMessage} className="matrix-action composer-send" style={{ position: 'absolute', right: '12px', top: '12px', height: '48px', width: '48px', borderRadius: '16px', background: 'var(--cyber-primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={20} fill="currentColor" /></button>
                  </div>
                  <div className="composer-footer">
                    <StatusBadge label={loading ? 'Thinking' : 'Ready'} tone={loading ? 'warning' : 'success'} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'deploy' && (
            <motion.div key="deploy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '1fr min(440px, 35%)', gap: '32px', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="glass-dark editor-shell premium-card" style={{ flex: 1, borderRadius: '40px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="surface-header" style={{ padding: '16px 32px', background: 'rgba(0,242,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--cyber-primary)' }}>SOURCE_CORE</span>
                      <select value={deployForm.language} onChange={e => setDeployForm({...deployForm, language: e.target.value})} className="mono" style={{ background: 'none', border: 'none', color: 'var(--text-soft)', outline: 'none' }}>{availableLanguages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
                    </div>
                    <textarea value={deployForm.code} onChange={e => setDeployForm({ ...deployForm, code: e.target.value })} placeholder="# Protocol logic..." className="mono custom-scrollbar code-editor" style={{ flex: 1, padding: '32px', background: 'none', border: 'none', outline: 'none', color: '#888', fontSize: '0.95rem', lineHeight: '1.8', resize: 'none' }} />
                  </div>
                  <button onClick={analyzeCode} disabled={analyzing || !deployForm.code} className="btn-premium" style={{ padding: '24px', borderRadius: '24px' }}>{analyzing ? 'AUDITING...' : 'PERFORM_NEURAL_AUDIT'}</button>
                </div>
                <div className="glass-dark editor-side premium-card" style={{ padding: '48px', borderRadius: '48px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                   <div className="field-stack"><label className="mono field-label">IDENTIFIER</label><input value={deployForm.name} onChange={e => setDeployForm({ ...deployForm, name: e.target.value })} className="matrix-field" style={{ width: '100%', marginTop: '12px' }} /></div>
                   <div className="field-stack"><label className="mono field-label">AUTHOR</label><input value={deployForm.author} onChange={e => setDeployForm({ ...deployForm, author: e.target.value })} placeholder="Enter operator name..." className="matrix-field" style={{ width: '100%', marginTop: '12px' }} /></div>
                   <div className="field-stack"><label className="mono field-label">SUMMARY</label><textarea value={deployForm.description} onChange={e => setDeployForm({ ...deployForm, description: e.target.value })} className="matrix-field" style={{ width: '100%', height: '200px', marginTop: '12px', resize: 'none' }} /></div>
                   <div className="meta-inline">
                     <StatusBadge label={`Version ${deployForm.version}`} tone="info" />
                     <StatusBadge label={`Score ${deployForm.quality_score || 'B'}`} tone="warning" />
                   </div>
                   <button onClick={finalizeDeployment} disabled={loading || !deployForm.name} className="btn-premium" style={{ marginTop: 'auto', padding: '24px', background: 'var(--cyber-primary)', color: 'black', borderRadius: '24px' }}>SUBMIT_FOR_INDEXING</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'deployments' && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '40px', height: '100%', overflowY: 'auto' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
                {deployments.length === 0 ? (
                  <EmptyState
                    icon={<ActivityIcon size={28} />}
                    title="No live nodes"
                    description="Stage a script from the archive to bring your first runtime node into view."
                  />
                ) : deployments.map(dep => (
                  <div key={dep.name} onClick={() => setInspectDeployment(dep)} className="glass-dark hover-glow premium-card protocol-card" style={{ padding: '40px', borderRadius: '48px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div className="protocol-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                      <span className="mono" style={{ color: 'var(--cyber-primary)' }}>{dep.language.toUpperCase()}</span>
                      <StatusBadge label={dep.status} tone={dep.status === 'DEPLOYED' ? 'success' : 'warning'} />
                    </div>
                    <h3 className="protocol-title" style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '16px' }}>{dep.name}</h3>
                    <p className="protocol-description" style={{ fontSize: '0.95rem', color: 'var(--text-soft)', lineHeight: '1.7', marginBottom: '24px' }}>{dep.description}</p>
                    <div className="meta-inline">
                      <StatusBadge label={dep.author || 'UNKNOWN'} tone="neutral" />
                      <StatusBadge label={`Version ${dep.version || '1.0.0'}`} tone="neutral" />
                      <StatusBadge label={formatTimestamp(dep.deployed_at || dep.staged_at)} tone="info" />
                    </div>
                    <div className="protocol-actions" style={{ display: 'flex', gap: '12px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => setInspectDeployment(dep)} className="btn-micro">INSPECT</button>
                      {isAdmin && <button onClick={() => deleteDeployment(dep.name)} className="btn-micro danger" style={{ borderColor: 'var(--cyber-error)', color: 'var(--cyber-error)' }}><Power size={14} /></button>}
                      {dep.status === 'STAGED' && isAdmin && <button onClick={() => deployToDisk(dep.name)} className="btn-micro solid" style={{ background: 'var(--cyber-primary)', color: 'black', border: 'none' }}>ACTIVATE</button>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'models' && (
            <motion.div key="models" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '40px', height: '100%', overflowY: 'auto' }}>
              <SectionHero
                icon={<Cpu size={16} />}
                eyebrow="Intelligence"
                title="Neural Infrastructure"
                description="Manage and monitor locally hosted AI models powering the Neural Assistant and code audit pipelines."
                action={
                  <div className="hero-control">
                    <span className="mono hero-control-label">Available</span>
                    <span className="mono" style={{ color: 'var(--cyber-primary)', fontWeight: '900' }}>{aiModels.length} MODELS</span>
                  </div>
                }
              />
              <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px' }}>
                <div className="glass-dark premium-card forge-card" style={{ padding: '40px', borderRadius: '48px', border: '1px solid rgba(0,242,255,0.15)', display: 'flex', flexDirection: 'column', gap: '24px', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: '340px', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(0,242,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyber-primary)' }}>
                    <PlusCircle size={32} />
                  </div>
                  <div>
                    <h3 className="protocol-title" style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '8px' }}>FORGE NEURAL NODE</h3>
                    <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.6' }}>Drop a .pt model file to generate an automated deployment protocol.</p>
                  </div>
                  <input
                    type="file"
                    id="model-upload"
                    accept=".pt"
                    style={{ display: 'none' }}
                    onChange={(e) => setModelForgeFile(e.target.files[0])}
                  />
                  {!modelForgeFile ? (
                    <label htmlFor="model-upload" className="btn-micro solid" style={{ background: 'var(--cyber-primary)', color: 'black', border: 'none', cursor: 'pointer' }}>SELECT MODEL</label>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      <div className="glass" style={{ padding: '12px 20px', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--cyber-primary)', border: '1px solid rgba(0,242,255,0.2)' }}>{modelForgeFile.name}</div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={forgeModel} disabled={modelForging} className="btn-micro solid" style={{ background: 'white', color: 'black', border: 'none' }}>{modelForging ? 'ANALYZING...' : 'ANALYZE'}</button>
                        <button onClick={() => setModelForgeFile(null)} className="btn-micro" style={{ color: 'var(--cyber-error)' }}>CANCEL</button>
                      </div>
                    </div>
                  )}
                </div>

                {forgedModelData && (
                  <div className="glass-dark premium-card protocol-card active-forge" style={{ padding: '40px', borderRadius: '48px', border: '1px solid var(--cyber-primary)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px 24px', background: 'var(--cyber-primary)', color: 'black', fontSize: '0.65rem', fontWeight: '900', borderBottomLeftRadius: '24px' }}>FORGED_READY</div>
                    <div className="protocol-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                      <span className="mono" style={{ color: 'var(--cyber-primary)', fontWeight: '900' }}>PYTHON_GEN</span>
                    </div>
                    <h3 className="protocol-title" style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '16px' }}>{forgedModelData.name}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '32px', lineHeight: '1.6' }}>{forgedModelData.description}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => setInspectDeployment(forgedModelData)} className="btn-micro">PREVIEW_CODE</button>
                      <button onClick={saveForgedModel} className="btn-micro solid" style={{ background: 'var(--cyber-primary)', color: 'black', border: 'none' }}>INDEX_TO_VAULT</button>
                    </div>
                  </div>
                )}

                {aiModels.map(model => (
                  <div key={model.name} className="glass-dark premium-card protocol-card" style={{ padding: '40px', borderRadius: '48px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div className="protocol-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                      <span className="mono" style={{ color: 'var(--cyber-primary)', fontWeight: '900' }}>MODEL_NODE</span>
                      <StatusBadge label="READY" tone="success" />
                    </div>
                    <h3 className="protocol-title" style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '16px' }}>{model.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SIZE</span>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'white' }}>{model.size ? (model.size / 1024 / 1024 / 1024).toFixed(2) : '0.00'} GB</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>QUANTIZATION</span>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'white' }}>{model.details?.quantization_level || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>MODIFIED</span>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'white' }}>{new Date(model.modified_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="meta-inline">
                      <StatusBadge label={model.details?.family || 'NEURAL'} tone="info" />
                      <StatusBadge label={model.details?.parameter_size || 'DYNAMIC'} tone="neutral" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'library' && (() => {
            const unstagedScripts = scripts.filter(s => !deployments.some(d => d.name === s.name));
            return (
              <motion.div key="lib" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '40px', height: '100%', overflowY: 'auto' }}>
                <SectionHero
                  icon={<Archive size={16} />}
                  eyebrow="Archive"
                  title="Archive Vault"
                  description="Your indexed scripts live here with metadata, audit context, and one-click staging into operations."
                  stats={[
                    { label: 'Indexed', value: scripts.length },
                    { label: 'Ready to Stage', value: unstagedScripts.length },
                  ]}
                />
                <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '32px' }}>
                  {unstagedScripts.length === 0 ? (
                    <EmptyState
                      icon={<Archive size={28} />}
                      title={scripts.length > 0 ? "All scripts staged" : "Archive is empty"}
                      description={scripts.length > 0 ? "All your archived protocols are currently in the staging or live pipeline." : "Analyze and submit a protocol from the deploy tab to build your first premium archive entry."}
                    />
                  ) : unstagedScripts.map(script => (
                    <div key={script.name} className="glass-dark premium-card protocol-card" style={{ padding: '32px', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="protocol-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--cyber-primary)' }}>{script.language}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-micro" onClick={() => setInspectDeployment(script)}>INSPECT</button>
                          {isAdmin && <button onClick={() => stageScript(script)} className="btn-micro">STAGE</button>}
                        </div>
                      </div>
                      <h3 className="protocol-title" style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '16px' }}>{script.name}</h3>
                      <p className="protocol-description" style={{ fontSize: '0.9rem', color: 'var(--text-soft)', lineHeight: '1.7' }}>{script.description}</p>
                      <div className="meta-inline">
                        <StatusBadge label={script.author || 'UNKNOWN'} tone="neutral" />
                        <StatusBadge label={`Version ${script.version || '1.0.0'}`} tone="neutral" />
                        <StatusBadge label={`${(script.key_features || []).length} features`} tone="info" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}

          {activeTab === 'admin' && isAdmin && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="glass-dark admin-tab-row" style={{ padding: '20px 48px', display: 'flex', gap: '48px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                {[
                  { id: 'dashboard', label: 'NEURAL_HEALTH', icon: <Cpu size={18} /> },
                  { id: 'governance', label: 'GOVERNANCE', icon: <ShieldAlert size={18} /> },
                  { id: 'sandbox', label: 'NEURAL_LAB', icon: <FlaskConical size={18} /> },
                  { id: 'terminal', label: 'ROOT_SHELL', icon: <Terminal size={18} /> }
                ].map(t => (
                  <button key={t.id} onClick={() => setAdminSubTab(t.id)} className={`admin-tab ${adminSubTab === t.id ? 'active' : ''}`} style={{ border: 'none', background: 'none', color: adminSubTab === t.id ? 'var(--cyber-primary)' : '#555', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>{t.icon} {t.label}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '48px' }}>
                <AnimatePresence mode="wait">
                  {adminSubTab === 'dashboard' && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '1fr 380px', gap: '32px', height: '100%' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                          <SectionHero
                            icon={<Gauge size={16} />}
                            eyebrow="Admin Telemetry"
                            title="Neural Health"
                            description="Track system load, archive activity, and model reachability from one premium operations console."
                            stats={[
                              { label: 'Latency', value: `${systemHealth.network_latency || 0}ms` },
                              { label: 'Model', value: (systemHealth.ollama_status || 'unknown').toUpperCase() },
                              { label: 'Uptime', value: formatUptime(systemHealth.uptime_seconds) },
                            ]}
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
                             {[
                               { label: 'CPU_LOAD', val: `${systemHealth.cpu_usage}%`, icon: <Cpu />, col: 'var(--cyber-primary)', hist: healthHistory },
                               { label: 'ACTIVE_NODES', val: deployments.length, icon: <ActivityIcon />, col: 'var(--cyber-success)', hist: [] },
                               { label: 'MEM_ALLOC', val: `${(systemHealth.memory_usage/1024).toFixed(1)}GB`, icon: <Database />, col: 'var(--cyber-secondary)', hist: [] }
                             ].map(s => (
                               <div key={s.label} className="glass-dark premium-card metric-card" style={{ padding: '32px', borderRadius: '40px', textAlign: 'center' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                   <div style={{ color: s.col }}>{s.icon}</div>
                                   {s.hist && s.hist.length > 0 && <LineChart data={s.hist} />}
                                 </div>
                                 <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: '900' }}>{s.label}</p>
                                 <p style={{ fontSize: '1.8rem', fontWeight: '900' }}>{s.val}</p>
                               </div>
                             ))}
                          </div>
                          <div className="glass-dark premium-card" style={{ flex: 1, borderRadius: '48px', padding: '40px', display: 'flex', flexDirection: 'column' }}>
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
                    <motion.div key="gov" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(2, 1fr)', gap: '32px' }}>
                       <div className="glass-dark premium-card" style={{ padding: '48px', borderRadius: '48px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><Sliders color="var(--cyber-primary)" /> <h3 className="heading-cyber">PROTOCOL_LIMITS</h3></div>
                          <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '1fr 1fr', gap: '32px' }}>
                             {[
                               { label: 'CHAT_SESSION_MAX', key: 'chat_limit', min: 1 },
                               { label: 'ARCHIVE_STORAGE_MAX', key: 'storage_limit', min: 1 },
                               { label: 'LIVE_NODE_CAPACITY', key: 'node_limit', min: 1 },
                               { label: 'API_REQUEST_RATE', key: 'request_rate', min: 5 }
                             ].map(limit => (
                               <div key={limit.key}>
                                  <label className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{limit.label}</label>
                                  <input 
                                    type="number" 
                                    value={govLimits[limit.key]} 
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      setGovLimits(prev => ({...prev, [limit.key]: isNaN(val) ? limit.min : Math.max(val, limit.min)}));
                                    }} 
                                    className="matrix-field" 
                                    style={{ width: '100%', marginTop: '12px' }} 
                                  />
                               </div>
                             ))}
                          </div>
                          <button onClick={() => updateConfig(govLimits)} className="btn-premium" style={{ padding: '24px', borderRadius: '24px' }}>SYNCHRONIZE_GOVERNANCE</button>
                       </div>
                       <div className="glass-dark premium-card" style={{ padding: '48px', borderRadius: '48px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}><Shield color="var(--cyber-primary)" /> <h3 className="heading-cyber">SYSTEM_OVERRIDE</h3></div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                             <div className="glass-dark premium-card" style={{ padding: '32px', borderRadius: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <div><p style={{ fontWeight: '900', fontSize: '1.1rem' }}>MAINTENANCE_LOCK</p></div>
                                   <button onClick={() => updateConfig({ maintenance_mode: !maintenanceMode })} className="btn-micro" style={{ background: maintenanceMode ? 'var(--cyber-error)' : 'none', color: maintenanceMode ? 'white' : '#666', padding: '12px 24px' }}>{maintenanceMode ? 'ACTIVE' : 'READY'}</button>
                                </div>
                             </div>
                             <div>
                                <label className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>BROADCAST_PULSE</label>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                   {/* broadcastDraft is 100% isolated — polling never touches it */}
                                   <input 
                                     value={broadcastDraft} 
                                     onChange={e => setBroadcastDraft(e.target.value)}
                                     placeholder="Enter broadcast message..."
                                     className="matrix-field" 
                                     style={{ flex: 1 }} 
                                   />
                                   <button onClick={() => updateConfig({ broadcast: broadcastDraft })} className="btn-micro" style={{ padding: '0 24px' }}>PULSE</button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  )}

                  {adminSubTab === 'sandbox' && (
                    <motion.div key="sandbox" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ height: '100%', display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : '1fr 400px', gap: '32px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div className="glass-dark premium-card editor-shell" style={{ flex: 1, borderRadius: '40px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                             <div className="surface-header" style={{ padding: '16px 32px', background: 'rgba(0,242,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span className="mono" style={{ fontSize: '0.7rem', color: 'var(--cyber-primary)' }}>NEURAL_LAB_STRESS_TEST</span></div>
                             <textarea value={sandboxCode} onChange={e => setSandboxCode(e.target.value)} placeholder="# Construct protocol..." className="mono custom-scrollbar code-editor" style={{ flex: 1, padding: '32px', background: 'none', border: 'none', outline: 'none', color: '#aaa', fontSize: '0.95rem', lineHeight: '1.8', resize: 'none' }} />
                          </div>
                          <button onClick={runSandbox} disabled={sandboxing} className="btn-premium" style={{ padding: '24px', borderRadius: '24px' }}>COMMENCE_SIMULATION</button>
                       </div>
                       <div className="glass-dark premium-card" style={{ borderRadius: '40px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}><Binary size={18} color="var(--cyber-primary)" /><h3 className="heading-cyber" style={{ fontSize: '0.8rem' }}>SIMULATED_OUTPUT</h3></div>
                          <div className="custom-scrollbar output-shell" style={{ flex: 1, background: '#000', borderRadius: '24px', padding: '24px', border: '1px solid #111', color: '#0f0', fontSize: '0.85rem' }}>{sandboxOutput || "Awaiting neural trigger..."}</div>
                       </div>
                    </motion.div>
                  )}

                  {adminSubTab === 'terminal' && (
                    <motion.div key="term" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="terminal-shell" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000', borderRadius: '48px', padding: '48px', border: '1px solid #111' }}>
                      <div className="custom-scrollbar terminal-output" style={{ flex: 1, overflowY: 'auto', fontFamily: 'JetBrains Mono', color: '#0f0', fontSize: '1rem', lineHeight: '1.6' }}>
                        <div style={{ color: 'var(--text-dim)', marginBottom: '32px' }}>ROOT_SESSION_ACTIVE // UID: 0 // SCRIPT_SHELL_v4.5</div>
                        {terminalOutput.map((o, i) => <div key={i} style={{ marginBottom: '16px', color: o.type === 'err' ? 'var(--cyber-error)' : o.type === 'in' ? '#555' : '#0f0' }}>{o.text}</div>)}
                        {terminalLoading && <div className="mono" style={{ color: 'var(--cyber-primary)', opacity: 0.6, animation: 'pulse 1.5s infinite' }}>PRODUCING_OUTPUT...</div>}
                        <div ref={termEndRef} />
                      </div>
                      <div className="terminal-input-row" style={{ display: 'flex', gap: '24px', marginTop: '40px', borderTop: '1px solid #111', paddingTop: '40px', flexWrap: isCompactLayout ? 'wrap' : 'nowrap' }}><span className="mono" style={{ color: 'var(--text-dim)', fontWeight: '900' }}>root@script_shell:~$</span><input value={terminalInput} onChange={e => setTerminalInput(e.target.value)} onKeyDown={handleTerminalKeyDown} className="mono terminal-input" style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: '1rem', minWidth: isCompactLayout ? '100%' : '0' }} autoFocus /></div>
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
              style={{ width: 'min(1800px, 96vw)', height: '95vh', borderRadius: '48px', overflow: 'hidden', display: 'flex', flexDirection: isCompactLayout ? 'column' : 'row', border: '1px solid rgba(0,242,255,0.08)' }}
            >
              {/* LEFT PANEL — Source Code */}
              <div
                className="custom-scrollbar"
                style={{
                  flex: isCompactLayout ? 'none' : '1',
                  height: isCompactLayout ? '50%' : '100%',
                  background: '#050608',
                  borderRight: isCompactLayout ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  borderBottom: isCompactLayout ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Code header bar */}
                <div style={{ padding: '20px 32px', background: 'rgba(0,242,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileCode size={16} color="var(--cyber-primary)" />
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--cyber-primary)', fontWeight: '900', letterSpacing: '0.12em' }}>SOURCE_PROTOCOL</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{inspectDeployment.language.toUpperCase()}</span>
                    <button
                      className="btn-micro"
                      onClick={() => navigator.clipboard.writeText(inspectDeployment.code || '')}
                      style={{ padding: '8px 16px', fontSize: '0.65rem' }}
                    >
                      COPY
                    </button>
                  </div>
                </div>
                {/* Code body — scrollable */}
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                  <pre
                    className="mono"
                    style={{
                      margin: 0,
                      padding: '3rem 3.5rem',
                      fontSize: '0.9rem',
                      color: '#7ec8a0',
                      lineHeight: '1.85',
                      whiteSpace: 'pre',
                      minHeight: '100%',
                      background: 'transparent',
                    }}
                  >
                    <code>{inspectDeployment.code}</code>
                  </pre>
                </div>
              </div>

              {/* RIGHT PANEL — All metadata */}
              <div
                className="custom-scrollbar modal-pane modal-pane-side"
                style={{
                  flex: isCompactLayout ? 'none' : '0 0 480px',
                  height: isCompactLayout ? '50%' : '100%',
                  background: 'rgba(8,10,14,0.95)',
                  overflowY: 'auto',
                  padding: isCompactLayout ? '2rem' : '3.5rem 4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '40px',
                }}
              >
                {/* Close */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                  <button onClick={() => setInspectDeployment(null)} className="btn-micro" style={{ padding: '14px', borderRadius: '14px' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Title block */}
                <div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <StatusBadge label={inspectDeployment.author || 'UNKNOWN'} tone="neutral" />
                    <StatusBadge label={inspectDeployment.language.toUpperCase()} tone="info" />
                    <StatusBadge label={`VER ${inspectDeployment.version}`} tone="neutral" />
                    {inspectDeployment.status && (
                      <StatusBadge label={inspectDeployment.status} tone={inspectDeployment.status === 'DEPLOYED' ? 'success' : 'warning'} />
                    )}
                  </div>
                  <h2 className="heading-cyber" style={{ fontSize: '2.4rem', marginBottom: '16px', lineHeight: 1.1 }}>
                    {inspectDeployment.name.toUpperCase()}
                  </h2>
                  <p style={{ fontSize: '1rem', color: '#888', lineHeight: '1.8', marginBottom: '20px' }}>
                    {inspectDeployment.description}
                  </p>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-soft)' }}>AUTHOR: {inspectDeployment.author || 'UNKNOWN'}</span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>VER: {inspectDeployment.version}</span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--cyber-primary)' }}>ENV: {inspectDeployment.language.toUpperCase()}</span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: '#555' }}>UPDATED: {formatTimestamp(inspectDeployment.updated_at || inspectDeployment.staged_at || inspectDeployment.created_at)}</span>
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
                      {/* Code block */}
                      <div style={{ background: '#000', borderRadius: '20px', border: '1px solid rgba(0,242,255,0.1)', overflow: 'hidden' }}>
                        {/* Header bar */}
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
                        {/* Code lines */}
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


      <AnimatePresence>{showLogin && (
        <motion.div className="auth-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass auth-card" style={{ width: '420px', padding: '48px', borderRadius: '40px', textAlign: 'center' }}>
            <Lock size={56} color="var(--cyber-primary)" style={{ margin: '0 auto 32px' }} /><h2 className="heading-cyber">ROOT_AUTH</h2>
            <p className="auth-copy">Secure the premium control plane with root credentials to access governance, health, sandbox, and terminal operations.</p>
            <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="matrix-field" style={{ width: '100%', marginTop: '40px', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.3em' }} autoFocus />
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}><button onClick={() => setShowLogin(false)} className="btn-micro" style={{ flex: 1 }}>CANCEL</button><button onClick={handleLogin} className="btn-premium" style={{ flex: 2 }}>AUTHORIZE</button></div>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

export default App;
