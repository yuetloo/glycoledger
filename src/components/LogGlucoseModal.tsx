import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { GlucoseContext } from '../types/nutrition';

interface LogGlucoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  unit: 'mg/dL' | 'mmol/L';
  onSave: (reading: {
    date: string;
    time: string;
    valueMgDl: number;
    context: GlucoseContext;
    note?: string;
  }) => void;
}

const CONTEXTS: GlucoseContext[] = [
  'Fasting',
  'Pre-Meal',
  'Post-Meal (2h)',
  'Bedtime',
];

export const LogGlucoseModal: React.FC<LogGlucoseModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  unit,
  onSave,
}) => {
  const [rawValue, setRawValue] = useState(unit === 'mmol/L' ? '6.2' : '112');
  const [context, setContext] = useState<GlucoseContext>('Post-Meal (2h)');
  const [time, setTime] = useState('14:30');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRawValue(unit === 'mmol/L' ? '6.2' : '112');
    }
  }, [isOpen, unit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(rawValue);
    if (Number.isNaN(numeric) || numeric <= 0) return;

    const valueMgDl =
      unit === 'mmol/L' ? Math.round(numeric * 18.0182) : Math.round(numeric);

    onSave({
      date: selectedDate,
      time,
      valueMgDl,
      context,
      note: note.trim() || undefined,
    });
    setNote('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-glucose-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2
              id="log-glucose-title"
              className="text-base font-semibold text-slate-900"
            >
              Log Blood Glucose
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {selectedDate} · Recorded in {unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="glucose-value"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Reading ({unit})
              </label>
              <input
                id="glucose-value"
                type="number"
                step={unit === 'mmol/L' ? '0.1' : '1'}
                min={unit === 'mmol/L' ? '2.0' : '40'}
                max={unit === 'mmol/L' ? '30.0' : '500'}
                value={rawValue}
                onChange={(e) => setRawValue(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                required
              />
            </div>
            <div>
              <label
                htmlFor="glucose-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Time
              </label>
              <input
                id="glucose-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-9 px-3 text-sm font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Measurement Context
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTEXTS.map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(ctx)}
                  className={`py-2 px-3 text-xs font-medium rounded-md border text-left transition-colors ${
                    context === ctx
                      ? 'bg-teal-50 border-teal-700 text-teal-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="glucose-note"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Meal / Context Note (Optional)
            </label>
            <input
              id="glucose-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2h after lunch bowl + 15m walk"
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-teal-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
            >
              Save Reading
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
