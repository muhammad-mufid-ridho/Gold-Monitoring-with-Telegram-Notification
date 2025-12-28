
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Bell, Settings as SettingsIcon, TrendingUp, AlertCircle, 
  CheckCircle2, Info, Send, RefreshCw, BarChart3, Database, Clock, Globe
} from 'lucide-react';
import { PricePoint, TelegramConfig, MarketInsight, NotificationLog } from './types';
import { getMarketInsight } from './services/geminiService';
import { sendTelegramAlert } from './services/telegramService';
import { fetchLiveGoldPrice } from './services/goldService';

const INITIAL_THRESHOLD = 2900000;

const App: React.FC = () => {
  // State
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<string>('Initializing...');
  const [threshold, setThreshold] = useState<number>(INITIAL_THRESHOLD);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [insight, setInsight] = useState<MarketInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'logs'>('dashboard');
  
  // Settings State (Persisted in LocalStorage)
  const [tgConfig, setTgConfig] = useState<TelegramConfig>(() => {
    const saved = localStorage.getItem('gold_tg_config');
    return saved ? JSON.parse(saved) : { botToken: '', chatId: '', enabled: false };
  });

  const lastAlertTimeRef = useRef<number>(0);

  // Persistence
  useEffect(() => {
    localStorage.setItem('gold_tg_config', JSON.stringify(tgConfig));
  }, [tgConfig]);

  // Real Price Fetching
  const fetchPrice = useCallback(async () => {
    setLoadingPrice(true);
    try {
      const data = await fetchLiveGoldPrice();
      setCurrentPrice(data.pricePerGram);
      setLastUpdated(new Date(data.timestamp));
      setDataSource(data.source);
      
      const newPoint = {
        time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: data.pricePerGram
      };

      setPriceHistory(history => {
        const updated = [...history, newPoint];
        return updated.slice(-30); // Keep last 30 points
      });
    } catch (error) {
      console.error("Monitoring Error:", error);
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  // Monitoring Loop
  useEffect(() => {
    let interval: any;
    if (isMonitoring) {
      fetchPrice(); // Fetch immediately
      interval = setInterval(fetchPrice, 60000); // Update every 1 minute
    }
    return () => clearInterval(interval);
  }, [isMonitoring, fetchPrice]);

  // Alert Check
  useEffect(() => {
    const checkThreshold = async () => {
      if (isMonitoring && currentPrice > 0 && currentPrice >= threshold) {
        // Debounce alerts to once every 10 minutes to avoid spamming real API usage
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 600000) {
          const success = await sendTelegramAlert(tgConfig, currentPrice, threshold);
          
          setLogs(prev => [
            {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString(),
              message: `Price threshold IDR ${threshold.toLocaleString()} triggered at IDR ${currentPrice.toLocaleString()}`,
              status: success ? 'success' : 'failed'
            },
            ...prev
          ].slice(0, 50));

          if (success) {
            lastAlertTimeRef.current = now;
          }
        }
      }
    };
    checkThreshold();
  }, [currentPrice, threshold, isMonitoring, tgConfig]);

  const handleFetchInsight = async () => {
    if (currentPrice === 0) return;
    setLoadingInsight(true);
    const result = await getMarketInsight(currentPrice);
    setInsight(result);
    setLoadingInsight(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f172a] text-slate-200">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-amber-500 p-2 rounded-lg">
            <TrendingUp className="text-slate-900 w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">GoldWatch</h1>
        </div>

        <div className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <BarChart3 className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <SettingsIcon className="w-5 h-5" /> Settings
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-amber-500/10 text-amber-500 font-semibold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Database className="w-5 h-5" /> Alert Logs
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isMonitoring ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{isMonitoring ? 'Live API Monitoring' : 'Monitoring Stopped'}</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'dashboard' ? 'Market Overview' : activeTab === 'settings' ? 'Telegram Integration' : 'Notification Logs'}
            </h2>
            <p className="text-slate-400">Monitoring real-time gold market prices via public financial APIs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isMonitoring ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20'}`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Real-Time Sync'}
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Price Stats */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Current Price (IDR/g)</span>
                    {loadingPrice && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                  </div>
                  <div className="text-4xl font-black text-white">
                    {currentPrice > 0 ? `IDR ${currentPrice.toLocaleString('id-ID')}` : '---'}
                  </div>
                  <div className="mt-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                      <Globe className="w-3 h-3" /> Source: {dataSource}
                    </div>
                    {lastUpdated && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Clock className="w-3 h-3" /> Last sync: {lastUpdated.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm">
                  <span className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2 block">Trigger Threshold</span>
                  <div className="flex items-center gap-4">
                    <div className="relative w-full">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">IDR</span>
                      <input 
                        type="number" 
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="bg-slate-800/50 border border-slate-700 text-2xl font-bold text-white w-full pl-14 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-slate-400 text-sm">
                    <Bell className="w-4 h-4 text-amber-500" /> Auto-alert when price exceeds this value
                  </div>
                </div>
              </div>

              {/* Main Chart */}
              <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-500" /> Historical Trend</h3>
                  <div className="text-xs text-slate-500">Auto-updates every 60 seconds</div>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  {priceHistory.length > 0 ? (
                    <AreaChart data={priceHistory}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `Rp${(val/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 italic">
                      Start monitoring to see price movement chart...
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sidebar Stats / AI Insight */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-amber-500" /> AI Insights</h3>
                  <button 
                    disabled={loadingInsight || currentPrice === 0}
                    onClick={handleFetchInsight}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                    title="Generate analysis based on current real price"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingInsight ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {insight ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400 uppercase tracking-tighter">Market Sentiment:</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        insight.sentiment === 'Bullish' ? 'bg-green-500/20 text-green-400' : 
                        insight.sentiment === 'Bearish' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {insight.sentiment}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 mb-1 uppercase">Analysis</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{insight.analysis}</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                      <h4 className="text-xs font-bold text-amber-500 mb-1 uppercase">Recommendation</h4>
                      <p className="text-sm text-slate-300 italic">"{insight.recommendation}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-4">
                    <div className="bg-slate-800 w-12 h-12 rounded-2xl mx-auto flex items-center justify-center">
                      <Info className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">
                      {currentPrice === 0 
                        ? 'Wait for live price data to analyze.' 
                        : 'Get AI sentiment analysis based on the live IDR price.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-3xl text-slate-900 shadow-xl shadow-amber-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Telegram Alerts</h3>
                </div>
                <p className="text-sm text-slate-900/80 mb-6 leading-relaxed">
                  Real-time synchronization active. You will receive an alert once the global gold market hits your threshold.
                </p>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  Edit Telegram Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings and Logs tabs remain mostly the same but with enhanced styling */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-500/10 p-3 rounded-2xl">
                <Send className="text-blue-500 w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Bot Configuration</h3>
                <p className="text-slate-400 text-sm">Provide your Telegram credentials to enable notifications.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Bot API Token</label>
                <input 
                  type="password"
                  placeholder="Paste your bot token here..."
                  value={tgConfig.botToken}
                  onChange={(e) => setTgConfig({...tgConfig, botToken: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Target Chat ID</label>
                <input 
                  type="text"
                  placeholder="Enter your User ID or Group Chat ID..."
                  value={tgConfig.chatId}
                  onChange={(e) => setTgConfig({...tgConfig, chatId: e.target.value})}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${tgConfig.enabled ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {tgConfig.enabled ? <CheckCircle2 /> : <AlertCircle />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Enable Notifications</h4>
                    <p className="text-slate-400 text-xs">Allow the app to send messages when target is hit.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setTgConfig({...tgConfig, enabled: !tgConfig.enabled})}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tgConfig.enabled ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tgConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-sm text-amber-500 flex gap-3">
                <Info className="shrink-0 w-5 h-5" />
                <p>
                  To get your Chat ID, message <strong>@userinfobot</strong> on Telegram. 
                  To create a bot, talk to <strong>@BotFather</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {logs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center space-y-4">
                <div className="bg-slate-800 w-16 h-16 rounded-3xl mx-auto flex items-center justify-center">
                  <Database className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">No Logs Yet</h3>
                  <p className="text-slate-500">History of price alerts will appear here after synchronization.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${log.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {log.status === 'success' ? <CheckCircle2 /> : <AlertCircle />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{log.message}</p>
                        <p className="text-xs text-slate-500">{log.timestamp}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${log.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
