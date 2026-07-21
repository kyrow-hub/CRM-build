import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const success = useCallback((message) => showToast(message, 'success'), [showToast])
  const error = useCallback((message) => showToast(message, 'error'), [showToast])

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div className={`toast toast--${toast.type}`} key={toast.id}>
            {toast.type === 'success' ? (
              <CheckCircle2 strokeWidth={2} />
            ) : (
              <AlertCircle strokeWidth={2} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
