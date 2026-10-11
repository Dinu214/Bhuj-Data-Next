'use client';

import React, { useState } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
}

interface SelectSheetProps {
  label?: string;
  placeholder?: string;
  value: string | number | undefined;
  onChange: (value: any) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  searchable?: boolean;
}

export const SelectSheet: React.FC<SelectSheetProps> = ({
  label,
  placeholder = 'Select...',
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  buttonClassName = '',
  searchable,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const showSearch = searchable !== undefined ? searchable : options.length > 5;

  const filteredOptions = showSearch && search.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.description && o.description.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setSearch(''); setOpen(true); } }}
        className={`w-full min-h-[42px] px-3.5 bg-paper border border-surface-line hover:border-maroon/40 rounded-xl flex items-center justify-between text-left transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className={`text-xs font-semibold truncate pr-2 ${selectedOption ? 'text-ink' : 'text-ink-muted'}`}>
          {displayLabel}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-muted shrink-0" />
      </button>

      {open && (
        <div className="sheet-backdrop open" onClick={() => setOpen(false)}>
          <div
            className="sheet open max-w-lg mx-auto"
            onClick={e => e.stopPropagation()}
            style={{ zIndex: 70 }}
          >
            <div className="sheet-grabber" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-soft">
              <div>
                <h3 className="font-display font-bold text-ink text-base">
                  {label ? `Select ${label}` : 'Select Option'}
                </h3>
                {selectedOption && (
                  <p className="text-xs text-ink-muted font-medium mt-0.5">
                    Current: <strong className="text-ink">{selectedOption.label}</strong>
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="roundbtn" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {showSearch && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${label || 'options'}...`}
                  className="w-full h-11 pl-9 pr-3 text-xs sm:text-sm font-semibold bg-surface-soft border border-surface-line rounded-xl text-ink outline-none focus:border-maroon"
                  autoFocus
                />
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 pb-4">
              {filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); setSearch(''); }}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all active:scale-[0.99] min-h-[48px] ${
                      isSelected
                        ? 'bg-marigold-soft/60 border-marigold shadow-sm'
                        : 'bg-paper border-surface-line hover:bg-surface-soft'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <p className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-maroon' : 'text-ink'}`}>
                        {opt.label}
                      </p>
                      {opt.description && (
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">{opt.description}</p>
                      )}
                    </div>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-maroon text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-surface-line shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredOptions.length === 0 && (
                <p className="text-center text-xs text-ink-muted py-8">No matching options found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectSheet;

