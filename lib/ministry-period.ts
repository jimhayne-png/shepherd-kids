export function getCurrentPeriod(frequency: string): { year: number; month: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return frequency === 'bimonthly' ? { year, month: Math.ceil(month / 2) } : { year, month };
}

export function getPeriodLabel(frequency: string, year: number, period: number): string {
  const full = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (frequency === 'bimonthly') {
    const s = (period - 1) * 2;
    return `${full[s]}–${full[s + 1]} ${year}`;
  }
  return `${full[period - 1]} ${year}`;
}
