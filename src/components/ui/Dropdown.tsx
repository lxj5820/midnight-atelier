import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
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
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current || !isOpen) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(rect.width, vw - 16);
    const style: React.CSSProperties = {
      position: 'fixed',
      width: maxW,
      maxWidth: vw - 16,
      boxShadow: '0 10px 40px var(--c-shadow-heavy)',
    };
    if (direction === 'up') {
      style.bottom = Math.max(8, vh - rect.top + 8);
      style.left = Math.max(8, Math.min(rect.left, vw - maxW - 8));
    } else {
      style.top = Math.min(rect.bottom + 8, vh - 8);
      style.left = Math.max(8, Math.min(rect.left, vw - maxW - 8));
    }
    setPanelStyle(style);
  }, [isOpen, direction]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      const insideButton = dropdownRef.current?.contains(target) ?? false;
      const insidePanel = panelRef.current?.contains(target) ?? false;
      if (!insideButton && !insidePanel) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-1 border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary cursor-pointer flex justify-between items-center transition-all duration-200 hover:bg-surface-3 hover:border-indigo-500/40 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 shadow-sm"
        style={{ outline: 'none' }}
      >
        <span className="truncate flex items-center gap-2">{selectedOption?.icon}{selectedOption?.label || '请选择'}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="bg-surface-1 border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden transition-all duration-150 opacity-100 visible"
          style={panelStyle}
        >
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
            {options.map(option => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all duration-150 ${
                  option.value === value
                    ? 'bg-indigo-500/15 text-indigo-500 font-semibold'
                    : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                }`}
              >
                <span className="pr-2 truncate flex items-center gap-2">{option.icon}{option.label}</span>
                {option.value === value && (
                  <Check className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
