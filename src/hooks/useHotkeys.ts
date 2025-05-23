import { useEffect, useRef } from 'react'

type HotkeyCallback = () => void
type HotkeyMap = Map<string, HotkeyCallback>

export function useHotkeys() {
  const hotkeysRef = useRef<HotkeyMap>(new Map())

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // تجاهل الاختصارات عند الكتابة في حقول النص
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = event.key.toLowerCase()
      const ctrl = event.ctrlKey
      const hotkey = `${ctrl ? 'ctrl+' : ''}${key}`

      const callback = hotkeysRef.current.get(hotkey)
      if (callback) {
        event.preventDefault()
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function registerHotkey(hotkey: string, callback: HotkeyCallback) {
    hotkeysRef.current.set(hotkey.toLowerCase(), callback)
  }

  function unregisterHotkey(hotkey: string) {
    hotkeysRef.current.delete(hotkey.toLowerCase())
  }

  return {
    registerHotkey,
    unregisterHotkey
  }
}