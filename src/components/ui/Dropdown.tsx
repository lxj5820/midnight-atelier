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
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className = '',
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
        className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg py-2.5 px-4 text-sm text-[#e4e4e7] cursor-pointer flex justify-between items-center transition-all hover:bg-[#27272a] hover:border-[#52525b]"
        style={{ outline: 'none' }}
      >
        <span>{selectedOption?.label || '请选择'}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-[#3f3f46] rounded-xl shadow-lg shadow-black/50 z-50 min-w-[130px] overflow-hidden">
          <div className="dropdown-scroll max-h-[300px] overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-[#4b5563] scrollbar-track-transparent">
            {options.map(option => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md cursor-pointer transition-all ${
                  option.value === value
                    ? 'bg-[#3b82f6]/15 text-[#60a5fa]'
                    : 'text-[#d4d4d8] hover:bg-[#27272a] hover:text-white'
                }`}
              >
                <span className="pr-2">{option.label}</span>
                {option.value === value && (
                  <Check className="w-3 h-3 text-[#60a5fa] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};