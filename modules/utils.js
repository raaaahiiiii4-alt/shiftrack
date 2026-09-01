// ============================================================================
// ShiftTrack - Utils Module (Pure Functions, No Side Effects)
// ============================================================================

export const dateUtils = {
  today: () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  parse: (str) => new Date(str),

  format: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  monthLabel: (month) => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month - 1] || '';
  },

  daysInMonth: (year, month) => new Date(year, month, 0).getDate(),

  range: (year, month) => ({
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  })
};

export const validators = {
  tokenNo: (str) => /^\d+$/.test(String(str).trim()),

  shift: (str) => ['A', 'B', 'C', 'OFF'].includes(str),

  email: (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
};

export const formatters = {
  time: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  tokenDisplay: (str) => String(str).trim()
};

export const helpers = {
  debounce: (fn, ms) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    };
  },

  numericSort: (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }),

  capitalize: (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
};