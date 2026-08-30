import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Ftop:dIpqQbX7lXt4i3iu@shifttrack-cluster.9hrq4xi.mongodb.net/shifttrack?retryWrites=true&w=majority';
const DB_NAME = 'shifttrack';
const COLLECTION_NAME = 'tokens';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let db;
let tokensCollection;

async function connectToDatabase() {
    try {
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        await client.connect();
        db = client.db(DB_NAME);
        tokensCollection = db.collection(COLLECTION_NAME);
        
        await tokensCollection.createIndex({ date: 1 });
        await tokensCollection.createIndex({ tokenNo: 1 });
        await tokensCollection.createIndex({ mine: 1 });
        
        console.log('Connected to MongoDB Atlas');
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        return false;
    }
}

function validateTokenData(data) {
    const errors = [];
    if (!data.tokenNo || typeof data.tokenNo !== 'string' || data.tokenNo.trim().length === 0) {
        errors.push('Token number is required');
    }
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push('Valid date (YYYY-MM-DD) is required');
    }
    if (!data.shift || !['A', 'B', 'C', 'OFF'].includes(data.shift)) {
        errors.push('Valid shift (A, B, C, OFF) is required');
    }
    return errors;
}

function formatToken(doc) {
    return {
        id: doc._id.toString(),
        tokenNo: doc.tokenNo,
        date: doc.date,
        shift: doc.shift,
        markedAt: doc.markedAt,
        selected: false,
        mine: doc.mine || 'Balaria'
    };
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tokens', async (req, res) => {
    try {
        const { date, mine, filter, search } = req.query;
        const query = {};
        
        if (date) query.date = date;
        if (mine) query.mine = mine;
        if (filter && filter !== 'ALL') query.shift = filter;
        if (search) query.tokenNo = { $regex: search, $options: 'i' };
        
        const tokens = await tokensCollection.find(query).sort({ _id: -1 }).toArray();
        res.json(tokens.map(formatToken));
    } catch (error) {
        console.error('GET /api/tokens error:', error);
        res.status(500).json({ error: 'Failed to fetch tokens' });
    }
});

app.post('/api/tokens', async (req, res) => {
    try {
        const errors = validateTokenData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        const { tokenNo, date, shift, mine = 'Balaria' } = req.body;
        const normalizedTokenNo = tokenNo.trim().toUpperCase();
        
        const existing = await tokensCollection.findOne({ 
            tokenNo: normalizedTokenNo, 
            date 
        });
        
        if (existing) {
            return res.status(409).json({ 
                error: `Token ${normalizedTokenNo} already exists for ${date}` 
            });
        }
        
        const newToken = {
            tokenNo: normalizedTokenNo,
            date,
            shift,
            mine,
            markedAt: new Date().toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            }),
            createdAt: new Date()
        };
        
        const result = await tokensCollection.insertOne(newToken);
        const savedToken = { ...newToken, _id: result.insertedId };
        
        res.status(201).json(formatToken(savedToken));
    } catch (error) {
        console.error('POST /api/tokens error:', error);
        res.status(500).json({ error: 'Failed to create token' });
    }
});

app.post('/api/tokens/bulk', async (req, res) => {
    try {
        const { tokens: tokenList, shift, mine = 'Balaria' } = req.body;
        
        if (!tokenList || !Array.isArray(tokenList) || tokenList.length === 0) {
            return res.status(400).json({ error: 'Token list is required' });
        }
        
        if (!['A', 'B', 'C', 'OFF'].includes(shift)) {
            return res.status(400).json({ error: 'Valid shift is required' });
        }
        
        const date = req.body.date;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required' });
        }
        
        const normalizedTokens = tokenList
            .map(t => t.trim().toUpperCase())
            .filter(t => t.length > 0);
        
        if (normalizedTokens.length === 0) {
            return res.status(400).json({ error: 'No valid tokens provided' });
        }
        
        const existingTokens = await tokensCollection.find({
            tokenNo: { $in: normalizedTokens },
            date
        }).toArray();
        
        const existingSet = new Set(existingTokens.map(t => t.tokenNo));
        const newTokens = normalizedTokens
            .filter(t => !existingSet.has(t))
            .map(tokenNo => ({
                tokenNo,
                date,
                shift,
                mine,
                markedAt: new Date().toLocaleTimeString([], { 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                }),
                createdAt: new Date()
            }));
        
        let insertedCount = 0;
        if (newTokens.length > 0) {
            const result = await tokensCollection.insertMany(newTokens);
            insertedCount = result.insertedCount;
        }
        
        res.json({
            added: insertedCount,
            skipped: normalizedTokens.length - newTokens.length,
            tokens: newTokens.map(formatToken)
        });
    } catch (error) {
        console.error('POST /api/tokens/bulk error:', error);
        res.status(500).json({ error: 'Failed to bulk create tokens' });
    }
});

app.patch('/api/tokens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { shift } = req.body;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }
        
        if (!shift || !['A', 'B', 'C', 'OFF'].includes(shift)) {
            return res.status(400).json({ error: 'Valid shift is required' });
        }
        
        const result = await tokensCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    shift,
                    markedAt: new Date().toLocaleTimeString([], { 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                    })
                } 
            },
            { returnDocument: 'after' }
        );
        
        if (!result) {
            return res.status(404).json({ error: 'Token not found' });
        }
        
        res.json(formatToken(result));
    } catch (error) {
        console.error('PATCH /api/tokens/:id error:', error);
        res.status(500).json({ error: 'Failed to update token' });
    }
});

app.delete('/api/tokens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid token ID' });
        }
        
        const result = await tokensCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Token not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/tokens/:id error:', error);
        res.status(500).json({ error: 'Failed to delete token' });
    }
});

app.delete('/api/tokens', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Token IDs array is required' });
        }
        
        const objectIds = ids
            .filter(ObjectId.isValid)
            .map(id => new ObjectId(id));
        
        if (objectIds.length === 0) {
            return res.status(400).json({ error: 'No valid token IDs provided' });
        }
        
        const result = await tokensCollection.deleteMany({ _id: { $in: objectIds } });
        
        res.json({ deleted: result.deletedCount });
    } catch (error) {
        console.error('DELETE /api/tokens error:', error);
        res.status(500).json({ error: 'Failed to delete tokens' });
    }
});

app.get('/api/export/monthly', async (req, res) => {
    try {
        const { date, mine = 'Balaria', format = 'json' } = req.query;
        
        if (!date || !/^\d{4}-\d{2}/.test(date)) {
            return res.status(400).json({ error: 'Valid date (YYYY-MM) is required' });
        }
        
        const [yearStr, monthStr] = date.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const monthPrefix = `${yearStr}-${monthStr}`;
        
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = monthNames[month - 1];
        
        const tokens = await tokensCollection.find({ 
            date: { $regex: `^${monthPrefix}` },
            mine
        }).toArray();
        
        if (tokens.length === 0) {
            return res.status(404).json({ error: 'No records found for this month' });
        }
        
        const tokenMap = new Map();
        tokens.forEach(t => {
            tokenMap.set(`${t.tokenNo}|${t.date}`, t.shift);
        });
        
        const uniqueTokens = Array.from(new Set(tokens.map(t => t.tokenNo))).sort();
        
        const matrixRows = uniqueTokens.map((tokenNo, index) => {
            const row = {
                'Sl No': index + 1,
                'Token Number': tokenNo
            };
            
            let countA = 0, countB = 0, countC = 0, countOff = 0, totalWorked = 0;
            
            for (let d = 1; d <= daysInMonth; d++) {
                const dayString = String(d).padStart(2, '0');
                const dateKey = `${monthPrefix}-${dayString}`;
                const colHeader = `${dayString}-${monthLabel}`;
                const shift = tokenMap.get(`${tokenNo}|${dateKey}`);
                
                if (shift) {
                    row[colHeader] = shift;
                    if (shift === 'A') countA++;
                    else if (shift === 'B') countB++;
                    else if (shift === 'C') countC++;
                    else if (shift === 'OFF') countOff++;
                    if (shift !== 'OFF') totalWorked++;
                } else {
                    row[colHeader] = '-';
                }
            }
            
            row['Total Shift A'] = countA;
            row['Total Shift B'] = countB;
            row['Total Shift C'] = countC;
            row['Total Off'] = countOff;
            row['Total Worked Days'] = totalWorked;
            
            return row;
        });
        
        if (format === 'csv') {
            const headers = ['Sl No', 'Token Number'];
            for (let d = 1; d <= daysInMonth; d++) {
                headers.push(`${String(d).padStart(2, '0')}-${monthLabel}`);
            }
            headers.push('Total Shift A', 'Total Shift B', 'Total Shift C', 'Total Off', 'Total Worked Days');
            
            const escapeCsv = (val) => {
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };
            
            const csvRows = [headers.map(escapeCsv).join(',')];
            
            matrixRows.forEach(row => {
                const csvRow = [
                    row['Sl No'],
                    escapeCsv(row['Token Number'])
                ];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dayString = String(d).padStart(2, '0');
                    const colHeader = `${dayString}-${monthLabel}`;
                    csvRow.push(escapeCsv(row[colHeader]));
                }
                csvRow.push(
                    row['Total Shift A'],
                    row['Total Shift B'],
                    row['Total Shift C'],
                    row['Total Off'],
                    row['Total Worked Days']
                );
                csvRows.push(csvRow.join(','));
            });
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${mine}_${monthLabel}_Attendance.csv"`);
            return res.send('\uFEFF' + csvRows.join('\n'));
        }
        
        res.json({
            mine,
            month: monthLabel,
            year,
            data: matrixRows
        });
    } catch (error) {
        console.error('GET /api/export/monthly error:', error);
        res.status(500).json({ error: 'Failed to export monthly data' });
    }
});

app.get('/api/mines', (req, res) => {
    res.json(['Balaria', 'Mochia', 'Baroi']);
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
    const connected = await connectToDatabase();
    if (!connected) {
        console.error('Failed to connect to database. Exiting...');
        process.exit(1);
    }
    
app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShiftTrack API server running on http://localhost:${PORT}`);
    console.log(`Server listening on port ${PORT}`);
});
}

startServer();