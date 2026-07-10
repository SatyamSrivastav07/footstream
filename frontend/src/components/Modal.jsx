import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ title, description, open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#020806]/80 p-4 backdrop-blur-sm" role="presentation">
      <section className="my-8 w-full max-w-lg rounded-3xl border border-white/10 bg-[#102019] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="modal-title" className="font-display text-2xl font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-emerald-100/55">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close dialog"><X size={19} /></button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

