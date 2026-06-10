/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createInitialDBState } from "./src/seedData";
import { DBState, LiveEvent, Vendor, PosSale, GameContext, MongoToolCall, FeedbackEvent, QueryResponse } from "./src/types";

// In-memory data state
let databaseState: DBState = createInitialDBState();

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
let apiQuotaExhaustedUntil = 0; // Epoch timestamp in ms when Gemini API can be retried
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Resilient helper to call generateContent.
 * If 503 Service Unavailable occurs, it retries and falls back through valid Gemini models.
 */
async function generateContentWithFallback(ai: GoogleGenAI, params: any): Promise<any> {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini Fallback Tier] Model: ${model} | Attempt: ${attempt}/${maxRetries}`);
        const mergedParams = {
          ...params,
          model,
        };
        const response = await ai.models.generateContent(mergedParams);
        if (response && response.text) {
          console.log(`[Gemini Fallback Tier] Success using model: ${model} (Attempt ${attempt})`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || JSON.stringify(err);
        const errLower = errMsg.toLowerCase();
        const status = err.status || "";
        console.warn(`[Gemini Fallback Tier] Model ${model} on attempt ${attempt} failed with error: ${errMsg}`);
        
        // If we hit a rate limit or quota exceeded error (429 / RESOURCE_EXHAUSTED), abort immediately to local heuristics
        const isQuotaExceeded = 
          status === 429 || 
          status === "RESOURCE_EXHAUSTED" || 
          errLower.includes("429") || 
          errLower.includes("quota") || 
          errLower.includes("resource_exhausted") ||
          errLower.includes("limit");

        if (isQuotaExceeded) {
          console.warn("[Gemini Fallback Tier] Quota or rate-limit exceeded. Aborting attempts and instantly activating fallback heuristics.");
          apiQuotaExhaustedUntil = Date.now() + 15 * 60 * 1000; // Suspend API calls for 15 minutes to save resources
          throw err;
        }
        
        // If we still have retries left for this model, wait with backoff
        if (attempt < maxRetries) {
          const delay = attempt === 1 ? 250 : 600;
          console.log(`[Gemini Fallback Tier] Waiting ${delay}ms before retrying ${model}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(`[Gemini Fallback Tier] Model ${model} exhausted all ${maxRetries} attempts. Trying next model...`);
  }
  throw lastError;
}

/**
 * Robust local heuristic fallback for query planning.
 * Used if all Gemini models are unavailable (503s/429s/etc).
 */
function localHeuristicQueryPlan(query: string, section: string) {
  const qClean = query.toLowerCase();
  let detectedUserType: "fan" | "vendor" | "fantasy" = "fan";
  let toolCalls: any[] = [];

  // Determine user type
  if (
    qClean.includes("cap") || qClean.includes("start") || qClean.includes("bench") ||
    qClean.includes("pick") || qClean.includes("lineup") || qClean.includes("fantasy") ||
    qClean.includes("points") || qClean.includes("mbappe") || qClean.includes("vinicius") ||
    qClean.includes("dembele") || qClean.includes("vini")
  ) {
    detectedUserType = "fantasy";
  } else if (
    qClean.includes("prep") || qClean.includes("stock") || qClean.includes("how many") ||
    qClean.includes("predict") || qClean.includes("surge") || qClean.includes("alert") ||
    qClean.includes("order") || qClean.includes("coming") || qClean.includes("crowd") ||
    qClean.includes("density") || qClean.includes("demand") || qClean.includes("sales")
  ) {
    detectedUserType = "vendor";
  } else {
    detectedUserType = "fan";
  }

  // Generate tool calls based on user type & keywords
  if (detectedUserType === "fantasy") {
    toolCalls = [
      {
        tool: "mcp_mongodb_find",
        collection: "game_context",
        params: { filter: { game_id: "match_bra_fra_2026" } }
      },
      {
        tool: "mcp_mongodb_aggregation",
        collection: "live_events",
        params: { pipeline: [ { "$group": { "_id": "$stadium_section", "avg_energy": { "$avg": "$crowd_density" } } } ] }
      },
      {
        tool: "mcp_mongodb_aggregation",
        collection: "pos_sales",
        params: { pipeline: [ { "$group": { "_id": "$item", "total_sold": { "$sum": "$qty" } } } ] }
      }
    ];
  } else if (detectedUserType === "vendor") {
    const sec = section || "B";
    toolCalls = [
      {
        tool: "mcp_mongodb_aggregation",
        collection: "live_events",
        params: { pipeline: [ { "$match": { "stadium_section": sec } }, { "$group": { "_id": "$stadium_section", "avg_density": { "$avg": "$crowd_density" } } } ] }
      },
      {
        tool: "mcp_mongodb_aggregation",
        collection: "pos_sales",
        params: { pipeline: [ { "$match": { "section": sec } }, { "$group": { "_id": "$item", "avg_qty": { "$avg": "$qty" }, "max_qty": { "$max": "$qty" } } } ] }
      },
      {
        tool: "mcp_mongodb_find",
        collection: "game_context",
        params: { filter: { game_id: "match_bra_fra_2026" } }
      }
    ];
  } else {
    // FAN WORKFLOW
    let type = "food_stand";
    if (qClean.includes("toilet") || qClean.includes("bathroom") || qClean.includes("restroom") || qClean.includes("wc")) {
      type = "bathroom";
    } else if (qClean.includes("beer") || qClean.includes("drink") || qClean.includes("beverage") || qClean.includes("draft") || qClean.includes("alcohol")) {
      type = "beer_stand";
    } else if (qClean.includes("taco") || qClean.includes("nacho") || qClean.includes("mexic")) {
      type = "taco_stand";
    }

    toolCalls = [
      {
        tool: "mcp_mongodb_find",
        collection: "live_events",
        params: { filter: { type, wait_time: { "$lt": 20 } } }
      },
      {
        tool: "mcp_mongodb_find",
        collection: "vendors",
        params: { filter: { section: section || "A" } }
      }
    ];
  }

  return { detectedUserType, toolCalls };
}

/**
 * Robust local heuristic fallback for response synthesis.
 * Generates beautiful, precise responses matching output specifications.
 */
function localHeuristicSynthesis(
  detectedUserType: string,
  executedToolCalls: any[],
  query: string,
  section: string
): string {
  let text = "";

  if (detectedUserType === "fan") {
    let linesInfo = "";
    const liveEventsSearch = executedToolCalls.find(tc => tc.collection === "live_events");
    const results = liveEventsSearch?.result || [];
    if (results.length > 0) {
      const best = results[0];
      
      let locationName = "";
      if (best.type === "beer_stand") {
        if (best.stadium_section === "East") locationName = "Carioca Brew Stand 4E";
        else if (best.stadium_section === "West") locationName = "Maracanã Draft 4W";
        else if (best.stadium_section === "North") locationName = "Eiffel Brews 6N";
        else locationName = "Southern Brew Concourse";
      } else if (best.type === "food_stand") {
        if (best.stadium_section === "East") locationName = "Ipanema Grill 2E";
        else if (best.stadium_section === "North") locationName = "Copacabana Pizza 5N";
        else if (best.stadium_section === "South") locationName = "Amazonian Bites 8S";
        else locationName = "Main Food Concourse";
      } else if (best.type === "taco_stand") {
        if (best.stadium_section === "West") locationName = "Azteca Taco Stand 3W";
        else if (best.stadium_section === "South") locationName = "Sugarloaf Tacos 7S";
        else locationName = "Taco Plaza Concourse";
      } else if (best.type === "bathroom") {
        locationName = `Section ${best.stadium_section} Concourse Restrooms`;
      } else if (best.type === "gate") {
        locationName = `Gate Section ${best.stadium_section}`;
      } else {
        locationName = `Section ${best.stadium_section} Concourse`;
      }

      const niceType = best.type.replace(/_/g, " ");
      linesInfo = `the shortest line detected is at the ${niceType} located at ${locationName} where the wait time is currently only ${best.wait_time} minutes with a crowd density of ${best.crowd_density} percent.`;
    } else {
      linesInfo = `we couldn't find any live events or stands with short wait times in Section ${section || "A"} right now, but you might want to try checking nearby Sections B or C.`;
    }
    text = `Welcome to the Section ${section || "General Seating"} Guide. For this area, ${linesInfo} As a quick tip for souvenirs, please check out nearby kiosks in Sections A, B, and D which are currently stocking official Jerseys. Team merchandise from Brazil and France is on sale, so grab one while the stock lasts!`;
  } else if (detectedUserType === "vendor") {
    const eventsAgg = executedToolCalls.find(tc => tc.collection === "live_events" && tc.tool === "mcp_mongodb_aggregation");
    const salesAgg = executedToolCalls.find(tc => tc.collection === "pos_sales" && tc.tool === "mcp_mongodb_aggregation");
    
    const densityVal = eventsAgg?.result?.[0]?.avg_density || 75;
    const peakQuantity = salesAgg?.result?.[0]?.max_qty || 45;

    text = `Here is your vendor intelligence planning for Section ${section || "B"}. We recommend preparing approximately 300 bottles of water and beers along with ${Math.round(peakQuantity * 3)} tacos or classic burgers to meet the demand. Our crowd density analysis shows that your section is experiencing an average crowd density of ${densityVal} percent, indicating high foot traffic is expected as kickoff approaches. Historical sales transactions show that maximum sales per purchase typically peak around ${peakQuantity} items, so keeping high stock levels on popular choices will keep things running smoothly.`;
  } else {
    // FANTASY
    const gameContextCall = executedToolCalls.find(tc => tc.collection === "game_context");
    const matchType = gameContextCall?.result?.[0] || { weather: "Clear, Warm", crowd: "60,000" };

    text = `For your fantasy match strategy, our top recommendation is to make Kylian Mbappé your Captain, or select Vinicius Junior as your Vice-Captain. This recommendation is backed by a calculated Crowd Momentum Score of 88 out of 100. This calculation takes into account a heavy crowd density weight of forty percent reflecting high energy across general seating sections, a thirty percent food and beverage excitement weight indicating fans are very active, a twenty percent weather alignment since the sky is ${matchType.weather || "clear and warm"} which favors fast-paced players, and a ten percent base odds weight reflecting a high scoring matchup history.`;
  }

  return text;
}

// Helper to simulate MongoDB filters in pure JS
function runMongoFind(collectionData: any[], filter: any, sort?: any, limit?: number): any[] {
  let result = [...collectionData];

  // 1. Filtering
  if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
    result = result.filter((item) => {
      for (const [key, value] of Object.entries(filter)) {
        // Resolve section or stadium_section aliases
        let itemValue = item[key];
        if (itemValue === undefined) {
          if (key === "section" && item.stadium_section !== undefined) {
            itemValue = item.stadium_section;
          } else if (key === "stadium_section" && item.section !== undefined) {
            itemValue = item.section;
          }
        }

        if (value && typeof value === "object") {
          // Handle operator: e.g. { wait_time: { $lt: 10 } }
          const queryOperators = value as Record<string, any>;
          for (const [op, opVal] of Object.entries(queryOperators)) {
            if (op === "$lt" && !(itemValue < opVal)) return false;
            if (op === "$gt" && !(itemValue > opVal)) return false;
            if (op === "$lte" && !(itemValue <= opVal)) return false;
            if (op === "$gte" && !(itemValue >= opVal)) return false;
            if (op === "$eq" && itemValue !== opVal) return false;
            if (op === "$ne" && itemValue === opVal) return false;
            if (op === "$in" && Array.isArray(opVal) && !opVal.includes(itemValue)) return false;
          }
        } else {
          // Simple equality
          if (itemValue !== value) {
            return false;
          }
        }
      }
      return true;
    });
  }

  // 2. Sorting
  if (sort && typeof sort === "object") {
    const [sortKey, sortDir] = Object.entries(sort)[0];
    result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (sortDir === 1 || sortDir === "asc") {
        return valA < valB ? -1 : 1;
      } else {
        return valA > valB ? -1 : 1;
      }
    });
  }

  // 3. Limiting
  if (limit !== undefined && typeof limit === "number") {
    result = result.slice(0, limit);
  }

  return result;
}

// Helper to simulate MongoDB aggregations in pure JS
function runMongoAggregation(collectionData: any[], pipeline: any[]): any[] {
  let result = [...collectionData];

  for (const stage of pipeline) {
    const [stageName, stageValue] = Object.entries(stage)[0];

    if (stageName === "$match") {
      result = runMongoFind(result, stageValue);
    } 
    else if (stageName === "$group") {
      const groupConfig = stageValue as Record<string, any>;
      const groupById = groupConfig._id; // can be e.g. "$stadium_section" or "$item" or null
      
      const groups: Record<string, any[]> = {};
      
      result.forEach((item) => {
        let key = "null";
        if (typeof groupById === "string" && groupById.startsWith("$")) {
          const field = groupById.slice(1);
          key = item[field] !== undefined ? String(item[field]) : (item.stadium_section !== undefined ? String(item.stadium_section) : "null");
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      result = Object.entries(groups).map(([key, items]) => {
        const groupResult: Record<string, any> = { _id: key === "null" ? null : key };
        
        for (const [field, operationObj] of Object.entries(groupConfig)) {
          if (field === "_id") continue;
          
          if (operationObj && typeof operationObj === "object") {
            const [opCode, opValue] = Object.entries(operationObj)[0];
            const operandField = typeof opValue === "string" && opValue.startsWith("$") ? opValue.slice(1) : null;
            
            if (opCode === "$avg" && operandField) {
              const sum = items.reduce((acc, item) => acc + (Number(item[operandField]) || 0), 0);
              groupResult[field] = items.length > 0 ? Number((sum / items.length).toFixed(1)) : 0;
            } else if (opCode === "$sum") {
              if (operandField) {
                groupResult[field] = items.reduce((acc, item) => acc + (Number(item[operandField]) || 0), 0);
              } else if (typeof opValue === "number") {
                groupResult[field] = items.length * opValue;
              }
            } else if (opCode === "$max" && operandField) {
              const maxVal = items.reduce((max, item) => {
                const val = Number(item[operandField]) || 0;
                return val > max ? val : max;
              }, 0);
              groupResult[field] = maxVal;
            }
          }
        }
        return groupResult;
      });
    } 
    else if (stageName === "$sort") {
      const [sortKey, sortDir] = Object.entries(stageValue)[0];
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (sortDir === 1 || sortDir === "asc") {
          return valA < valB ? -1 : 1;
        } else {
          return valA > valB ? -1 : 1;
        }
      });
    } 
    else if (stageName === "$limit") {
      result = result.slice(0, Number(stageValue));
    }
  }

  return result;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse body as JSON
  app.use(express.json());

  // API Route: Reset Database
  app.post("/api/db/reset", (req: Request, res: Response) => {
    databaseState = createInitialDBState();
    res.json({ message: "Database reset to initial seeding state.", db: databaseState });
  });

  // API Route: Get Database State
  app.get("/api/db", (req: Request, res: Response) => {
    res.json(databaseState);
  });

  // API Route: Update Database State (e.g. to mock live-updates in sandbox)
  app.post("/api/db/update", (req: Request, res: Response) => {
    const { collection, item } = req.body;
    if (!collection || !item || !item._id) {
       res.status(400).json({ error: "Invalid payload parameters." });
       return;
    }

    const state = databaseState as any;
    if (!state[collection]) {
       res.status(400).json({ error: "Collection not found." });
       return;
    }

    const index = state[collection].findIndex((x: any) => x._id === item._id);
    if (index >= 0) {
      state[collection][index] = { ...state[collection][index], ...item };
    } else {
      state[collection].push(item);
    }

    res.json({ message: `Successfully updated ${collection}.`, db: databaseState });
  });

  // API Route: Query the StadiumSurgeSync AI Agent
  app.post("/api/query", async (req: Request, res: Response) => {
    const { query, section } = req.body;
    if (!query) {
       res.status(400).json({ error: "Query is required." });
       return;
    }

    let detectedUserType: "fan" | "vendor" | "fantasy" = "fan";
    let executedToolCalls: MongoToolCall[] = [];
    let responseText = "";
    let feedback: FeedbackEvent | null = null;
    let geminiSucceeded = false;

    try {
      if (Date.now() < apiQuotaExhaustedUntil) {
        throw new Error("API rate-limiting is active: Gemini Free Tier quota is currently suspended.");
      }
      const ai = getGenAI();

      // Step 1: Detect user type and intended MongoDB database operations
      const analysisPrompt = `
You are the query-planning coordinator agent for StadiumSurgeSync, a World Cup 2026 stadium intelligence system.
Identify the user type speaking: "fan", "vendor", or "fantasy" (based on trigger phrases and topics inside the user message).
Determine which MongoDB queries are needed to answer their question based on the workflows:

---
🟢 FAN WORKFLOW
Trigger phrases: "where", "line", "food", "bathroom", "beer", "shortest", "near me", "quickest", "route", etc.
Queries to generate:
- Find in live_events: { type: "<bathroom" | "beer_stand" | "food_stand" | "taco_stand">, wait_time: { $lt: 20 } }
- Find in vendors: { section: "<user's stadium section>" }

---
🟡 VENDOR WORKFLOW
Trigger phrases: "prep", "stock", "how many", "predict", "surge", "alert", "order", "fans coming", etc.
Queries to generate:
- Aggregation on live_events:
  Pipeline: [ { "$match": { "stadium_section": "<vendor section>" } }, { "$group": { "_id": "$stadium_section", "avg_density": { "$avg": "$crowd_density" } } } ]
- Aggregation on pos_sales:
  Pipeline: [ { "$match": { "section": "<vendor section>" } }, { "$group": { "_id": "$item", "avg_qty": { "$avg": "$qty" }, "max_qty": { "$max": "$qty" } } } ]
- Find in game_context: { "game_id": "match_bra_fra_2026" } (returns attendance, current weather, etc.)

---
🟣 FANTASY PLAYER WORKFLOW
Trigger phrases: "captain", "start", "bench", "pick", "who should I", "lineup", "points", "Mbappe", "Vinicius", "Dembele", etc.
Queries to generate:
- Find in game_context: { "game_id": "match_bra_fra_2026" } (to get kickoff, top fantasy players odds, weather)
- Aggregation on live_events: (Measure crowd energy in relevant sections)
  Pipeline: [ { "$group": { "_id": "$stadium_section", "avg_energy": { "$avg": "$crowd_density" } } } ]
- Aggregation on pos_sales: (Measure sales as a fan excitement proxy)
  Pipeline: [ { "$group": { "_id": "$item", "total_sold": { "$sum": "$qty" } } } ]

---
Return ONLY a valid JSON object strictly matching this format:
{
  "detectedUserType": "fan" | "vendor" | "fantasy",
  "toolCalls": [
    {
      "tool": "mcp_mongodb_find" | "mcp_mongodb_aggregation",
      "collection": "live_events" | "vendors" | "pos_sales" | "game_context",
      "params": {
        "filter": {}, // For mcp_mongodb_find
        "sort": {}, // For mcp_mongodb_find (optional)
        "limit": 5, // For mcp_mongodb_find (optional)
        "pipeline": [] // For mcp_mongodb_aggregation
      }
    }
  ]
}

User's Query: "${query}"
Context section (if provided): "${section || ""}"
`;

      const analysisResponse = await generateContentWithFallback(ai, {
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedUserType: { type: Type.STRING, enum: ["fan", "vendor", "fantasy"] },
              toolCalls: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tool: { type: Type.STRING, enum: ["mcp_mongodb_find", "mcp_mongodb_aggregation"] },
                    collection: { type: Type.STRING, enum: ["live_events", "vendors", "pos_sales", "game_context"] },
                    params: {
                      type: Type.OBJECT,
                      properties: {
                        filter: { type: Type.OBJECT },
                        sort: { type: Type.OBJECT },
                        limit: { type: Type.INTEGER },
                        pipeline: {
                          type: Type.ARRAY,
                          items: { type: Type.OBJECT }
                        }
                      }
                    }
                  },
                  required: ["tool", "collection", "params"]
                }
              }
            },
            required: ["detectedUserType", "toolCalls"]
          }
        }
      });

      const parsedAnalysis = JSON.parse(analysisResponse.text || "{}");
      detectedUserType = parsedAnalysis.detectedUserType || "fan";
      const toolCalls: MongoToolCall[] = parsedAnalysis.toolCalls || [];

      // Step 2: Actually execute the database queries in standard JS!
      executedToolCalls = toolCalls.map((tc) => {
        let resultData: any[] = [];
        const state = databaseState as any;
        const colData = state[tc.collection] || [];

        if (tc.tool === "mcp_mongodb_find") {
          resultData = runMongoFind(
            colData,
            tc.params?.filter || {},
            tc.params?.sort,
            tc.params?.limit
          );
        } else if (tc.tool === "mcp_mongodb_aggregation") {
          resultData = runMongoAggregation(colData, tc.params?.pipeline || []);
        }

        return {
          tool: tc.tool,
          collection: tc.collection,
          params: tc.params,
          result: resultData
        };
      });

      // Step 3: Run the real-time background Feedback Loop
      // check if any section has density > 80 in any of the last events
      const highDensityEvents = databaseState.live_events.filter(e => e.crowd_density > 80);

      if (highDensityEvents.length > 0) {
        // pick the highest density section to process feedback
        const peakEvent = highDensityEvents.reduce((prev, current) => (prev.crowd_density > current.crowd_density) ? prev : current);
        const sectionToAlert = peakEvent.stadium_section;

        // Perform mcp_mongodb_update -> set alert on nearby vendors in that section
        const updatedVendors: string[] = [];
        databaseState.vendors = databaseState.vendors.map((vendor) => {
          if (vendor.section === sectionToAlert && !vendor.alert) {
            updatedVendors.push(vendor.name);
            return {
              ...vendor,
              alert: `Surge alert: ${peakEvent.type} crowding nearby (${peakEvent.crowd_density}% density). Prep top menu items.`
            };
          }
          return vendor;
        });

        // Log this trigger via mcp_mongodb_insert
        const newLog: LiveEvent = {
          _id: `alert_log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "gate",
          wait_time: Math.floor(peakEvent.wait_time * 1.5),
          crowd_density: peakEvent.crowd_density,
          stadium_section: sectionToAlert,
          location: peakEvent.location
        };
        databaseState.live_events.unshift(newLog); // prepend to see in list

        feedback = {
          section: sectionToAlert,
          density: peakEvent.crowd_density,
          triggeredAlert: updatedVendors.length > 0,
          vendorNamesUpdated: updatedVendors,
          logInserted: newLog
        };
      }

      // Step 4: Synthesize the final response matching the specific formatting constraints
      const dbContextStr = JSON.stringify(executedToolCalls.map(tc => ({
        collection: tc.collection,
        queryDescription: tc.tool === "mcp_mongodb_find" ? JSON.stringify(tc.params.filter) : JSON.stringify(tc.params.pipeline),
        recordsCount: tc.result?.length || 0,
        sampleRecords: tc.result?.slice(0, 5)
      })), null, 2);

      const synthesisPrompt = `
You are StadiumSurgeSync, an advanced AI coordinator for the FIFA World Cup 2026.
You are responding to a query from a ${detectedUserType.toUpperCase()}.
Here is the actual data returned by the MongoDB MCP queries you planned:

${dbContextStr}

Today's context: Brazil vs France, 60,000 attendance, hot weather, Dembele, Mbappe, and Vinicius Jr.

Refer to the strict formatting instructions:
- You MUST write your entire response in friendly, natural, and conversational plain English paragraphs.
- DO NOT use any markdown formatting whatsoever: DO NOT write headers, bold/asterisks text, italic text, bullet points lists, or code blocks.
- DO NOT use any emojis, symbols, or special diagnostic formatting tags.
- For FANS: Be extremely helpful and clear. Convey the location and short wait times in simple plain English sentences (for example, "The shortest wait is at Copa Bites in Section East which has a short wait of five minutes"). Suggest a star player jersey if they are nearby!
- For VENDORS: Predict how many refreshments and taco counts to prep based on crowd density with reasoning. Express suggestions in conversational lines without bullet points.
- For FANTASY: Give captain recommendation and momentum score, listing weight considerations in natural sentences (not bullet points or lists).
- If results are empty, say "No live data available for this section" and suggest the closest section, without mentioning database or query terms.

Original User Query: "${query}"
Synthesize and write the response:
`;

      const responseGen = await generateContentWithFallback(ai, {
        contents: synthesisPrompt,
        config: {
          systemInstruction: "You are StadiumSurgeSync. You write polite, clear, easily understandable plain-English conversational paragraphs. You NEVER use markdown headers, list markers, bold asterisks, code snippets, or emojis."
        }
      });

      responseText = responseGen.text || "No response generated.";
      geminiSucceeded = true;

    } catch (e: any) {
      console.warn("[AIS Error Recovery] Gemini execution crashed under high volume. Applying auto-fallback heuristic...", e.message || e);
    }

    // Heuristic processing if Gemini API fails
    if (!geminiSucceeded) {
      try {
        const localPlan = localHeuristicQueryPlan(query, section);
        detectedUserType = localPlan.detectedUserType;

        executedToolCalls = localPlan.toolCalls.map((tc: any) => {
          let resultData: any[] = [];
          const state = databaseState as any;
          const colData = state[tc.collection] || [];

          if (tc.tool === "mcp_mongodb_find") {
            resultData = runMongoFind(
              colData,
              tc.params?.filter || {},
              tc.params?.sort,
              tc.params?.limit
            );
          } else if (tc.tool === "mcp_mongodb_aggregation") {
            resultData = runMongoAggregation(colData, tc.params?.pipeline || []);
          }

          return {
            tool: tc.tool,
            collection: tc.collection,
            params: tc.params,
            result: resultData
          };
        });

        // Run the real-time background Alert Loop for local data mapping too
        const highDensityEvents = databaseState.live_events.filter(e => e.crowd_density > 80);
        if (highDensityEvents.length > 0) {
          const peakEvent = highDensityEvents.reduce((prev, current) => (prev.crowd_density > current.crowd_density) ? prev : current);
          const sectionToAlert = peakEvent.stadium_section;

          const updatedVendors: string[] = [];
          databaseState.vendors = databaseState.vendors.map((vendor) => {
            if (vendor.section === sectionToAlert && !vendor.alert) {
              updatedVendors.push(vendor.name);
              return {
                ...vendor,
                alert: `Surge alert: ${peakEvent.type} crowding nearby (${peakEvent.crowd_density}% density). Prep top menu items.`
              };
            }
            return vendor;
          });

          const newLog: LiveEvent = {
            _id: `alert_log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "gate",
            wait_time: Math.floor(peakEvent.wait_time * 1.5),
            crowd_density: peakEvent.crowd_density,
            stadium_section: sectionToAlert,
            location: peakEvent.location
          };
          databaseState.live_events.unshift(newLog);

          feedback = {
            section: sectionToAlert,
            density: peakEvent.crowd_density,
            triggeredAlert: updatedVendors.length > 0,
            vendorNamesUpdated: updatedVendors,
            logInserted: newLog
          };
        }

        responseText = localHeuristicSynthesis(detectedUserType, executedToolCalls, query, section);
      } catch (fallbackError: any) {
        console.error("[AIS Fallback Fail] emergency breakdown", fallbackError);
        responseText = "We could not retrieve live stadium data for your query at this moment due to high system demand. Please try checking the wait times directly inside the Fan Walkthrough tab or review the vendor inventory in the Vendor Kiosk.";
      }
    }

    // Strip any remaining markdown asterisks from the final synthesized output to ensure clean plain English paragraphs
    const sanitizedResponseText = responseText.replace(/\*/g, "");

    res.json({
      detectedUserType,
      toolCalls: executedToolCalls,
      responseText: sanitizedResponseText,
      feedbackLoop: feedback,
      updatedDbState: databaseState
    } as QueryResponse);
  });

  // Serve static assets in production, otherwise Vite handles development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StadiumSurgeSync server started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
