const db = require('./db');
const rows = [
  ['Rahul Sharma', '+919876543210', 'rahul@example.com'],
  ['Priya Shah',   '+919876543211', 'priya@example.com'],
  ['Amit Kumar',   '+919876540000', 'amit@example.com'],   // invalid recipient
  ['Neha Patel',   '+919876547777', 'neha@example.com'],   // delivery fails
  ['Rohan Mehta',  '+919876548888', 'rohan@example.com'],  // rate limited
  ['Sana Iyer',    '+919876549999', 'sana@example.com'],   // provider 503
  ['Vikram Rao',   '+919876546666', 'vikram@example.com'], // delivered, never read
];
const ins = db.prepare('INSERT OR IGNORE INTO candidates (name, phone, email) VALUES (?, ?, ?)');
rows.forEach((r) => ins.run(...r));
console.log('Seeded demo candidates');
