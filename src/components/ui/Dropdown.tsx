/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
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
  /** 供屏幕阅读器使用的标签 */
  ariaLabel?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  className = '',
  direction = 'up',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const listboxId = useId();
  const buttonId = useId();

  const selectedOption = options.find(opt => opt.value === value);
  const selectedIndex = options.findIndex(opt => opt.value === value);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current || !isOpen) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 防止面板超出视口
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

  // 打开时初始化激活项为当前选中项
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // 激活项变化时滚动到可视区域
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    const el = optionRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  // 关闭时恢复焦点到触发按钮
  useEffect(() => {
    if (!isOpen && buttonRef.current && document.activeElement !== buttonRef.current) {
      // 仅当焦点原本在面板内时才恢复
      const active = document.activeElement as Node | null;
      const insidePanel = panelRef.current?.contains(active ?? null) ?? false;
      if (insidePanel) {
        buttonRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    // 选中后把焦点还给触发按钮，便于继续键盘操作
    requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => Math.min(prev + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(Math.max(index - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSelect(options[index].value);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        requestAnimationFrame(() => buttonRef.current?.focus());
        break;
      case 'Tab':
        // 允许默认 Tab 行为，关闭面板
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        className="w-full bg-surface-1 border border-border rounded-xl py-2.5 px-4 text-sm text-text-primary cursor-pointer flex justify-between items-center transition-colors duration-200 hover:bg-surface-3 hover:border-indigo-500/40 focus-visible:border-indigo-500/60 focus-visible:ring-2 focus-visible:ring-indigo-500/15 shadow-sm"
      >
        <span className="truncate flex items-center gap-2">{selectedOption?.icon}{selectedOption?.label || '请选择'}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={buttonId}
          tabIndex={-1}
          className="bg-surface-1 border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={panelStyle}
        >
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  type="button"
                  key={option.value}
                  ref={el => { optionRefs.current[index] = el; }}
                  id={`${listboxId}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                  tabIndex={isActive ? 0 : -1}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-indigo-500/15 text-indigo-500 font-semibold'
                      : isActive
                      ? 'bg-bg-subtle text-text-primary'
                      : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30`}
                >
                  <span className="pr-2 truncate flex items-center gap-2">{option.icon}{option.label}</span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-indigo-500 flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
