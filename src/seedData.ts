/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DBState, Vendor, LiveEvent, PosSale, GameContext, StadiumSection } from "./types";

// Base coordinates for sections of the stadium (centered around stadium center)
const lngBase = -43.2302;
const latBase = -22.9121;

export const seedVendors: Vendor[] = [
  {
    _id: "vendor_1e_beer",
    name: "Carioca Brew Stand 4E",
    section: "East",
    type: "beer_stand",
    location: { type: "Point", coordinates: [lngBase + 0.002, latBase] },
    menu: [
      { name: "Cold Heineken", price: 8.50, stock: 150 },
      { name: "Local Lager", price: 6.00, stock: 240 },
      { name: "Vinicius Jr Jersey", price: 90.00, stock: 25 },
      { name: "Pretzels", price: 4.50, stock: 80 }
    ],
    alert: null,
    capacity: 200,
    whatsapp: "+55 21 99823-4121"
  },
  {
    _id: "vendor_2e_food",
    name: "Ipanema Grill 2E",
    section: "East",
    type: "food_stand",
    location: { type: "Point", coordinates: [lngBase + 0.0025, latBase + 0.0005] },
    menu: [
      { name: "Classic Burger", price: 11.00, stock: 5 }, // low stock
      { name: "Churrasco Skewers", price: 14.50, stock: 45 },
      { name: "Soda Cane", price: 3.50, stock: 110 }
    ],
    alert: "Slowing down. Experiencing high queue times.",
    capacity: 350,
    whatsapp: "+55 21 99120-0082"
  },
  {
    _id: "vendor_3w_taco",
    name: "Azteca Taco Stand 3W",
    section: "West",
    type: "taco_stand",
    location: { type: "Point", coordinates: [lngBase - 0.002, latBase] },
    menu: [
      { name: "Spicy Beef Taco Trio", price: 12.00, stock: 180 },
      { name: "Guacamole & Chips", price: 6.50, stock: 120 },
      { name: "Ochoa Jersey (Mexico Spec Edition)", price: 95.00, stock: 18 },
      { name: "Aqua Fresca", price: 4.00, stock: 200 }
    ],
    alert: null,
    capacity: 150,
    whatsapp: "+55 21 99451-3329"
  },
  {
    _id: "vendor_4w_beer",
    name: "Maracanã Draft 4W",
    section: "West",
    type: "beer_stand",
    location: { type: "Point", coordinates: [lngBase - 0.0022, latBase - 0.0004] },
    menu: [
      { name: "Samba Draft", price: 7.00, stock: 200 },
      { name: "Gluten-Free Beer", price: 8.00, stock: 50 },
      { name: "French Fries", price: 5.00, stock: 130 }
    ],
    alert: null,
    capacity: 250,
    whatsapp: "+55 21 99763-9911"
  },
  {
    _id: "vendor_5n_food",
    name: "Copacabana Pizza 5N",
    section: "North",
    type: "food_stand",
    location: { type: "Point", coordinates: [lngBase, latBase + 0.002] },
    menu: [
      { name: "Pepperoni Slice", price: 5.50, stock: 12 },
      { name: "Cheese Pizza (Whole)", price: 28.00, stock: 15 },
      { name: "Dembele Jersey", price: 90.00, stock: 40 },
      { name: "French Cider", price: 9.00, stock: 75 }
    ],
    alert: null,
    capacity: 180,
    whatsapp: "+55 21 99513-4321"
  },
  {
    _id: "vendor_6n_beer",
    name: "Eiffel Brews 6N",
    section: "North",
    type: "beer_stand",
    location: { type: "Point", coordinates: [lngBase - 0.0005, latBase + 0.0025] },
    menu: [
      { name: "Bordeaux Lager", price: 8.50, stock: 140 },
      { name: "Mbappe Jersey", price: 95.00, stock: 32 },
      { name: "Hot Hot Cocoa", price: 4.50, stock: 100 }
    ],
    alert: null,
    capacity: 300,
    whatsapp: "+55 21 99331-5445"
  },
  {
    _id: "vendor_7s_taco",
    name: "Sugarloaf Tacos 7S",
    section: "South",
    type: "taco_stand",
    location: { type: "Point", coordinates: [lngBase, latBase - 0.002] },
    menu: [
      { name: "Carnitas Taco", price: 4.00, stock: 220 },
      { name: "Chipotle Chicken Taco", price: 4.00, stock: 190 },
      { name: "Pico de Gallo Bowl", price: 5.00, stock: 95 }
    ],
    alert: null,
    capacity: 200,
    whatsapp: "+55 21 99222-8787"
  },
  {
    _id: "vendor_8s_food",
    name: "Amazonian Bites 8S",
    section: "South",
    type: "food_stand",
    location: { type: "Point", coordinates: [lngBase + 0.0005, latBase - 0.0025] },
    menu: [
      { name: "Açai Energy Bowl", price: 7.50, stock: 150 },
      { name: "Coxinha (Chicken Croquettes)", price: 5.00, stock: 210 },
      { name: "Guaraná Soda", price: 3.50, stock: 300 }
    ],
    alert: null,
    capacity: 220,
    whatsapp: "+55 21 99611-0022"
  }
];

export const seedGameContext: GameContext[] = [
  {
    _id: "game_bra_fra_2026",
    game_id: "match_64",
    teams: ["Brazil", "France"],
    kickoff: "2026-06-10T15:00:00Z",
    attendance: 60000,
    weather: "hot",
    city: "Rio de Janeiro",
    fantasy_top_players: [
      { name: "Mbappe", team: "France", odds: 2.1 },
      { name: "Vinicius Jr", team: "Brazil", odds: 2.3 },
      { name: "Dembele", team: "France", odds: 4.5 }
    ]
  }
];

// Generates 50 live events timestamped around the current match
export const generateLiveEvents = (): LiveEvent[] => {
  const types: Array<LiveEvent["type"]> = ["gate", "bathroom", "beer_stand", "food_stand", "taco_stand"];
  const sections: Array<LiveEvent["stadium_section"]> = ["East", "West", "North", "South"];
  const list: LiveEvent[] = [];
  
  // Set some predefined landmarks to make them realistic
  // Ensure we have some short wait times and some high wait times
  const landmarks = [
    { section: "East" as const, type: "beer_stand" as const, wait_time: 3, crowd_density: 45 }, // Carioca Brew
    { section: "East" as const, type: "food_stand" as const, wait_time: 18, crowd_density: 88 }, // Ipanema Grill
    { section: "West" as const, type: "taco_stand" as const, wait_time: 2, crowd_density: 35 }, // Azteca Taco
    { section: "West" as const, type: "beer_stand" as const, wait_time: 12, crowd_density: 78 }, // Maracanã Draft
    { section: "North" as const, type: "food_stand" as const, wait_time: 4, crowd_density: 50 }, // Copacabana Pizza
    { section: "North" as const, type: "beer_stand" as const, wait_time: 15, crowd_density: 82 }, // Eiffel Brews
    { section: "South" as const, type: "taco_stand" as const, wait_time: 6, crowd_density: 55 }, // Sugarloaf Tacos
    { section: "South" as const, type: "food_stand" as const, wait_time: 5, crowd_density: 40 } // Amazonian Bites
  ];

  const now = new Date("2026-06-10T14:44:44Z").getTime();

  // Pre-seed the landmark events
  landmarks.forEach((landmark, i) => {
    let offsetLng = 0;
    let offsetLat = 0;
    if (landmark.section === "East") offsetLng = 0.002;
    if (landmark.section === "West") offsetLng = -0.002;
    if (landmark.section === "North") offsetLat = 0.002;
    if (landmark.section === "South") offsetLat = -0.002;

    list.push({
      _id: `live_event_landmark_${i}`,
      timestamp: new Date(now - i * 60000).toISOString(),
      type: landmark.type,
      wait_time: landmark.wait_time,
      crowd_density: landmark.crowd_density,
      stadium_section: landmark.section,
      location: {
        type: "Point",
        coordinates: [lngBase + offsetLng, latBase + offsetLat]
      }
    });
  });

  // Put a highly dense crowd log in North and West section for testing trigger surges
  list.push({
    _id: "live_event_hotspot_n",
    timestamp: new Date(now - 1 * 60000).toISOString(),
    type: "food_stand",
    wait_time: 19,
    crowd_density: 87,
    stadium_section: "North",
    location: { type: "Point", coordinates: [lngBase, latBase + 0.0018] }
  });

  list.push({
    _id: "live_event_hotspot_w",
    timestamp: new Date(now - 2 * 60000).toISOString(),
    type: "taco_stand",
    wait_time: 14,
    crowd_density: 81,
    stadium_section: "West",
    location: { type: "Point", coordinates: [lngBase - 0.0019, latBase] }
  });

  // Populate remaining to reach 50 events using procedurally structured randomized values
  for (let i = list.length; i < 50; i++) {
    const section = sections[i % sections.length];
    const type = types[i % types.length];
    
    // Proximity coordinates
    let offsetLng = (Math.random() - 0.5) * 0.005;
    let offsetLat = (Math.random() - 0.5) * 0.005;
    if (section === "East") offsetLng = Math.abs(offsetLng) + 0.001;
    if (section === "West") offsetLng = -Math.abs(offsetLng) - 0.001;
    if (section === "North") offsetLat = Math.abs(offsetLat) + 0.001;
    if (section === "South") offsetLat = -Math.abs(offsetLat) - 0.001;

    // Wait time matches crowd density reasonably
    const density = Math.floor(Math.random() * 80) + 10; // 10-90
    const wait = Math.floor((density / 100) * 16) + Math.floor(Math.random() * 4); // 1-20

    list.push({
      _id: `live_event_gen_${i}`,
      timestamp: new Date(now - i * 180000).toISOString(), // spaced out
      type: type,
      wait_time: wait,
      crowd_density: density,
      stadium_section: section,
      location: {
        type: "Point",
        coordinates: [lngBase + offsetLng, latBase + offsetLat]
      }
    });
  }

  return list;
};

// Generates historical POS sales for 3 previous games (hot, cold, and rainy weather)
export const generatePosSales = (): PosSale[] => {
  const sales: PosSale[] = [];
  const items = [
    { item: "Cold Heineken", qtyRange: [40, 90], weatherEffects: { hot: 1.5, cold: 0.5, rainy: 0.7 } },
    { item: "Samba Draft", qtyRange: [50, 110], weatherEffects: { hot: 1.6, cold: 0.6, rainy: 0.7 } },
    { item: "Spicy Beef Taco Trio", qtyRange: [25, 60], weatherEffects: { hot: 0.9, cold: 1.2, rainy: 1.1 } },
    { item: "Churrasco Skewers", qtyRange: [30, 75], weatherEffects: { hot: 1.0, cold: 1.3, rainy: 1.1 } },
    { item: "Pepperoni Slice", qtyRange: [20, 50], weatherEffects: { hot: 0.8, cold: 1.4, rainy: 1.3 } },
    { item: "Hot Hot Cocoa", qtyRange: [5, 15], weatherEffects: { hot: 0.1, cold: 3.5, rainy: 2.8 } },
    { item: "Acai Energy Bowl", qtyRange: [15, 45], weatherEffects: { hot: 2.2, cold: 0.3, rainy: 0.5 } },
    { item: "Cocinha", qtyRange: [30, 80], weatherEffects: { hot: 0.9, cold: 1.2, rainy: 1.1 } }
  ];

  const sections: StadiumSection[] = ["East", "West", "North", "South"];
  const games = [
    { game_id: "match_prev_1", attendance: 55000, weather: "hot" as const, dateStr: "2026-06-05T18:00:00Z" },
    { game_id: "match_prev_2", attendance: 58000, weather: "cold" as const, dateStr: "2026-06-07T14:30:00Z" },
    { game_id: "match_prev_3", attendance: 52000, weather: "rainy" as const, dateStr: "2026-06-08T20:00:00Z" }
  ];

  let recordId = 0;

  games.forEach((game) => {
    sections.forEach((section) => {
      items.forEach((itemObj) => {
        // Pre-seeded POS logs: compute procedural quantity incorporating weather multipliers
        const baseQty = Math.floor(Math.random() * (itemObj.qtyRange[1] - itemObj.qtyRange[0])) + itemObj.qtyRange[0];
        const multiplier = itemObj.weatherEffects[game.weather];
        const qty = Math.ceil(baseQty * multiplier);

        // Standard pre-seeded records
        sales.push({
          _id: `pos_sale_${recordId++}`,
          timestamp: game.dateStr,
          vendor_id: `vendor_mock_${section.toLowerCase()}_${itemObj.item.replace(/\s+/g, "_")}`,
          game_id: game.game_id,
          item: itemObj.item,
          qty: qty,
          weather: game.weather,
          section: section,
          attendance: game.attendance
        });
      });
    });
  });

  return sales;
};

// Create the complete Initial Seeding DB State
export const createInitialDBState = (): DBState => {
  return {
    live_events: generateLiveEvents(),
    vendors: seedVendors,
    pos_sales: generatePosSales(),
    game_context: seedGameContext
  };
};
