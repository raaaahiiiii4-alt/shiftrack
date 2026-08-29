export const getDayOfWeek = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

export const getTimeString = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};

export const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end, daysInMonth: end.getDate() };
};

export const formatDateForQuery = (date) => {
  return date.toISOString().split('T')[0];
};