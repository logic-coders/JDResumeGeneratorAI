'use client';

import React, { useEffect, useRef } from 'react';
import { SLASH_COMMANDS } from '../lib/types';

interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  position: { bottom: number; left: number };
}

export default function SlashCommandMenu({ query, onSelect, onClose, position }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query (everything after the '/')
  const filteredCommands = SLASH_COMMANDS.filter((c) => 
    c.command.toLowerCase().includes(`/${query.toLowerCase()}`) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, typeof SLASH_COMMANDS>);

  // Flatten for keyboard navigation
  const flatCommands = Object.values(groupedCommands).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (flatCommands.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatCommands.length) % flatCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(flatCommands[selectedIndex].command);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatCommands, selectedIndex, onSelect, onClose]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Add small delay to avoid closing immediately on the click that opened it
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  if (flatCommands.length === 0) return null;

  let globalIndex = 0;

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-secondary rounded-lg shadow-2xl border border-panel-border overflow-hidden w-72 max-h-80 flex flex-col animate-fade-in"
      style={{
        bottom: `${position.bottom}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-2 border-b border-panel-border bg-panel text-xs text-muted-foreground font-medium">
        Commands
      </div>
      <div className="overflow-y-auto p-1 flex-1">
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <div key={category} className="mb-2 last:mb-0">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
              {category}
            </div>
            {cmds.map((cmd) => {
              const currentIndex = globalIndex++;
              const isSelected = currentIndex === selectedIndex;
              
              return (
                <button
                  key={cmd.command}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors ${
                    isSelected 
                      ? 'bg-primary text-white' 
                      : 'hover:bg-secondary text-foreground'
                  }`}
                  onClick={() => onSelect(cmd.command)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                >
                  <span className={`font-mono text-sm font-medium ${isSelected ? 'text-white' : 'text-blue-400'}`}>
                    {cmd.command}
                  </span>
                  <span className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-muted-foreground'}`}>
                    {cmd.description}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
