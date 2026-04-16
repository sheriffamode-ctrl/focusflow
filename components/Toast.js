'use client'
export default function Toast({ message }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className="px-4 py-3 rounded-xl text-sm font-medium text-white shadow-xl"
        style={{ background: '#1A1A18', maxWidth: 300 }}>
        {message}
      </div>
    </div>
  )
}
