export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  return (localStorage.getItem('app_theme') as Theme) || 'light'
}

export function setTheme(theme: Theme) {
  localStorage.setItem('app_theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function applyStoredTheme() {
  const theme = getTheme()
  document.documentElement.classList.toggle('dark', theme === 'dark')
}