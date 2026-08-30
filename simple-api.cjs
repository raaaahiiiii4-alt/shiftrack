const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('.'));

const MONGODB_URI = 'mongodb+srv://Ftop:dIpqQbX7lXt4i3iu@shifttrack-cluster.9hrq4xi.mongodb.net/shifttrack?retryWrites=true&w=majority';
const client = new MongoClient(MONGODB_URI);

let tokensCollection;

async function connect() {
  await client.connect();
  const db = client.db('shifttrack');
  tokensCollection = db.collection('tokens');
  await tokensCollection.createIndex({ date: 1 });
  await tokensCollection.createIndex({ tokenNo: 1 });
  await tokensCollection.createIndex({ mine: 1 });
  console.log('MongoDB Connected');
}

function formatToken(doc) {
  return { id: doc._id.toString(), tokenNo: doc.tokenNo, date: doc.date, shift: doc.shift, markedAt: doc.markedAt, selected: false, mine: doc.mine || 'Balaria' };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/tokens', async (req, res) => {
  const { date, mine, filter, search } = req.query;
  const query = {};
  if (date) query.date = date;
  if (mine) query.mine = mine;
  if (filter && filter !== 'ALL') query.shift = filter;
  if (search) query.tokenNo = { $regex: search, $options: 'i' };
  const tokens = await tokensCollection.find(query).sort({ _id: -1 }).toArray();
  res.json(tokens.map(formatToken));
});

app.post('/api/tokens', async (req, res) => {
  const { tokenNo, date, shift, mine = 'Balaria' } = req.body;
  const normalizedTokenNo = tokenNo.trim().toUpperCase();
  const existing = await tokensCollection.findOne({ tokenNo: normalizedTokenNo, date });
  if (existing) return res.status(409).json({ error: 'Token already exists for this date' });
  const newToken = { tokenNo: normalizedTokenNo, date, shift, mine, markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), createdAt: new Date() };
  const result = await tokensCollection.insertOne(newToken);
  res.status(201).json(formatToken({ ...newToken, _id: result.insertedId }));
});

app.post('/api/tokens/bulk', async (req, res) => {
  const { tokens: tokenList, shift, mine = 'Balaria', date } = req.body;
  const normalizedTokens = tokenList.map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
  const existingTokens = await tokensCollection.find({ tokenNo: { $in: normalizedTokens }, date }).toArray();
  const existingSet = new Set(existingTokens.map(t => t.tokenNo));
  const newTokens = normalizedTokens.filter(t => !existingSet.has(t)).map(tokenNo => ({ tokenNo, date, shift, mine, markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), createdAt: new Date() }));
  let insertedCount = 0;
  if (newTokens.length > 0) { const result = await tokensCollection.insertMany(newTokens); insertedCount = result.insertedCount; }
  res.json({ added: insertedCount, skipped: normalizedTokens.length - newTokens.length, tokens: newTokens.map(formatToken) });
});

app.patch('/api/tokens/:id', async (req, res) => {
  const { id } = req.params;
  const { shift } = req.body;
  const result = await tokensCollection.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { shift, markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } }, { returnDocument: 'after' });
  if (!result) return res.status(404).json({ error: 'Token not found' });
  res.json(formatToken(result));
});

app.delete('/api/tokens/:id', async (req, res) => {
  const { id } = req.params;
  await tokensCollection.deleteOne({ _id: new ObjectId(id) });
  res.json({ success: true });
});

app.delete('/api/tokens', async (req, res) => {
  const { ids } = req.body;
  const objectIds = ids.filter(ObjectId.isValid).map(id => new ObjectId(id));
  await tokensCollection.deleteMany({ _id: { $in: objectIds } });
  res.json({ deleted: objectIds.length });
});

app.get('/api/export/monthly', async (req, res) => {
  const { date, mine = 'Balaria', format = 'json' } = req.query;
  const [yearStr, monthStr] = date.split('-');
  const year = parseInt(yearStr); const month = parseInt(monthStr);
  const monthPrefix = `${yearStr}-${monthStr}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = monthNames[month - 1];
  const tokens = await tokensCollection.find({ date: { $regex: `^${monthPrefix}` }, mine }).toArray();
  const tokenMap = new Map(); tokens.forEach(t => tokenMap.set(`${t.tokenNo}|${t.date}`, t.shift));
  const uniqueTokens = Array.from(new Set(tokens.map(t => t.tokenNo))).sort();
  const matrixRows = uniqueTokens.map((tokenNo, index) => {
    const row = { 'Sl No': index + 1, 'Token Number': tokenNo };
    let countA=0,countB=0,countC=0,countOff=0,totalWorked=0;
    for (let d=1; d<=daysInMonth; d++) {
      const dayString = String(d).padStart(2,'0'); const dateKey = `${monthPrefix}-${dayString}`; const colHeader = `${dayString}-${monthLabel}`;
      const shift = tokenMap.get(`${tokenNo}|${dateKey}`);
      if (shift) { row[colHeader] = shift; if(shift==='A')countA++; else if(shift==='B')countB++; else if(shift==='C')countC++; else if(shift==='OFF')countOff++; if(shift!=='OFF')totalWorked++; } else row[colHeader] = '-';
    }
    row['Total Shift A']=countA; row['Total Shift B']=countB; row['Total Shift C']=countC; row['Total Off']=countOff; row['Total Worked Days']=totalWorked;
    return row;
  });
  res.json({ mine, month: monthLabel, year, data: matrixRows });
});

connect().then(() => {
  app.listen(3005, '127.0.0.1', () => console.log('API running on http://127.0.0.1:3005'));
}).catch(console.error);