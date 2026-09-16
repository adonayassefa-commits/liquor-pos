export type Language = 'en' | 'am'

export const translations = {
  en: {
    dashboard: 'Dashboard',
    pos: 'POS',
    sales: 'Sales',
    products: 'Products',
    inventory: 'Inventory',
    purchases: 'Purchases',
    suppliers: 'Suppliers',
    customers: 'Customers',
    expenses: 'Expenses',
    reports: 'Reports',
    endOfDay: 'End of Day',
    settings: 'Settings',
    logOut: 'Log out',
    welcomeBack: 'Welcome back',
    search: 'Search products, customers...',
    addProduct: '+ Add Product',
    addCustomer: '+ Add Customer',
    addSupplier: '+ Add Supplier',
    addExpense: '+ Add Expense',
    newPurchase: '+ New Purchase',
    save: 'Save',
    cancel: 'Cancel',
    saving: 'Saving...',
    edit: 'Edit',
    archive: 'Archive',
    loading: 'Loading...',
    today: 'Today',
    total: 'Total',
    completeSale: 'Complete Sale',
    name: 'Name',
    price: 'Price',
    stock: 'Stock',
    category: 'Category',
  },
  am: {
    dashboard: 'ዳሽቦርድ',
    pos: 'ሽያጭ ቦታ',
    sales: 'ሽያጮች',
    products: 'ምርቶች',
    inventory: 'ዕቃ ክምችት',
    purchases: 'ግዢዎች',
    suppliers: 'አቅራቢዎች',
    customers: 'ደንበኞች',
    expenses: 'ወጪዎች',
    reports: 'ሪፖርቶች',
    endOfDay: 'የቀን መጨረሻ',
    settings: 'ቅንብሮች',
    logOut: 'ውጣ',
    welcomeBack: 'እንኳን ደህና መጡ',
    search: 'ምርቶችን፣ ደንበኞችን ይፈልጉ...',
    addProduct: '+ ምርት ጨምር',
    addCustomer: '+ ደንበኛ ጨምር',
    addSupplier: '+ አቅራቢ ጨምር',
    addExpense: '+ ወጪ ጨምር',
    newPurchase: '+ አዲስ ግዢ',
    save: 'አስቀምጥ',
    cancel: 'ይቅር',
    saving: 'በማስቀመጥ ላይ...',
    edit: 'አርም',
    archive: 'ማህደር',
    loading: 'በመጫን ላይ...',
    today: 'ዛሬ',
    total: 'ጠቅላላ',
    completeSale: 'ሽያጭ አጠናቅቅ',
    name: 'ስም',
    price: 'ዋጋ',
    stock: 'ክምችት',
    category: 'ምድብ',
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function getLanguage(): Language {
  return (localStorage.getItem('app_language') as Language) || 'en'
}

export function setLanguage(lang: Language) {
  localStorage.setItem('app_language', lang)
}

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] ?? translations.en[key]
}