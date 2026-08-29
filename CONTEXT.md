# ShiftTrack - Complete Codebase Context & Analysis

## Project Overview
**ShiftTrack** is a client-side monthly shift roster & attendance matrix management system for mine operations. Built as a single-page application with vanilla JavaScript, it provides token-based shift assignment, filtering, bulk operations, and monthly matrix exports to Excel/CSV.

**Tech Stack**: Vanilla JS (ES6+), HTML5, CSS3 (Custom Properties), SheetJS (xlsx) via CDN, FontAwesome via CDN
**Storage**: localStorage (key: `shift_track_roster_data`)
**No backend required** - fully client-side

---

## File Structure

```
SKK-main/
├── index.html      # Main HTML structure (271 lines)
├── app.js          # Application logic & state management (751 lines)
├── styles.css      # Design system & stylesheet (934 lines)
├── CONTEXT.md      # This documentation file
```

---

## index.html - Structure Analysis

### Key Sections

1. **Head & Dependencies**
   - Google Fonts: Outfit (headings) + Inter (body)
   - FontAwesome 6.4.0 (icons)
   - SheetJS 0.18.5 (xlsx.full.min.js) - loaded via CDN with `defer`
   - Local: `styles.css`, `app.js` (both `defer`)

2. **Background Ambient Glows** (3 fixed positioned blurred circles)
   - `.bg-glow.glow-1` (blue, top-left)
   - `.bg-glow.glow-2` (purple, bottom-right)
   - `.bg-glow.glow-3` (emerald, center)

3. **App Container** (max-width 1400px, centered)

4. **Header** (`.app-header`)
   - Brand: Icon + "ShiftTrack" title + tagline
   - Actions: Mine selector (Balaria/Mochia/Baroi - changes filename only, doesn't partition data), Date picker, Load Demo button, Download Monthly Excel button

5. **Stats Grid** (`.stats-grid` - 5 cards)
   - Total Tokens, Shift A, Shift B, Shift C, General/Off
   - Each with icon, label, value, shift badge

6. **Content Grid** (`.content-grid` - 2 columns: 360px + 1fr)
   
   **Left Panel** (`.input-card`)
   - Tabs: Bulk Add / Single Add
   - **Bulk Form**: Textarea for tokens (comma/space/newline separated), Shift dropdown, Import button
   - **Single Form**: Token input + Shift dropdown + Add button

   **Right Panel** (`.roster-card`)
   - Toolbar: Search input + Filter pills (All/A/B/C/OFF)
   - Bulk Actions Bar (hidden until selection): Selected count, Shift buttons (A/B/C/Off), Delete button
   - Data Table (`.roster-table`):
     - Columns: Checkbox, Sl No, Token ID, Date, Current Shift, Mark Shift (pill buttons), Action (delete)
   - Empty State (shown when no filtered records)
   - Footer: Showing X of Y records, Clear All button, Export Monthly CSV button

7. **Toast Container** (fixed bottom-right, `aria-live="polite"`)

---

## app.js - Complete Logic Analysis

### State Management (lines 9-15)
```javascript
const state = {
    tokens: [],           // Array of { id, tokenNo, date, shift, markedAt, selected }
    selectedDate: 'YYYY-MM-DD',  // Today by default
    selectedMine: 'Balaria',
    activeFilter: 'ALL',  // 'ALL', 'A', 'B', 'C', 'OFF'
    searchQuery: ''
};
```

### Core Functions by Category

#### 1. **Initialization & Storage** (lines 64-115)
- `init()` - Sets date, loads localStorage, loads demo if empty, attaches listeners
- `saveToLocalStorage()` / `loadFromLocalStorage()` - JSON serialize/deserialize tokens array
- `loadDemoData()` - Generates 3-day demo dataset (26th, 27th, 28th of current month) with 5-7 tokens each day. Demo tokens: TOK-101 through TOK-107 across three dates with rotating shifts (A/B/C/OFF).

#### 2. **Date Utilities** (lines 79-94)
- `getTodayDateString()` - Returns YYYY-MM-DD
- `formatTime()` - Locale time string HH:MM:SS (uses `toLocaleTimeString` with hour/minute/second 2-digit)
- `getDaysInMonth(year, month)` - Days in month calculation (month is 1-indexed)

#### 3. **Token CRUD Operations** (lines 171-284)
- `addSingleToken()` - Validates, checks duplicate (same token + same date), prepends to array; ID: `tok_${Date.now()}_${random5}`
- `addBulkTokens()` - Parses textarea (split by `[\s,\n]+`), deduplicates, assigns default shift; ID: `tok_${Date.now()}_${idx}_${random4}`
- `updateShift(id, newShift)` - Updates shift + markedAt timestamp
- `deleteToken(id)` - Removes single token
- `clearAllTokens()` - Confirmation + clears entire array

#### 4. **Bulk Selection Operations** (lines 286-325)
- `toggleSelectAll(checked)` - Selects/deselects all filtered tokens
- `toggleSelectToken(id, checked)` - Toggles individual token selection
- `applyBulkShift(shift)` - Applies shift to all selected tokens
- `deleteSelectedTokens()` - Deletes all selected with confirmation

#### 5. **Filtering & Search** (lines 327-336)
- `getFilteredTokens()` - Filters by: date match + shift filter + search query (case-insensitive tokenNo)

#### 6. **Excel Export - Monthly Matrix** (lines 338-454) ⭐ **CORE FEATURE**
```
Output Structure:
Row = Unique Token (sorted)
Columns = Sl No | Token Number | Day01-Mon | Day02-Mon | ... | Day31-Mon | Total Shift A | Total Shift B | Total Shift C | Total Off | Total Worked Days
```
- Filters tokens for selected month (prefix match on date)
- Builds matrix row per unique token
- Each day column: shift letter or '-' (not marked)
- Summary columns: counts per shift + worked days (non-OFF)
- Uses SheetJS `XLSX.utils.json_to_sheet()` + column width formatting
- Filename: `{Mine}_{Month}_Attendance.xlsx` (fixed typo)

#### 7. **CSV Export - Monthly Matrix** (lines 456-516)
- Same matrix structure as Excel
- Manual CSV string building with headers
- BOM prefix (`\uFEFF`) for Excel UTF-8 compatibility
- Summary column: "Total Worked Days" (now consistent with Excel)
- Triggers download via anchor element
- Toast message shows filename (consistent with Excel export)

#### 8. **Render Pipeline** (lines 517-595)
- `render()` - Called after every state change
- Computes stats for selected date (counts per shift)
- Gets filtered tokens
- Updates bulk actions bar visibility
- Updates select-all checkbox state
- Builds table rows with:
  - Checkbox (bound to token.selected)
  - Serial number
  - Token badge (monospace)
  - Date
  - Shift indicator badge (colored by shift)
  - Shift pills (A/B/C/Off) - active state highlighted
  - Delete icon button
- Updates footer showing count

#### 9. **Toast Notifications** (lines 597-615)
- `showToast(message, type)` - Creates toast element (success/info/warning)
- Auto-removes after 3s with fade-out animation
- Icons: `fa-circle-check` (success), `fa-circle-info` (info), `fa-triangle-exclamation` (warning)

#### 10. **Event Listeners** (lines 617-746)
- Date change → updates state.selectedDate → render()
- Mine selector → updates state.selectedMine → toast
- Demo button → loadDemoData(true)
- Excel/CSV buttons → downloadExcel()/exportCsv()
- Clear All → clearAllTokens()
- Tab switching (Bulk/Single) - ARIA attributes managed
- Form submissions (prevent default, call handlers)
- Search input → state.searchQuery → render()
- Filter pills → state.activeFilter → render()
- Select-all checkbox → toggleSelectAll()
- **Table delegation** (single listener on tbody):
  - Row checkbox → toggleSelectToken()
  - Shift pill → updateShift()
  - Delete button → deleteToken()
- Bulk action buttons → applyBulkShift()/deleteSelectedTokens()

---

## styles.css - Design System Analysis

### CSS Custom Properties (lines 5-51)
- **Colors**: Dark theme (`--bg-main: #0b0f19`), card backgrounds, borders
- **Shift Brand Colors**: A=Amber, B=Blue, C=Violet, OFF=Slate
- **State Colors**: Emerald (success), Danger (red)
- **Typography**: Outfit (headings), Inter (body)
- **Spacing/Radii**: Consistent scale (8/12/16/24px)
- **Shadows**: Glow effects

### Component Styles
1. **Reset & Base** - Border-box, dark bg, hidden overflow-x
2. **Ambient Glows** - Fixed positioned, blurred circles
3. **Container** - Max-width 1400px, centered, z-index above glows
4. **Header** - Glassmorphism (backdrop-filter blur), flex layout
5. **Stats Grid** - 5-column grid (responsive: 3/2/1 columns)
6. **Cards** - Glassmorphism, rounded-xl, subtle borders
7. **Tabs** - Styled radio-group appearance
8. **Forms** - Dark inputs, focus rings (blue), select styling
9. **Buttons** - Variants: primary (blue gradient), emerald, secondary, outline, text-danger, xs, danger, shift-specific
10. **Roster Toolbar** - Search box with icon, filter pill group
11. **Bulk Actions Bar** - Slide-down animation, shift-colored buttons
12. **Data Table** - Sticky header, hover/selected states, token badges
13. **Shift Pills** - Circular buttons, active state = filled brand color
14. **Empty State** - Centered illustration + message
15. **Footer** - Flex layout with export buttons
16. **Toasts** - Fixed container, slide-up animation, type-colored icons
17. **Responsive** - Breakpoints: 1100px, 768px, 480px

---

## Data Model

### Token Object
```javascript
{
    id: 'tok_' + timestamp + '_' + random,  // Unique identifier
    tokenNo: 'TOK-101',                      // User-entered token/employee ID
    date: '2026-08-28',                      // YYYY-MM-DD (shift date)
    shift: 'A' | 'B' | 'C' | 'OFF',          // Assigned shift
    markedAt: 'HH:MM:SS',                    // Timestamp of last modification (locale formatTime)
    selected: false                          // UI selection state (bulk ops)
}
```

**ID Generation Patterns:**
- Single add: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
- Bulk add: `tok_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`

### Storage Format
```json
[
  {"id":"tok_1724567890_abc12","tokenNo":"TOK-101","date":"2026-08-26","shift":"A","markedAt":"10:30:00","selected":false},
  ...
]
```

---

## Working Flow

1. **Load** → `DOMContentLoaded` → `init()`
   - Set today's date in picker
   - Load tokens from localStorage
   - If empty → load demo data (multi-date)
   - Render UI

2. **Daily Operation** (Selected Date)
   - User selects date → filters tokens for that date
   - Add tokens (single/bulk) → saved with selected date
   - Assign shifts via pills or bulk actions
   - Search/filter table
   - Stats update in real-time

3. **Monthly Export**
   - User clicks "Download Monthly Excel" or "Export Monthly CSV"
   - Reads **all tokens for the selected month** (date prefix match)
   - Builds matrix: unique tokens × days in month
   - Adds summary columns
   - Downloads file

4. **Persistence**
   - Every mutation calls `saveToLocalStorage()`
   - Survives browser close/restart

---

## Identified Improvements & Enhancements

### 🔴 Critical / High Priority

| # | Improvement | Description |
|---|-------------|-------------|
| 1 | **Duplicate prevention across dates** | Currently allows same token on different dates (correct), but no validation for worker master data. Add optional "Worker Registry" to validate token existence. |
| 2 | **Shift conflict detection** | Warn if same token assigned to multiple shifts on same date (currently allows overwrite silently). |
| 3 | **Data export includes mine name** | Excel/CSV filename includes mine but sheet data doesn't. Add mine column or metadata sheet. |
| 4 | **Keyboard navigation for table** | Arrow keys to navigate rows, Enter/Space to toggle checkbox, Shift+Click for range select. |
| 5 | **Undo/Redo for bulk actions** | After bulk shift/delete, show toast with "Undo" button (5s window). |

### 🟡 Medium Priority

| # | Improvement | Description |
|---|-------------|-------------|
| 6 | **Import from Excel/CSV** | Parse uploaded file to populate tokens (reverse of export). Support same matrix format. |
| 7 | **Date range picker** | Instead of single date, allow week/month view with multi-date editing. |
| 8 | **Shift templates / Rotas** | Define recurring patterns (e.g., "A-A-B-B-C-C-OFF") and apply to tokens for a month. |
| 9 | **Attendance summary dashboard** | Monthly view: % attendance per token, shift distribution charts (Canvas/Chart.js). |
| 10 | **Print-friendly layout** | `@media print` styles for roster table + stats. |
| 11 | **LocalStorage quota handling** | Catch `QuotaExceededError`, offer cleanup/export before clearing. |
| 12 | **Token auto-complete** | Datalist of previously used tokens for single-add input. |

### 🟢 Nice-to-Have / Polish

| # | Improvement | Description |
|---|-------------|-------------|
| 13 | **Dark/Light theme toggle** | CSS custom properties make this trivial; persist preference. |
| 14 | **Multi-language (i18n)** | Extract strings to JSON, support Hindi/English for mine workers. |
| 15 | **PWA Support** | Manifest + Service Worker for offline use on tablets at mine sites. |
| 16 | **Shift timing configuration** | Define Shift A=6AM-2PM, B=2PM-10PM, C=10PM-6AM; show in tooltips. |
| 17 | **Bulk delete by date** | "Clear all records for selected date" button (separate from Clear All). |
| 18 | **Copy/Paste from spreadsheet** | Paste Excel rows directly into bulk textarea (already works partially). |
| 19 | **Column visibility toggle** | Hide/show Date, MarkedAt, etc. in table. |
| 20 | **Export to PDF** | Print roster as formatted PDF for physical records. |

### 🏗️ Architecture Improvements

| # | Improvement | Description |
|---|-------------|-------------|
| 21 | **Module pattern / ES Modules** | Split `app.js` into: `state.js`, `storage.js`, `render.js`, `export.js`, `events.js`. |
| 22 | **TypeScript migration** | Add types for Token, State, improve maintainability. |
| 23 | **Unit tests** | Vitest/Jest for core logic (filtering, export matrix generation, date utils). |
| 24 | **IndexedDB for large datasets** | localStorage limited (~5MB); IndexedDB handles 100k+ tokens. |
| 25 | **Web Worker for export** | Offload Excel generation to avoid UI freeze on large datasets. |

---

## Known Limitations

1. **No authentication/authorization** - Anyone with URL has full access
2. **No concurrent editing** - localStorage not synced across tabs (could add `storage` event listener)
3. **Single mine at a time** - Mine selector only changes filename, doesn't partition data
4. **No audit trail** - `markedAt` only shows last change, not history
5. **No worker master data** - Tokens are free-text; no name, category, rate linkage
6. **No validation on token format** - Accepts any string; could enforce pattern (e.g., `TOK-\d+`)
7. **Memory: all tokens in state** - No pagination/virtualization for large datasets

---

## Integration Points (for Full-Stack Version)

If migrating to the full-stack Mine Attendance System (`package.json` backend):
- Replace `localStorage` with API calls (`/api/tokens`, `/api/tokens/bulk`)
- Add auth token to requests
- Mine selector → filters by `mine_id` from backend
- Worker registry → validate token exists in workers table
- Shift definitions → fetch from `/api/shifts`
- Salary config → integrate with reports page
- Real-time sync → WebSockets for multi-user editing

---

## Quick Reference: Key Functions to Modify

| Task | Function(s) | File |
|------|-------------|------|
| Add new shift type | `updateShift`, `render` (badge/pill), `downloadExcel`, `exportCsv`, CSS vars | app.js, styles.css |
| Change date format | `getTodayDateString`, `render`, export functions | app.js |
| Add column to export | `downloadExcel` (matrixRows), `exportCsv` (headers/rows) | app.js |
| Modify validation | `addSingleToken`, `addBulkTokens` | app.js |
| Change storage backend | `saveToLocalStorage`, `loadFromLocalStorage` | app.js |
| Update UI colors | CSS custom properties (`:root`) | styles.css |
| Change mine options | `mineSelect` in HTML, `state.selectedMine` in JS | index.html, app.js |
| Modify demo data | `loadDemoData()` | app.js |

---

*Generated: 2026-08-24 | Updated: 2026-08-26 | ShiftTrack v1.0 (client-side)*