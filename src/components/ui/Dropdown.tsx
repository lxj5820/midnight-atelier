import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  direction?: 'up' | 'down';
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className = '',
  direction = 'up',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-1 border border-white/[0.06] rounded-xl py-2.5 px-4 text-sm text-white cursor-pointer flex justify-between items-center transition-all duration-200 hover:bg-surface-3 hover:border-white/[0.1] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
        style={{ outline: 'none' }}
      >
        <span className="truncate">{selectedOption?.label || '请选择'}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-surface-2 border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden`}>
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
            {options.map(option => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all duration-150 ${
                  option.value === value
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="pr-2 truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
