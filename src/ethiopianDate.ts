const JDN_OFFSET = 1723856

const MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
]

const MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
]

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_AM = ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ']

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function jdnToEthiopian(jdn: number): { year: number; month: number; day: number } {
  const r = (jdn - JDN_OFFSET) % 1461
  const n = (r % 365) + 365 * Math.floor(r / 1460)
  const year =
    4 * Math.floor((jdn - JDN_OFFSET) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460)
  const month = Math.floor(n / 30) + 1
  const day = (n % 30) + 1
  return { year, month, day }
}

export function toEthiopianDate(date: Date) {
  const jdn = gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return jdnToEthiopian(jdn)
}

export function formatEthiopianDate(date: Date, lang: 'en' | 'am' = 'en'): string {
  const { year, month, day } = toEthiopianDate(date)
  const months = lang === 'am' ? MONTHS_AM : MONTHS_EN
  const weekdays = lang === 'am' ? WEEKDAYS_AM : WEEKDAYS_EN
  const weekday = weekdays[date.getDay()]
  const monthName = months[month - 1] ?? months[0]
  return `${weekday}, ${monthName} ${day}, ${year}`
}