import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme()

  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle
