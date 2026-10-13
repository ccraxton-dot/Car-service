// "Essentials only" mode: what actually needs doing, what you can do yourself,
// and what is usually fine to wait on until you see warning signs.
//
// tier:
//   'essential' — skipping risks expensive damage or safety. Tracked in both modes.
//   'diy'       — worth doing, but you don't need a shop for it. Tracked in both modes.
//   'wait'      — in Essentials mode, not scheduled. Do it when the warning signs show up.
// miles / months — interval used in Essentials mode (falls back to the normal schedule).
// wait          — when it's OK to wait, and the signs that it can't wait any longer.

// How hard each job is to do yourself, and what it costs. Rough 2026 US prices.
export const DIY = {
  cabin_filter: {
    level: 'easy', time: '5 min', part: '$12–20 online', shop: '$60–90',
    how: 'Behind the glove box. Empty it, unhook the damper arm, squeeze the sides so it drops down, then slide the old filter out. Put the new one in with the airflow arrow pointing the same way. Search YouTube for your year and model plus "cabin filter".',
  },
  air_filter: {
    level: 'easy', time: '5 min', part: '$15–25', shop: '$50–80',
    how: 'Open the hood, undo the clips (or a few screws) on the black airbox lid, and swap the filter. Hold the old filter up to a light. If light barely gets through, it\'s time. If it\'s just a little gray, put it back.',
  },
  wipers: {
    level: 'easy', time: '5 min', part: '$20–40 a pair', shop: '$50–70',
    how: 'Most auto parts stores will look up the size and put them on for free.',
  },
  battery_12v: {
    level: 'easy', time: 'free test · 20 min to replace', part: '$150–250', shop: '$250–400',
    how: 'AutoZone, Advance and O\'Reilly test batteries for free in the parking lot. Many of them install the new battery for free and take the old one back.',
  },
  tire_rotation: {
    level: 'moderate', time: '30–45 min with a jack and stands', part: '$0', shop: '$25–50, or free',
    how: 'The cheapest way is to get it free. Tire stores such as Discount Tire, Costco and Les Schwab rotate tires for free for life if you bought the tires there. Many shops also throw it in with an oil change if you ask.',
  },
  oil: {
    level: 'moderate', time: '30–45 min', part: '$35–55 (synthetic oil + filter)', shop: '$80–130',
    how: 'You can DIY it with ramps or jack stands, but you have to dispose of the old oil. The cheaper non-DIY options are Costco or Walmart Auto Centers, or an independent shop with a coupon. Bring your own oil if the shop allows it. Skip the dealer unless it\'s free.',
  },
  brakes: {
    level: 'easy', time: '2 min to check', part: '—', shop: 'pads: $150–300 per axle at an independent shop',
    how: 'Look through the wheel spokes at the brake pad pressed against the rotor. Thicker than about 3 mm (⅛″) is fine. Chain shops do free brake checks, but they often push extra work. Get a second quote for anything over $300.',
  },
  brake_fluid: {
    level: 'easy', time: '1 min to test', part: '$10–15 test strips or pen', shop: '$90–150 to replace',
    how: 'Dip a brake-fluid test strip in the reservoir under the hood, or use a pen-style tester. Replace the fluid only when it fails the test. An independent shop charges half what the dealer does.',
  },
  coolant: {
    level: 'shop', time: '—', part: '—', shop: '$120–200 at an independent shop',
    how: 'You can DIY it, but it\'s messy and the system has to be bled of air. An independent shop is the best value. Make sure they use the manufacturer-type coolant.',
  },
  transmission_fluid: {
    level: 'shop', time: '—', part: '—', shop: '$150–300',
    how: 'Use an independent transmission or general repair shop with the correct fluid. Ask for a "drain and fill", not a "flush".',
  },
  spark_plugs: {
    level: 'shop', time: '—', part: '—', shop: '$200–500',
    how: 'Get quotes from independent shops. Dealers often charge twice as much.',
  },
  drive_belt: {
    level: 'easy', time: '1 min to look', part: '$25–50', shop: '$100–200',
    how: 'With the hood open, look at the ribbed belt on the front of the engine. Cracks across the ribs, fraying, glazing, or a squeal on cold starts mean it needs replacing.',
  },
  hv_battery: {
    level: 'easy', time: '2 min', part: '$20–30 Bluetooth OBD-II dongle + the LeafSpy app', shop: '$0–100 at the dealer',
    how: 'Plug the dongle into the port under the dash and open LeafSpy. It shows battery health (SOH), Hx and capacity anytime, so you don\'t need a dealer visit. Screenshot it once a year for your records.',
  },
  reduction_gear: {
    level: 'shop', time: '—', part: '—', shop: '$80–150',
    how: 'Any independent shop can drain and refill it.',
  },
};

export const ESSENTIALS = {
  carnival: {
    oil: { tier: 'essential', wait: 'Don\'t stretch this one. Direct-injection engines are hard on oil, and Kia can deny a 10-year/100,000-mile powertrain warranty claim without oil-change receipts. If you only go to the shop for one thing, make it this.' },
    tire_rotation: { tier: 'wait', wait: 'Don\'t make a separate trip. Ask for it free with an oil change, or get it free where you buy tires. Check tread with a penny every few months. If one edge or one tire is wearing faster, get them rotated then.' },
    cabin_filter: { tier: 'diy', months: 24, miles: 30000, wait: 'It only affects air quality in the cabin. Fine to go 2 years unless the A/C smells musty or the airflow drops.' },
    air_filter: { tier: 'diy', wait: 'Check it yourself. A slightly dirty filter is fine.' },
    brakes: { tier: 'wait', wait: 'Pads have a built-in squealer. Get them done when you hear a high-pitched squeal while driving. Go right away if you hear grinding, the pedal feels soft or sinks, or the car pulls to one side.' },
    brake_fluid: { tier: 'essential', miles: null, months: 48, wait: 'Test it at home once a year and replace it when it fails, or at about 4 years. Don\'t skip it entirely: old fluid corrodes the ABS unit, which costs $1,000+.' },
    transmission_fluid: { tier: 'wait', wait: 'Kia says no change is needed under normal use. Skip it unless you tow, or the shifts become harsh, slipping or delayed.' },
    spark_plugs: { tier: 'essential', wait: 'Worn plugs cause misfires, and misfires can ruin the catalytic converter ($1,500+). On the V6, the rear plugs need the intake removed, so get independent-shop quotes. Signs: rough idle, hesitation, or a flashing check-engine light.' },
    coolant: { tier: 'essential', wait: 'Not due until 10 years / 120,000 mi. Just glance at the overflow tank level now and then.' },
    drive_belt: { tier: 'wait', wait: 'Look at it when the hood is open. Replace it when it\'s cracked, frayed or squealing.' },
    battery_12v: { tier: 'wait', wait: 'Wait for the signs: slow cranking, dim lights at start-up, or the battery is 5+ years old. Then get a free test at a parts store.' },
    wipers: { tier: 'wait', wait: 'Replace when they streak or skip.' },
  },
  kicks: {
    oil: { tier: 'essential', miles: 7500, months: 12, wait: 'Your 2020 Kicks is past its 5-year/60,000-mile powertrain warranty, so full-synthetic 0W-20 every 7,500 mi or 12 months is a reasonable stretch from Nissan\'s 5,000. Check the dipstick monthly, because small engines can burn a little oil.' },
    transmission_fluid: { tier: 'essential', wait: 'This is the one "optional" item NOT to skip. Replacing a CVT costs $3,500–5,000, and a $150–250 fluid change at 60,000 mi is the best money you\'ll spend on this car. Use genuine Nissan NS-3 fluid only.' },
    brake_fluid: { tier: 'essential', miles: null, months: 48, wait: 'Test it at home yearly and replace it when it fails, or at about 4 years.' },
    coolant: { tier: 'essential', wait: 'First change at 7 years (2027) or 105,000 mi. Glance at the overflow tank level now and then.' },
    spark_plugs: { tier: 'essential', wait: 'Due at 105,000 mi. On the Kicks it\'s an easy job: 4 plugs on top of the engine, about $40 in parts if you DIY.' },
    cabin_filter: { tier: 'diy', months: 24, miles: 30000, wait: 'Fine to go 2 years unless the A/C smells or the airflow drops.' },
    air_filter: { tier: 'diy', wait: 'Check it yourself. A slightly dirty filter is fine.' },
    tire_rotation: { tier: 'wait', wait: 'Ask for it free with an oil change, or get it free where you bought the tires. Check tread with a penny.' },
    brakes: { tier: 'wait', wait: 'Front pads squeal when worn. The rear brakes are drums. If the parking brake lever pulls up much higher than it used to, they need adjusting. Go right away if you hear grinding or the pedal feels soft.' },
    drive_belt: { tier: 'wait', wait: 'Replace when it\'s cracked or squealing.' },
    battery_12v: { tier: 'wait', wait: 'Wait for slow cranking, then get a free test. At 6 years old, expect to replace it soon, so don\'t be surprised.' },
    wipers: { tier: 'wait', wait: 'Replace when they streak.' },
  },
  leaf: {
    coolant: { tier: 'essential', wait: 'The 2015 is past the 7-year first change. If it has never been done, do it once at an independent shop. It protects the inverter and charger, which are expensive parts.' },
    brake_fluid: { tier: 'essential', miles: null, months: 48, wait: 'Test it at home yearly and replace it when it fails, or at about 4 years.' },
    battery_12v: { tier: 'diy', months: 12, wait: 'This is the #1 cause of a Leaf that won\'t turn on. Get a free test each fall, and replace it every 3–5 years.' },
    hv_battery: { tier: 'diy', months: 12, wait: 'Check it yourself with LeafSpy instead of going to the dealer. Nothing can be "serviced" on the pack anyway. The check only tracks its health.' },
    cabin_filter: { tier: 'diy', months: 24, miles: 30000, wait: 'Fine to go 2 years unless the A/C smells.' },
    tire_rotation: { tier: 'wait', wait: 'EVs do wear tires faster. Get rotations free where you buy tires, and check tread with a penny.' },
    brakes: { tier: 'wait', wait: 'The pads barely wear, but calipers can stick from lack of use. Go if you hear grinding, smell burning after a drive, one wheel is much hotter or dirtier than the others, or the car pulls. To help prevent sticking, brake firmly now and then.' },
    reduction_gear: { tier: 'wait', wait: 'Nissan lists it as inspect-only. Skip it unless it gets noisy (whine or clunk).' },
    wipers: { tier: 'wait', wait: 'Replace when they streak.' },
  },
};

export const SAVE_MONEY_TIPS = [
  'Bundle your visits. When you have to go in (usually for an oil change), have them do everything else that\'s due in the next few months at the same time. The Schedule tab groups these for you.',
  'Use an independent shop instead of the dealer. You get the same work for 30–50% less, and it doesn\'t affect your warranty as long as you keep the receipts.',
  'Do the 5-minute jobs yourself: cabin filter, engine air filter, and wipers. That saves about $100–150 every year or two.',
  'Get the free stuff: battery tests at parts stores, tire rotations for life where you buy tires, and free brake checks (just say no to the upsells).',
  'Common upsells you can usually decline: fuel-injector or throttle-body cleaning, engine flushes, power-steering flushes, nitrogen in tires, and a "dirty" cabin filter at $80.',
  'Ask "What happens if I wait?" If the answer isn\'t about safety or damage, it can usually wait until your next visit.',
];
