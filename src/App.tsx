/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Users,
  CheckCircle,
  TrendingUp,
  Compass,
  DollarSign,
  Wind,
  Thermometer,
  Beer,
  Utensils,
  User,
  Coffee,
  MessageSquare,
  Database,
  RefreshCw,
  Sliders,
  UserCheck,
  Crown,
  ArrowRight,
  Clock,
  Activity,
  Flame,
  Zap,
  Sparkles,
  Smartphone,
  Info,
  Send,
  Plus
} from "lucide-react";
import { DBState, LiveEvent, Vendor, PosSale, GameContext, QueryResponse } from "./types";
import { seedVendors } from "./seedData";

export default function App() {
  // DB & UI States
  const inputRef = useRef<HTMLInputElement>(null);
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [activeTab, setActiveTab] = useState<"fan" | "vendor" | "fantasy">("fan");
  const [queryInput, setQueryInput] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "agent"; text: string; details?: any }>>([
    {
      sender: "agent",
      text: "👋 Welcome to StadiumSurgeSync Agent Deck! I coordinate real-time stadium dynamics for the 2026 World Cup. Choose a role tab below, select a demo query or type your own question to see how my multi-agent loop orchestrates live data!",
    }
  ]);

  // Selected sub-states
  const [userSection, setUserSection] = useState<"East" | "West" | "North" | "South">("East");
  const [selectedVendorId, setSelectedVendorId] = useState("vendor_1e_beer");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Custom manual insertion states
  const [newDensity, setNewDensity] = useState(85);
  const [newWaitTime, setNewWaitTime] = useState(15);
  const [newSection, setNewSection] = useState<"East" | "West" | "North" | "South">("West");
  const [newType, setNewType] = useState<"beer_stand" | "food_stand" | "taco_stand" | "bathroom" | "gate">("beer_stand");

  // Fetch current simulated DB State from server
  const fetchDB = async () => {
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const data = await res.json();
        setDbState(data);
      }
    } catch (e) {
      console.error("Error fetching simulated database state:", e);
    }
  };

  // Reset database state to seeds
  const resetDB = async () => {
    try {
      const res = await fetch("/api/db/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDbState(data.db);
        setQueryResult(null);
        setChatHistory([
          {
            sender: "agent",
            text: "🔄 Simulated MongoDB Atlas collections have been reset to default values! Past games pos_sales, current game live_events, and standard matchday vendor catalogs are reloaded.",
          }
        ]);
      }
    } catch (e) {
      console.error("Error resetting database state:", e);
    }
  };

  // Submit query to StadiumSurgeSync API
  const submitQuery = async (queryText: string) => {
    if (queryLoading) return;
    if (!queryText.trim()) return;
    setQueryLoading(true);
    setQueryInput("");

    // Add user message to local chat log
    setChatHistory(prev => [...prev, { sender: "user", text: queryText }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          section: userSection
        })
      });

      if (res.ok) {
        const data: QueryResponse = await res.json();
        setQueryResult(data);
        if (data.updatedDbState) {
          setDbState(data.updatedDbState);
        }

        // Switch to corresponding role tab if the AI detected it
        if (data.detectedUserType) {
          setActiveTab(data.detectedUserType);
        }

        // Add agent response to local chat log with tool calls included
        setChatHistory(prev => [
          ...prev,
          {
            sender: "agent",
            text: data.responseText,
            details: {
              detectedUserType: data.detectedUserType,
              toolCalls: data.toolCalls,
              feedbackLoop: data.feedbackLoop
            }
          }
        ]);
        
        // Auto select appropriate vendor if they are a vendor querying
        if (data.detectedUserType === "vendor") {
          const matchedVendor = data.updatedDbState?.vendors.find(v => v.section === userSection);
          if (matchedVendor) {
            setSelectedVendorId(matchedVendor._id);
          }
        }
      } else {
        const errorData = await res.json();
        setChatHistory(prev => [
          ...prev,
          { sender: "agent", text: `❌ Error querying agent: ${errorData.error || "Unknown server response."}` }
        ]);
      }
    } catch (e: any) {
      setChatHistory(prev => [
        ...prev,
        { sender: "agent", text: `❌ Request failed. Ensure the server is running and your GEMINI_API_KEY secret is configured. Error: ${e.message}` }
      ]);
    } finally {
      setQueryLoading(false);
      // scroll query box details into view
      setTimeout(() => {
        const elem = document.getElementById("chat-bottom-anchor");
        if (elem) elem.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  };

  // Insert simulated manual event to cause crowd surge manually
  const triggerManualSurge = async () => {
    try {
      const customId = `manual_live_event_${Date.now()}`;
      const mockEvent: LiveEvent = {
        _id: customId,
        timestamp: new Date().toISOString(),
        type: newType,
        wait_time: Number(newWaitTime),
        crowd_density: Number(newDensity),
        stadium_section: newSection,
        location: {
          type: "Point",
          coordinates: [
            newSection === "East" ? -43.2282 : newSection === "West" ? -43.2322 : -43.2302,
            newSection === "North" ? -22.9101 : newSection === "South" ? -22.9141 : -22.9121
          ]
        }
      };

      const res = await fetch("/api/db/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "live_events",
          item: mockEvent
        })
      });

      if (res.ok) {
        await fetchDB();
        // Give visual confirmation
        setChatHistory(prev => [
          ...prev,
          {
            sender: "agent",
            text: `📈 Alert Trigger Mocked! Inserted high-density ${newType} record in Section ${newSection} (${newDensity}% density, ${newWaitTime} min wait). Try asking: "What should I prep in section ${newSection}?" or "Any short lines near Section ${newSection}?" to see how the background rules engine updates vendor alert status!`
          }
        ]);
        setShowAdminPanel(false);
      }
    } catch (e) {
      console.error("Error inserting manual event:", e);
    }
  };

  // Load database on mount
  useEffect(() => {
    fetchDB();
  }, []);

  // Preset demo prompts representing the different system persona triggers
  const promptSuggestions = {
    fan: [
      { label: "🍻 Craving beer in East Section", text: "I'm in Section East, need a beer fast" },
      { label: "🍔 Quickest burger lines", text: "Where is the shortest line for food near me?" },
      { label: "🚻 Bathroom wait under 5 mins?", text: "Is there a restroom close with wait times under 5 minutes?" }
    ],
    vendor: [
      { label: "🌮 West Taco stand prep check", text: "I run Azteca Taco Stand in Section West. Should I prep extra?" },
      { label: "🍺 Crowds building near East beer?", text: "Get live crowd averages and prepare demand forecast for East vendors" },
      { label: "⚽ Merch optimization plan", text: "What is my current stock level and merchandise suggestions?" }
    ],
    fantasy: [
      { label: "👑 Start/Captain Mbappe?", text: "Should I captain Mbappe tonight?" },
      { label: "🇧🇷 Vinicius Jr Momentum score", text: "What is the Crowd Momentum rating for Vinicius Jr?" },
      { label: "⭐ Fantasy strategy overview", text: "Show me fantasy leaderboard lineups relative to stadium excitement" }
    ]
  };

  // Calculate high-level crowd telemetry for visual map representation
  const getSectionStats = (section: "East" | "West" | "North" | "South") => {
    if (!dbState) return { avgDensity: 50, avgWait: 8, standsCount: 2 };
    const relevantEvents = dbState.live_events.filter(e => e.stadium_section === section);
    const relevantVendors = dbState.vendors.filter(v => v.section === section);
    
    if (relevantEvents.length === 0) {
      return {
        avgDensity: section === "East" ? 65 : section === "West" ? 78 : section === "North" ? 82 : 45,
        avgWait: section === "East" ? 10 : section === "West" ? 14 : section === "North" ? 18 : 6,
        standsCount: relevantVendors.length || 2
      };
    }

    const totalDensity = relevantEvents.reduce((acc, e) => acc + e.crowd_density, 0);
    const totalWait = relevantEvents.reduce((acc, e) => acc + e.wait_time, 0);

    return {
      avgDensity: Math.round(totalDensity / relevantEvents.length),
      avgWait: Math.round(totalWait / relevantEvents.length),
      standsCount: relevantVendors.length
    };
  };

  // Current matchday status
  const currentMatch = dbState?.game_context[0] || {
    teams: ["Brazil", "France"],
    attendance: 60000,
    weather: "hot",
    city: "Rio de Janeiro",
    kickoff: "2026-06-10T15:00:00Z"
  };

  const getIntensityColor = (density: number) => {
    if (density > 80) return "text-rose-400 bg-rose-950/40 border-rose-800/30";
    if (density > 60) return "text-amber-400 bg-amber-950/40 border-amber-800/30";
    return "text-emerald-400 bg-emerald-950/40 border-emerald-800/30";
  };

  const currentVendor = dbState?.vendors.find(v => v._id === selectedVendorId) || dbState?.vendors[0];

  const getLowStockCount = () => {
    if (!currentVendor) return 0;
    return currentVendor.menu.filter(item => {
      let initialStock = 100;
      if (item.name === "Classic Burger") initialStock = 50;
      else if (item.name === "Pepperoni Slice") initialStock = 120;
      else if (item.name === "Cheese Pizza (Whole)") initialStock = 150;
      else {
        const seedV = seedVendors.find(v => v._id === currentVendor._id);
        const seedI = seedV?.menu.find(i => i.name === item.name);
        if (seedI) {
          initialStock = seedI.stock;
        }
      }
      return item.stock <= initialStock * 0.1;
    }).length;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row antialiased font-sans">
      
      {/* LEFT PANEL: Live Interactive Stadium Console (Visual Map, Controls, Atlas state) */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full md:border-r border-zinc-900 overflow-y-auto">
        
        {/* Top App Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs uppercase tracking-widest font-mono text-zinc-400">Maracanã Stadium Command Deck</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-1">
              🔋 StadiumSurgeSync <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">FIFA 2026 Edition</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium border border-zinc-800 text-zinc-300 transition flex items-center gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5" />
              Surge Simulator
            </button>
            <button
              onClick={resetDB}
              className="px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 text-xs font-medium border border-rose-900/40 transition flex items-center gap-1.5"
              title="Reset MongoDB collections to default seed data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset DB
            </button>
          </div>
        </div>

        {/* Live Match Alert Status Panel */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-xl p-4 mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Crown className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-500 bg-rose-500/15 border border-rose-500/30 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">LIVE Match</span>
                <span className="text-xs text-zinc-400">Match 64 · Rio de Janeiro</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                🇧🇷 Brazil vs 🇫🇷 France — 2026 World Cup Final
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2 rounded-lg text-xs font-mono">
            <div>
              <span className="text-zinc-500 block uppercase text-[10px]">Minute</span>
              <span className="text-white font-bold text-sm">74' (2nd Half)</span>
            </div>
            <div className="border-l border-zinc-800 h-8"></div>
            <div>
              <span className="text-zinc-500 block uppercase text-[10px]">Score</span>
              <span className="text-emerald-400 font-extrabold text-sm">1 — 1</span>
            </div>
            <div className="border-l border-zinc-800 h-8"></div>
            <div>
              <span className="text-zinc-500 block uppercase text-[10px]">Attendance</span>
              <span className="text-white font-bold text-sm">60,000</span>
            </div>
          </div>
        </div>

        {/* Admin manual surge generator */}
        {showAdminPanel && (
          <div className="bg-zinc-900/90 border border-amber-500/30 p-4 rounded-xl mt-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Crowd Surge Override System (Trigger alerts)
              </h3>
              <button onClick={() => setShowAdminPanel(false)} className="text-zinc-500 hover:text-white text-xs">Close</button>
            </div>
            <p className="text-xs text-zinc-400 my-2">
              Simulate high crowd density in a specific stadium section. When density crosses 80%, the system triggers the multi-agent background loop, raising real-time warnings on nearest vendors in that section.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-[10px] block text-zinc-500 uppercase font-mono">Section</label>
                <select 
                  value={newSection} 
                  onChange={(e) => setNewSection(e.target.value as any)}
                  className="w-full text-xs font-mono bg-zinc-950 p-2 border border-zinc-800 rounded focus:border-amber-500 outline-none text-zinc-300 mt-1"
                >
                  <option value="North">North (France Hotel/Pub Area)</option>
                  <option value="West">West (Samba/Brazil Stand)</option>
                  <option value="East">East (Shared Sector)</option>
                  <option value="South">South (Secondary Sector)</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] block text-zinc-500 uppercase font-mono">Stand Type</label>
                <select 
                  value={newType} 
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full text-xs font-mono bg-zinc-950 p-2 border border-zinc-800 rounded focus:border-amber-500 outline-none text-zinc-300 mt-1"
                >
                  <option value="beer_stand">Beer Stand</option>
                  <option value="food_stand">Food Joint</option>
                  <option value="taco_stand">Taco Stand</option>
                  <option value="bathroom">Bathroom Facility</option>
                  <option value="gate">Entrance / Gate</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] block text-zinc-500 uppercase font-mono">Density ({newDensity}%)</label>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={newDensity} 
                  onChange={(e) => setNewDensity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-3"
                />
              </div>

              <div>
                <label className="text-[10px] block text-zinc-500 uppercase font-mono">Wait Time ({newWaitTime}m)</label>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={newWaitTime} 
                  onChange={(e) => setNewWaitTime(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-3"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={triggerManualSurge}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Inject Surge Event into Atlas
              </button>
            </div>
          </div>
        )}

        {/* Real-time Simulated Stadium Map Grid */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4 flex items-center justify-between">
            <span>🏟️ Live Grid Activity Map</span>
            <span className="text-xs text-zinc-400 capitalize normal-case font-sans">Tap section to set your location context</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* The Stadium Arena Visualization */}
            <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-2xl flex flex-col items-center justify-center relative min-h-[300px]">
              
              {/* Outer boundary representation */}
              <div className="w-64 h-64 rounded-full border-4 border-dashed border-zinc-800/80 flex items-center justify-center relative bg-zinc-950/60 p-2 shadow-inner">
                
                {/* Soccer Pitch centerpiece */}
                <div className="w-36 h-24 border border-zinc-800/60 rounded relative flex items-center justify-center bg-emerald-950/20 shadow-lg overflow-hidden">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-zinc-800/40"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 border border-zinc-800/40 rounded-full"></div>
                </div>

                {/* Section Overlays */}
                {/* NORTH SECTOR */}
                <button
                  id="section_btn_north"
                  onClick={() => setUserSection("North")}
                  className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg border text-center transition min-w-[80px] cursor-pointer ${
                    userSection === "North"
                      ? "bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-[10px] uppercase font-mono tracking-widest">North</p>
                  <p className="text-xs font-bold text-white mt-0.5">{getSectionStats("North").avgDensity}% Den</p>
                </button>

                {/* SOUTH SECTOR */}
                <button
                  id="section_btn_south"
                  onClick={() => setUserSection("South")}
                  className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg border text-center transition min-w-[80px] cursor-pointer ${
                    userSection === "South"
                      ? "bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-[10px] uppercase font-mono tracking-widest">South</p>
                  <p className="text-xs font-bold text-white mt-0.5">{getSectionStats("South").avgDensity}% Den</p>
                </button>

                {/* EAST SECTOR */}
                <button
                  id="section_btn_east"
                  onClick={() => setUserSection("East")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border text-center transition min-w-[80px] cursor-pointer ${
                    userSection === "East"
                      ? "bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-[10px] uppercase font-mono tracking-widest">East</p>
                  <p className="text-xs font-bold text-white mt-0.5">{getSectionStats("East").avgDensity}% Den</p>
                </button>

                {/* WEST SECTOR */}
                <button
                  id="section_btn_west"
                  onClick={() => setUserSection("West")}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border text-center transition min-w-[80px] cursor-pointer ${
                    userSection === "West"
                      ? "bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-500/20"
                      : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-[10px] uppercase font-mono tracking-widest">West</p>
                  <p className="text-xs font-bold text-white mt-0.5">{getSectionStats("West").avgDensity}% Den</p>
                </button>

              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-4">Selected Location Context: Section <strong className="text-purple-400">{userSection}</strong></p>
            </div>

            {/* Live Metrics Breakdowns by Selected Section */}
            <div className="flex flex-col gap-3 justify-between">
              <div className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-2xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-mono text-zinc-500">Telemetry Breakdown</span>
                    <span className="text-xs font-bold text-white px-2 py-0.5 bg-zinc-800 rounded">Section {userSection}</span>
                  </div>
                  
                  <div className="space-y-3.5 mt-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Crowd Density
                        </span>
                        <span className="font-bold text-white">{getSectionStats(userSection).avgDensity}% Capacity</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${getSectionStats(userSection).avgDensity}%`, backgroundColor: getSectionStats(userSection).avgDensity > 80 ? '#f43f5e' : getSectionStats(userSection).avgDensity > 60 ? '#f59e0b' : '#10b981' }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Avg Line Wait (Current)
                        </span>
                        <span className="font-bold text-white">{getSectionStats(userSection).avgWait} mins</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, (getSectionStats(userSection).avgWait / 20) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Activity className="h-3 w-3" /> Active Registered Outlets
                        </span>
                        <span className="font-bold text-white">{getSectionStats(userSection).standsCount} food / drinks</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-850 pt-3 mt-4 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
                    Active Sync State
                  </span>
                  <span>MongoDB Atlas Trigger Log OK</span>
                </div>
              </div>

              {/* Quick instructions hint */}
              <div className="bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl flex items-start gap-2 text-xs text-zinc-400">
                <Info className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-300">Cooperative Loop logic in play:</span> Anytime a user queries the model about a high-density area, the system sets active warnings on vendors inside MongoDB itself, ensuring the mock kiosk owner, fantasy manager, and fan stay perfectly in step.
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* MongoDB Document Store Viewer (Atlas Simulator) */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-emerald-400" />
              Live MongoDB Atlas Database Inspector
            </h2>
            <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded font-mono">
              In-Memory Cluster Sandbox
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
              
              {/* Table/Document Category toggler */}
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-850 flex items-center gap-4 text-xs font-mono overflow-x-auto">
                <span className="text-zinc-500 font-bold">COLLECTIONS:</span>
                <button
                  id="coll_tab_live_events"
                  onClick={() => fetchDB()} // simple refresh trigger
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  📂 live_events ({dbState?.live_events.length || 0})
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  id="coll_tab_vendors"
                  className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  📂 vendors ({dbState?.vendors.length || 0})
                </button>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-400 flex items-center gap-1">
                  📂 pos_sales ({dbState?.pos_sales.length || 0})
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-400">
                  📂 game_context
                </span>
              </div>

              {/* Mini Interactive Log Viewer */}
              <div className="p-3 max-h-[220px] overflow-y-auto text-xs font-mono space-y-2 select-text">
                {dbState ? (
                  <>
                    <p className="text-zinc-500 text-[10px] uppercase">// Most Recent Stadium events database pipeline Logs</p>
                    
                    {/* Live events render */}
                    {dbState.live_events.slice(0, 4).map((event) => (
                      <div key={event._id} className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded flex justify-between items-start gap-2 hover:bg-zinc-900 transition">
                        <div>
                          <span className="text-[10px] bg-zinc-850 text-emerald-400 px-1 py-0.5 rounded border border-zinc-800 font-bold uppercase mr-2 inline-block">
                            {event.type.replace("_", " ")}
                          </span>
                          <span className="text-zinc-400 font-sans">
                            {event.stadium_section} Sec Wait: <strong className="text-white">{event.wait_time}m</strong>, Crowd: <strong className="text-yellow-400">{event.crowd_density}%</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {new Date(event.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                        </span>
                      </div>
                    ))}

                    {/* Active Alerts block on Vendors */}
                    <div className="border-t border-dashed border-zinc-850 my-2 pt-2">
                      <p className="text-zinc-500 text-[10px] uppercase">// Connected Vendors (Active warnings & Catalog metrics)</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dbState.vendors.map((vendor) => (
                        <div 
                          key={vendor._id} 
                          onClick={() => {
                            setSelectedVendorId(vendor._id);
                            setActiveTab("vendor");
                          }}
                          className={`p-2 rounded border transition text-[11px] cursor-pointer ${
                            vendor.alert 
                              ? "bg-rose-950/20 border-rose-900/50 hover:bg-rose-950/30 text-rose-300" 
                              : "bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-300"
                          } ${vendor._id === selectedVendorId ? "ring-1 ring-purple-500/50" : ""}`}
                        >
                          <div className="flex justify-between font-bold text-white items-center">
                            <span>{vendor.name} ({vendor.section})</span>
                            <span className="text-[9px] uppercase font-mono px-1 rounded bg-zinc-800">{vendor.type.replace("_", " ")}</span>
                          </div>
                          <div className="mt-1 text-zinc-400 font-sans flex items-center justify-between text-[10px]">
                            <span>Capacity: {vendor.capacity} pax</span>
                            <span className="text-emerald-400">{vendor.menu.length} catalog items</span>
                          </div>
                          {vendor.alert && (
                            <div className="mt-1.5 p-1 bg-rose-950/40 border border-rose-900/30 rounded text-[10px] text-rose-400 flex items-start gap-1 font-sans">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">{vendor.alert}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto pb-1" />
                    Fetching simulation context from local database state...
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: Simulated Smartphone Mobile First Viewer Frame */}
      <div className="bg-zinc-900 md:w-[410px] border-l border-zinc-900 flex justify-center items-center py-6 px-4 shrink-0 shadow-3xl">
        
        {/* Mobile simulator device boundary frame wrapper */}
        <div id="smartphone_view" className="w-full max-w-[390px] h-[820px] bg-black rounded-[40px] border-[10px] border-zinc-800 relative shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-1 ring-zinc-700/50">
          
          {/* Top Notch Area */}
          <div className="absolute top-0 inset-x-0 h-7 bg-black z-30 flex items-center justify-between px-6 select-none pointer-events-none">
            <span className="text-[11px] font-bold font-mono tracking-tight text-white mt-1">14:44</span>
            <div className="w-24 h-4.5 bg-black rounded-b-2xl absolute left-1/2 -translate-x-1/2 top-0 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-800"></span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-1">
              <span>5G</span>
              <span>📶</span>
              <span className="text-emerald-400">🔋 84%</span>
            </div>
          </div>

          {/* Smartphone UI Content Container - Scrollable inside the bezel */}
          <div className="flex-1 flex flex-col bg-zinc-950 pt-7 overflow-y-auto no-scrollbar pb-36 relative">
            
            {/* Header branding inside device */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 px-4 py-3 border-b border-zinc-900/80 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500 font-black text-black text-center text-sm flex items-center justify-center tracking-tighter">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight text-white">StadiumSurgeSync</h3>
                    <p className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="h-1 w-1 bg-emerald-400 rounded-full animate-ping"></span> Live World Cup Companion
                    </p>
                  </div>
                </div>
                
                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono">
                  {currentMatch.teams[0].slice(0,3).toUpperCase()} {1}—{1} {currentMatch.teams[1].slice(0,3).toUpperCase()} {`74'`}
                </span>
              </div>
            </div>

            {/* Smart role persona selector panel in device */}
            <div className="grid grid-cols-3 gap-1 px-3 py-3 bg-zinc-900/60 border-b border-zinc-900/80 sticky top-[53px] z-10 backdrop-blur-md">
              <button
                id="role_tab_fan"
                onClick={() => setActiveTab("fan")}
                className={`py-1.5 px-1 rounded-lg text-center transition font-semibold flex flex-col items-center justify-center gap-0.5 text-xs ${
                  activeTab === "fan"
                    ? "bg-emerald-500 text-black shadow-lg"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-white"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Fan Deck</span>
              </button>

              <button
                id="role_tab_vendor"
                onClick={() => setActiveTab("vendor")}
                className={`py-1.5 px-1 rounded-lg text-center transition font-semibold flex flex-col items-center justify-center gap-0.5 text-xs relative ${
                  activeTab === "vendor"
                    ? "bg-amber-500 text-black shadow-lg"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-white"
                }`}
              >
                {getLowStockCount() > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 z-10">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] text-white font-black items-center justify-center border border-zinc-950 leading-none">
                      {getLowStockCount()}
                    </span>
                  </span>
                )}
                <Utensils className="h-3.5 w-3.5" />
                <span>Vendor Kiosk</span>
              </button>

              <button
                id="role_tab_fantasy"
                onClick={() => setActiveTab("fantasy")}
                className={`py-1.5 px-1 rounded-lg text-center transition font-semibold flex flex-col items-center justify-center gap-0.5 text-xs ${
                  activeTab === "fantasy"
                    ? "bg-purple-500 text-black shadow-lg"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-900 hover:text-white"
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Fantasy Coach</span>
              </button>
            </div>

            {/* 🟢 FAN VIEW */}
            {activeTab === "fan" && (
              <div id="fan_view_deck" className="px-4 py-2 animate-fadeIn space-y-4">
                
                {/* Visual section indicator */}
                <div className="p-3.5 bg-zinc-900/80 border border-zinc-850 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-rose-500" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Your Seated Section</p>
                      <h4 className="text-sm font-bold text-white">Section {userSection} Outer Concourse</h4>
                    </div>
                  </div>
                  <select
                    value={userSection}
                    onChange={(e) => setUserSection(e.target.value as any)}
                    className="text-xs bg-zinc-950 border border-zinc-800 p-1 rounded font-bold text-zinc-300 outline-none"
                  >
                    <option value="East">East Section</option>
                    <option value="West">West Section</option>
                    <option value="North">North Section</option>
                    <option value="South">South Section</option>
                  </select>
                </div>

                {/* Queue status block */}
                <div>
                  <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-zinc-500 mb-2 flex items-center justify-between">
                    <span>⚡ Quick Routing Recommendations</span>
                    <span className="text-[10px] text-emerald-400 capitalize normal-case">Wait &lt; 10M Preferred</span>
                  </h4>
                  
                  <div className="space-y-2">
                    {dbState?.live_events
                      .filter(e => e.stadium_section === userSection)
                      .slice(0, 3)
                      .map((e, index) => {
                        const vendorMap = dbState.vendors.find(v => v.section === userSection && v.type === e.type);
                        return (
                          <div 
                            key={e._id} 
                            className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 p-3 rounded-xl flex items-center justify-between gap-2 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 bg-zinc-950 rounded-lg text-emerald-400 border border-zinc-850">
                                {e.type === "beer_stand" ? <Beer className="h-3.5 w-3.5" /> : 
                                 e.type === "food_stand" ? <Utensils className="h-3.5 w-3.5" /> : 
                                 e.type === "taco_stand" ? <Flame className="h-3.5 w-3.5" /> :
                                 e.type === "bathroom" ? <Clock className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white capitalize">{vendorMap ? vendorMap.name : e.type.replace("_", " ")}</h5>
                                <p className="text-[10px] text-zinc-400">Section {e.stadium_section} · Fast walk route</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                e.wait_time > 12 ? "bg-rose-950 text-rose-300" : e.wait_time > 6 ? "bg-amber-950 text-amber-300" : "bg-emerald-950 text-emerald-300"
                              }`}>
                                {e.wait_time} min wait
                              </span>
                              <p className="text-[9px] text-zinc-500 font-mono mt-1">{e.crowd_density}% crowd density</p>
                            </div>
                          </div>
                        );
                    })}

                    {(!dbState || dbState.live_events.filter(e => e.stadium_section === userSection).length === 0) && (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                        No active queue markers loaded for this terminal section
                      </div>
                    )}
                  </div>
                </div>

                {/* Star player souvenir cross-reference alert */}
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1 bg-indigo-500 text-black text-[8px] font-mono uppercase font-black uppercase tracking-widest leading-none rounded-bl">
                    SOUVENIR MATCH
                  </div>
                  <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5 text-yellow-400" />
                    Recommended Item On-Duty Near You
                  </h5>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    France/Brazil souvenirs are on sale in Section {userSection}. The local Carioca & Copacabana kiosks are stocking official <strong className="text-white">Mbappe</strong> & <strong className="text-white">Vinicius Jr</strong> star jerseys. Grab one with zero lines!
                  </p>
                </div>

              </div>
            )}

            {/* 🟡 VENDOR VIEW */}
            {activeTab === "vendor" && (
              <div id="vendor_view_deck" className="px-4 py-2 animate-fadeIn space-y-4">
                
                {/* Vendor catalog select */}
                <div className="p-3 bg-zinc-900/80 border border-zinc-850 rounded-2xl">
                  <label className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">Select Kiosk Terminal</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full text-xs font-bold bg-zinc-950 border border-zinc-800 p-2 rounded text-zinc-300 outline-none"
                  >
                    {dbState?.vendors.map((v) => (
                      <option key={v._id} value={v._id}>{v.name} (Section {v.section})</option>
                    ))}
                  </select>
                </div>

                {/* PULSING ACTIVE EMBEDDED ATLAS WARNING STATE */}
                {currentVendor?.alert ? (
                  <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl animate-pulse space-y-1">
                    <div className="flex items-center gap-1 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Active Crowding Surge Warning!
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-snug">
                      "{currentVendor.alert}"
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>No active crowd warnings. Kiosk processing baseline regular ticket-holder volume.</span>
                  </div>
                )}

                {/* Kiosk Performance indicators */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">Max Capacity</p>
                    <p className="text-lg font-black text-white mt-1">{currentVendor?.capacity} pax</p>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900 font-mono uppercase mt-1 inline-block">High Outflow</span>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl text-center">
                    <p className="text-[9px] text-zinc-500 uppercase font-mono">Kiosk Section</p>
                    <p className="text-lg font-black text-amber-400 mt-1">{currentVendor?.section}</p>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase mt-1 inline-block">Maracanã Ring</span>
                  </div>
                </div>

                {/* Inventory Metrics */}
                <div className="bg-zinc-900/70 border border-zinc-850 p-3 rounded-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-850 mb-2">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Stock Levels & Catalog Pricing</h5>
                    <span className="text-[10px] text-amber-500 font-mono font-bold">Live Inventory</span>
                  </div>

                  <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                    {currentVendor?.menu.map((item, index) => {
                      const getInitialStockForItem = (name: string) => {
                        if (name === "Classic Burger") return 50;
                        if (name === "Pepperoni Slice") return 120;
                        if (name === "Cheese Pizza (Whole)") return 150;
                        const seedV = seedVendors.find(v => v._id === currentVendor?._id);
                        const seedI = seedV?.menu.find(i => i.name === name);
                        return seedI ? seedI.stock : 100;
                      };
                      const initStock = getInitialStockForItem(item.name);
                      const isLowStock = item.stock <= initStock * 0.1;

                      return (
                        <div key={index} className={`flex justify-between items-center text-xs py-1.5 border-b border-zinc-900/40 last:border-b-0 ${isLowStock ? "bg-rose-950/20 p-1 rounded rounded-lg" : ""}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`h-1.5 w-1.5 rounded-full ${isLowStock ? "bg-rose-500 animate-ping" : item.stock > 50 ? "bg-emerald-400" : "bg-yellow-400"}`}></span>
                            <span className={`font-medium truncate ${isLowStock ? "text-rose-300" : "text-zinc-300"}`}>{item.name}</span>
                            {isLowStock && (
                              <span className="animate-pulse text-[8px] font-bold text-rose-400 px-1 py-[1px] bg-rose-950/60 border border-rose-900/50 rounded uppercase shrink-0 font-mono tracking-wider ml-1">
                                Low
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 font-mono">
                            <span className="text-zinc-500">${item.price.toFixed(2)}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isLowStock ? "bg-rose-950 text-rose-300 border border-rose-900/40" : item.stock > 50 ? "bg-emerald-950 text-emerald-300 border border-emerald-900/40" : "bg-amber-950 text-amber-300 border border-amber-900/40"}`}>
                              {item.stock} item{item.stock !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dispatch Dispatch dispatch link */}
                <a
                  href={`https://wa.me/${currentVendor?.whatsapp.replace(/\+/g, "").replace(/\s+/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/50 text-[#25D366] rounded-xl text-center items-center justify-center gap-2 text-xs font-bold transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Request Urgent Supply via WhatsApp Coordinator</span>
                </a>

              </div>
            )}

            {/* 🟣 FANTASY PLAYER COACH DECK */}
            {activeTab === "fantasy" && (
              <div id="fantasy_view_deck" className="px-4 py-2 animate-fadeIn space-y-4">
                
                <div className="p-3 bg-zinc-900/80 border border-zinc-850 rounded-2xl text-center space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-mono font-bold">🏆 2026 World Cup Fantasy Lineups</p>
                  <h4 className="text-xs text-zinc-300 leading-snug">
                    Crowd sentiment and beer sales as stadium excitement proxies!
                  </h4>
                </div>

                {/* Top Fantasy Players Star List */}
                <div className="space-y-3">
                  {currentMatch.fantasy_top_players.map((player) => {
                    // Procedurally map momentum scores representing state
                    const baseEnergy = getSectionStats(player.team === "France" ? "North" : "West").avgDensity;
                    const excitementProxy = player.odds > 3 ? 68 : Math.min(100, Math.round(baseEnergy + (3 * player.odds)));
                    
                    return (
                      <div key={player.name} className="p-3 bg-zinc-900/70 border border-zinc-850 rounded-xl relative overflow-hidden flex flex-col justify-between">
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 bg-purple-950 border border-purple-500/40 rounded-full flex items-center justify-center text-purple-300">
                              <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-xs font-bold text-white">{player.name}</h5>
                                <span className={`text-[8px] font-mono px-1 rounded font-bold uppercase ${player.team === "Brazil" ? "bg-amber-500 text-black" : "bg-blue-600 text-white"}`}>
                                  {player.team}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Scoring probability odds: {player.odds}x</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-zinc-400">Crowd Momentum</span>
                            <p className="text-sm font-black text-purple-400">{excitementProxy}/100</p>
                          </div>
                        </div>

                        {/* Crowd Momentum indicator bar */}
                        <div className="mt-3">
                          <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-300"
                              style={{ width: `${excitementProxy}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                          <span>🔥 Enthusiast volume: Active in sector</span>
                          <span className="text-purple-300 font-bold">
                            {excitementProxy > 80 ? "👑 HIGH CAPTAIN VALUE" : excitementProxy > 60 ? "⭐ REASONABLE ADVICE" : "⚠️ RISKY ROTATION"}
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Fact breakdown display box */}
                <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl text-xs space-y-1.5 text-zinc-400">
                  <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block">Momentum Scoring Criteria:</span>
                  <div className="flex justify-between">
                    <span>📢 Supporter Section Noise Level weight</span>
                    <strong className="text-purple-400">40%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🍺 Pub Area Drink sales volume velocity</span>
                    <strong className="text-indigo-400">30%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>☀️ High temperatures vs physical play factors</span>
                    <strong className="text-amber-400">20%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>📊 Base statistical bookmaker variables</span>
                    <strong className="text-emerald-400">10%</strong>
                  </div>
                </div>

              </div>
            )}

            {/* AI SYSTEM QUERY DECK (Real-time input chat window inside Device) */}
            <div 
              className="mt-4 px-4 border-t border-zinc-900/60 pt-4 cursor-pointer"
              onClick={() => inputRef.current?.focus()}
            >
              <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-zinc-500 mb-2.5 flex items-center justify-between">
                <span>🤖 Ask StadiumSurgeSync AI</span>
                <span className="text-[10px] text-emerald-400">Multi-Agent Sandbox Connection</span>
              </h4>

              {/* Chat Thread Container */}
              <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1 text-xs select-text">
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.sender === "user" ? "items-end" : "items-start"}`}>
                    <div className={`p-3 rounded-2xl max-w-[90%] font-sans whitespace-pre-wrap ${
                      chat.sender === "user"
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-850"
                    }`}>
                      {chat.text}

                      {/* Tool call reasoning visualizer nested in assistant message */}
                      {chat.details && chat.details.feedbackLoop && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 space-y-2">
                          <div className="p-2 bg-rose-950/20 text-rose-300 border border-rose-900/40 rounded mt-1.5 leading-snug">
                            <span className="font-bold text-rose-400 block pb-0.5">⚡ Multi-agent Loop Action Triggered:</span>
                            Density in section <strong className="text-white">{chat.details.feedbackLoop.section}</strong> is <strong className="text-white">{chat.details.feedbackLoop.density}%</strong>. Alert values set on nearest outlets! Added trigger event record to live_events collection.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {queryLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-2xl rounded-tl-none text-zinc-400 space-y-1 w-[80%]">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-purple-400 tracking-wider font-mono">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Analyzing Match Telemetry...
                      </div>
                      <p className="text-[10px] animate-pulse">Formulating MongoDB queries (Find & Aggregation on timeseries collections)...</p>
                    </div>
                  </div>
                )}
                
                <div id="chat-bottom-anchor"></div>
              </div>

              {/* Suggestions shortcuts - Quick query trigger pins */}
              <div className="mt-3.5 pt-3 border-t border-zinc-900/60">
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2">💡 Quick-Demo Queries ({activeTab.toUpperCase()} context)</p>
                <div className="flex flex-wrap gap-1.5">
                  {promptSuggestions[activeTab].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (queryLoading) return;
                        submitQuery(item.text);
                      }}
                      disabled={queryLoading}
                      className={`px-2 py-1 bg-zinc-900 text-[10px] text-left border rounded-lg transition font-medium ${
                        queryLoading
                          ? "opacity-40 cursor-not-allowed border-zinc-900 text-zinc-600"
                          : "hover:bg-zinc-850 hover:text-white border-zinc-850 hover:border-zinc-700 text-zinc-300 pointer-events-auto"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (queryLoading) return;
                  submitQuery(queryInput);
                }}
                className="mt-3 flex gap-1.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Ask a question as a ${activeTab}...`}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  disabled={queryLoading}
                  className="flex-1 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 placeholder-zinc-500 text-zinc-200 transition"
                />
                <button
                  type="submit"
                  disabled={queryLoading || !queryInput.trim()}
                  className={`px-3 py-2 rounded-xl font-bold transition flex items-center justify-center shrink-0 shadow-sm ${
                    queryLoading
                      ? "bg-purple-500 text-purple-100 border border-purple-400/50 animate-pulse cursor-wait"
                      : "bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-45 disabled:cursor-not-allowed"
                  }`}
                >
                  {queryLoading ? (
                    <RefreshCw className="h-4.5 w-4.5 text-white animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5 text-white" />
                  )}
                </button>
              </form>

            </div>

          </div>

          {/* Bottom Device Tab navigation bar mockup */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-black border-t border-zinc-900 z-30 flex items-center justify-around px-2 pb-2">
            
            <button
              onClick={() => {
                setActiveTab("fan");
                setUserSection("East");
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded transition text-center ${
                activeTab === "fan" ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              <Compass className="h-5 w-5" />
              <span className="text-[8px] font-bold font-mono uppercase tracking-wider mt-1">Fan deck</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("vendor");
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded transition text-center ${
                activeTab === "vendor" ? "text-amber-400" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              <Utensils className="h-5 w-5" />
              <span className="text-[8px] font-bold font-mono uppercase tracking-wider mt-1">Vendors</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("fantasy");
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded transition text-center ${
                activeTab === "fantasy" ? "text-purple-400" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              <Crown className="h-5 w-5" />
              <span className="text-[8px] font-bold font-mono uppercase tracking-wider mt-1">Fantasy</span>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
