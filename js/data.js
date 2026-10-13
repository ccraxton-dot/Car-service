// Vehicle definitions, service catalog, and maintenance schedules.
//
// Intervals are typical "normal driving" figures pulled from owner's manuals,
// dealer schedules and common shop practice. They are a starting point —
// every interval can be edited in the app (tap the item on a vehicle's
// Schedule tab) to match your owner's manual or your driving conditions.

export const VEHICLES = [
  {
    id: 'carnival',
    year: 2023,
    make: 'Kia',
    model: 'Carnival',
    plate: 'XCC 8121',
    powertrain: '3.5L V6 GDI · 8-speed automatic · FWD',
    color: '#0b6e4f',
  },
  {
    id: 'kicks',
    year: 2020,
    make: 'Nissan',
    model: 'Kicks',
    plate: 'WVK 3388',
    powertrain: '1.6L 4-cyl · CVT (Xtronic) · FWD',
    color: '#c2410c',
  },
  {
    id: 'leaf',
    year: 2015,
    make: 'Nissan',
    model: 'Leaf',
    plate: 'KST 9957',
    powertrain: 'Electric · 24 kWh Li-ion · single-speed reduction gear',
    color: '#1d4ed8',
  },
];

// Every service type the app knows about. `keywords` are matched
// (case-insensitively) against OCR text from a receipt to pre-check services.
// `exclude` words on the same line cancel a match (e.g. "cabin air filter"
// should not count as the engine air filter).
export const SERVICES = {
  oil: {
    name: 'Engine oil & filter',
    exclude: ['oil changers', 'oilchangers'],
    keywords: ['oil change', 'oil & filter', 'oil and filter', 'oil/filter', 'oil filter', 'lube oil', 'lof', 'synthetic', 'full syn', 'syn blend', '0w-20', '0w20', '5w-20', '5w20', '5w-30', '5w30', '0w-16', '0w-30'],
  },
  tire_rotation: {
    name: 'Tire rotation',
    keywords: ['rotate', 'rotation', 'rotat'],
  },
  tire_replace: {
    name: 'Tires replaced',
    keywords: ['new tire', 'mount and balance', 'mount & balance', 'mount/balance', 'tire install', 'tire disposal'],
  },
  alignment: {
    name: 'Wheel alignment',
    keywords: ['alignment', 'align '],
  },
  cabin_filter: {
    name: 'Cabin air filter',
    keywords: ['cabin', 'pollen', 'microfilter', 'a/c filter', 'ac filter'],
  },
  air_filter: {
    name: 'Engine air filter',
    keywords: ['engine air filter', 'air filter', 'air cleaner', 'engine filter'],
    exclude: ['cabin', 'pollen', 'micro'],
  },
  brake_fluid: {
    name: 'Brake fluid replacement',
    keywords: ['brake fluid', 'brake flush', 'brake system flush', 'brake bleed'],
  },
  brakes: {
    name: 'Brake inspection / pads / rotors',
    keywords: ['brake pad', 'brake inspect', 'rotor', 'brake shoe', 'brake service', 'caliper', 'brake lube', 'pads'],
    exclude: ['fluid', 'flush'],
  },
  coolant: {
    name: 'Coolant replacement',
    keywords: ['coolant', 'antifreeze', 'anti-freeze', 'radiator flush', 'cooling system'],
  },
  spark_plugs: {
    name: 'Spark plugs',
    keywords: ['spark plug', 'plugs'],
  },
  transmission_fluid: {
    name: 'Transmission fluid',
    keywords: ['transmission fluid', 'trans fluid', 'trans service', 'transmission service', 'cvt', 'atf', 'transmission flush'],
  },
  drive_belt: {
    name: 'Drive belt',
    keywords: ['drive belt', 'serpentine', 'accessory belt'],
  },
  reduction_gear: {
    name: 'Reduction gear oil',
    keywords: ['reduction gear', 'gear oil', 'gearbox oil'],
  },
  hv_battery: {
    name: 'Li-ion battery check / report',
    keywords: ['li-ion', 'lithium', 'battery report', 'battery health', 'ev battery', 'hv battery', 'battery capacity', 'traction battery'],
  },
  battery_12v: {
    name: '12V battery test / replace',
    keywords: ['12v', '12 v', 'battery test', 'battery replace', 'new battery', 'batt test'],
  },
  wipers: {
    name: 'Wiper blades',
    keywords: ['wiper', 'blade'],
  },
  ac_service: {
    name: 'A/C service',
    keywords: ['refrigerant', 'a/c recharge', 'ac recharge', 'a/c service', 'freon', 'r-1234yf', 'r1234yf'],
  },
  inspection: {
    name: 'Multi-point inspection',
    keywords: ['multi-point', 'multipoint', 'multi point', 'vehicle health report'],
  },
  state_inspection: {
    name: 'State inspection (emissions)',
    keywords: ['vehicle inspection report', 'state inspection', 'emissions test', 'safety inspection', 'emissions only', 'emissions (i/m)', 'inspection decal'],
  },
  fuel_system: {
    name: 'Fuel system cleaning',
    keywords: ['fuel system', 'fuel induction', 'injector clean', 'throttle body', 'intake clean'],
  },
  other: {
    name: 'Other / repair',
    keywords: [],
  },
};

// Schedules per vehicle.
//   miles / months      — repeat interval (either may be null)
//   firstMiles / firstMonths — optional different interval for the first service
//   action               — 'replace' or 'inspect'
//   note                 — shown under the item
export const SCHEDULES = {
  carnival: [
    { service: 'oil', miles: 8000, months: 12, action: 'replace',
      note: 'Kia normal schedule with an oil meeting API SP / ILSAC GF-6 (0W-20 or 5W-20). Use 4,000 mi / 6 mo for severe use: lots of short trips, towing, extreme heat or cold, dusty roads, or heavy stop-and-go.' },
    { service: 'tire_rotation', miles: 7500, months: 6, action: 'replace',
      note: 'Rotating with every oil change is easiest to remember. Check pressures monthly (door-jamb placard, not the tire sidewall).' },
    { service: 'cabin_filter', miles: 15000, months: 12, action: 'replace',
      note: 'Replace sooner in heavy pollen, wildfire smoke, or dusty areas.' },
    { service: 'air_filter', miles: 30000, months: 36, action: 'replace',
      note: 'Inspect at 15,000 mi. Replace more often on dusty or gravel roads.' },
    { service: 'brakes', miles: 15000, months: 12, action: 'inspect',
      note: 'Inspect pads, rotors, lines and the parking brake.' },
    { service: 'brake_fluid', miles: null, months: 36, action: 'replace',
      note: 'Kia lists brake fluid as an inspect item. Brake fluid absorbs moisture, so most shops recommend replacing it every 2–3 years.' },
    { service: 'transmission_fluid', miles: 60000, months: null, action: 'replace',
      note: 'Kia lists the 8-speed ATF as "no service required" under normal use and calls for changes in severe use. A drain-and-fill around 60,000 mi is a common precaution for a minivan that carries family or cargo.' },
    { service: 'spark_plugs', miles: 100000, months: null, action: 'replace',
      note: 'Iridium plugs.' },
    { service: 'coolant', miles: 30000, months: 24, firstMiles: 120000, firstMonths: 120, action: 'replace',
      note: 'Kia long-life coolant: first change at 120,000 mi or 10 years, then every 30,000 mi or 2 years. Never top up with tap or hard water.' },
    { service: 'drive_belt', miles: 15000, months: 12, firstMiles: 60000, firstMonths: 72, action: 'inspect',
      note: 'First inspection at 60,000 mi or 6 years, then at every 15,000 mi.' },
    { service: 'battery_12v', miles: null, months: 12, action: 'inspect',
      note: 'Have it load-tested every year once it is 3+ years old.' },
    { service: 'wipers', miles: null, months: 12, action: 'replace',
      note: 'Replace when they streak or chatter, usually about once a year.' },
    { service: 'state_inspection', miles: null, months: 12, action: 'inspect',
      note: 'Travis County (Austin) requires a yearly emissions test to renew registration. Get it within 90 days before your registration expires, then renew online.' },
  ],
  kicks: [
    { service: 'oil', miles: 5000, months: 6, action: 'replace',
      note: 'Nissan schedule with 0W-20 (about 4.3 qt with filter). Replace at 3,750 mi / 3 mo under severe use.' },
    { service: 'tire_rotation', miles: 5000, months: 6, action: 'replace',
      note: 'Do it with every oil change.' },
    { service: 'cabin_filter', miles: 15000, months: 12, action: 'replace',
      note: 'Nissan in-cabin microfilter.' },
    { service: 'air_filter', miles: 30000, months: 36, action: 'replace',
      note: 'Every 15,000 mi on dusty roads.' },
    { service: 'brakes', miles: 15000, months: 12, action: 'inspect',
      note: 'Front discs and rear drums. Have the rear drum shoes checked and adjusted too.' },
    { service: 'brake_fluid', miles: 20000, months: 24, action: 'replace',
      note: 'DOT 3. Nissan dealer schedules list replacement at 20,000 mi / 24 months.' },
    { service: 'transmission_fluid', miles: 60000, months: null, action: 'replace',
      note: 'Nissan CVT Fluid NS-3 only. Nissan lists it as an inspect item, but a change around 60,000 mi (30,000 under severe use) is the most important thing you can do for CVT life.' },
    { service: 'spark_plugs', miles: 105000, months: null, action: 'replace',
      note: 'Iridium plugs.' },
    { service: 'coolant', miles: 75000, months: 60, firstMiles: 105000, firstMonths: 84, action: 'replace',
      note: 'Nissan Long Life coolant (blue): first change at 105,000 mi or 7 years, then every 75,000 mi or 5 years. Your Kicks reaches 7 years in 2027.' },
    { service: 'drive_belt', miles: 15000, months: 12, firstMiles: 60000, firstMonths: 72, action: 'inspect',
      note: 'Check for cracks and glazing.' },
    { service: 'battery_12v', miles: null, months: 12, action: 'inspect',
      note: 'Load-test it every year from year 3 on. Original batteries often fail around years 4–6.' },
    { service: 'wipers', miles: null, months: 12, action: 'replace',
      note: 'Replace when they streak.' },
    { service: 'state_inspection', miles: null, months: 12, action: 'inspect',
      note: 'Travis County (Austin) requires a yearly emissions test to renew registration. Get it within 90 days before your registration expires, then renew online.' },
  ],
  leaf: [
    { service: 'hv_battery', miles: null, months: 12, action: 'inspect',
      note: 'Nissan recommends an annual Li-ion battery check. Ask for the printed battery report, which documents capacity bars and state of health.' },
    { service: 'tire_rotation', miles: 7500, months: 6, action: 'replace',
      note: 'EVs are heavy and have instant torque, so they wear tires faster. Rotating regularly helps a lot.' },
    { service: 'cabin_filter', miles: 15000, months: 12, action: 'replace',
      note: 'The only "filter" an EV needs.' },
    { service: 'brakes', miles: 7500, months: 12, action: 'inspect',
      note: 'Regen braking means pads last a long time, but calipers and slide pins can corrode or seize from lack of use. Ask for the calipers to be cleaned and lubricated each year, especially if roads are salted where you live.' },
    { service: 'brake_fluid', miles: 30000, months: 24, action: 'replace',
      note: 'Every 2 years (1 year / 15,000 mi under severe use).' },
    { service: 'reduction_gear', miles: 30000, months: 24, action: 'inspect',
      note: 'Nissan lists this as an inspect item. A one-time change past 100,000 mi or 10 years is cheap peace of mind.' },
    { service: 'coolant', miles: 75000, months: 60, firstMiles: 105000, firstMonths: 84, action: 'replace',
      note: 'This coolant cools the inverter, motor and charger, not the battery (the 2015 battery is air-cooled). First change at 7 years / 105,000 mi, then every 5 years / 75,000 mi. A 2015 is past 7 years, so it is due if it has never been done.' },
    { service: 'battery_12v', miles: null, months: 12, action: 'inspect',
      note: 'On a Leaf, a weak 12V battery causes most "car won\'t start / warning lights" problems. Replace it every 3–5 years.' },
    { service: 'wipers', miles: null, months: 12, action: 'replace',
      note: 'Replace when they streak.' },
  ],
};

// Best practices / manufacturer tips shown on each vehicle's Tips tab.
export const TIPS = {
  carnival: [
    { title: 'Oil spec matters', body: 'The 3.5L GDI engine needs a full-synthetic 0W-20 or 5W-20 that meets API SP / ILSAC GF-6. If a shop uses a lower spec, Kia expects the severe schedule (4,000 mi / 6 mo). Keep receipts showing oil spec and mileage for warranty claims.' },
    { title: 'Keep every receipt (warranty)', body: 'Kia\'s 10-year/100,000-mile powertrain warranty (original owner) can require proof of maintenance. This app keeps the photo of each receipt for that reason. Export a backup now and then.' },
    { title: 'GDI carbon buildup', body: 'Direct-injection engines can build up carbon on the intake valves. Use Top Tier gasoline, take regular highway drives, and don\'t stretch oil changes.' },
    { title: 'Severe use is common', body: 'School runs, short trips, towing, and extreme heat all count as "severe". If that describes most of your driving, edit the oil interval to 4,000–5,000 mi on the Schedule tab.' },
    { title: 'Sliding doors & tailgate', body: 'Once or twice a year, clean the power sliding-door tracks and lubricate the rollers and hinges. Grit in the tracks is the top cause of door faults.' },
    { title: 'Recalls', body: 'Check nhtsa.gov/recalls with your VIN about twice a year. Kia dealers do recall work for free.' },
  ],
  kicks: [
    { title: 'Look after the CVT', body: 'The Xtronic CVT is the component to protect most. Use only Nissan NS-3 fluid, change it around 60,000 mi (sooner with hard use), avoid hard launches, and don\'t tow. If you notice whining, shuddering or slipping, get it checked right away.' },
    { title: '5,000-mile rhythm', body: 'Doing oil and filter plus tire rotation every 5,000 mi or 6 months covers most of the Kicks schedule. Add the cabin filter every third visit (15,000 mi).' },
    { title: 'Rear drum brakes', body: 'The Kicks has rear drums. They need occasional cleaning and adjustment. A weak parking brake or a low pedal usually means they need attention.' },
    { title: '12V battery', body: 'Small cars come with small batteries. Test it every year from year 3 on. Yours is a 2020, so it has reached the age when original batteries often fail.' },
    { title: 'Recalls', body: 'Check nhtsa.gov/recalls with your VIN about twice a year.' },
  ],
  leaf: [
    { title: 'Battery heat is the enemy', body: 'The 2015 Leaf\'s battery has no active cooling. Park in the shade or a garage in summer, avoid repeated DC fast charges on hot days, and let the pack cool before fast-charging again.' },
    { title: 'Charge for longevity', body: 'For daily use, charge to about 80% and avoid leaving the car at 100% or near 0% for long periods. Charge to 100% just before long trips. If you store the car, leave it at 40–60%.' },
    { title: 'Annual battery report', body: 'Get the Li-ion battery check every year and keep the printout. It documents capacity, which matters for resale value and any capacity-warranty claims. The free LeafSpy app with a cheap OBD-II dongle shows state of health anytime.' },
    { title: '12V battery = most "dead car" problems', body: 'Low 12V voltage causes random warning lights and a car that won\'t power on. The 12V only charges while the car is on or charging. Replace it every 3–5 years.' },
    { title: 'Exercise the brakes', body: 'Regen does most of the braking, so the friction brakes can rust and seize. Brake firmly now and then (safely) to clean the rotors, and have the calipers lubricated each year.' },
    { title: 'No state inspection needed', body: 'Electric cars are exempt from Texas emissions testing, and Texas ended safety inspections for passenger cars in 2025. Just renew the registration each year. It includes an extra yearly fee for EVs.' },
    { title: 'Tires & efficiency', body: 'Keep tires at the door-placard pressure. Under-inflation noticeably cuts range. When replacing tires, low-rolling-resistance tires keep range up.' },
  ],
};

export const GENERAL_TIPS = [
  'Keep every receipt. Proof of maintenance protects warranty claims and raises resale value.',
  'Check tire pressure monthly and before road trips. Use the door-jamb placard pressure, not the number on the tire sidewall.',
  'Check your VIN at nhtsa.gov/recalls about twice a year. Recall repairs are free.',
  '"Severe" driving (short trips, extreme temperatures, towing, dust, stop-and-go) is more common than most people think. If it fits, shorten the intervals.',
  'Dealer "recommended" add-ons (fuel injector flushes, engine flushes, nitrogen) are often not in the manufacturer schedule. Compare them with the owner\'s manual before paying.',
];
