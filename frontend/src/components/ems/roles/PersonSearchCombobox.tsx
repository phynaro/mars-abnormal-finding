import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personService, type Person } from '@/services/administrationService';
import { cn } from '@/lib/utils';

interface PersonSearchComboboxProps {
  label: string;
  placeholder?: string;
  selectedPersonNo: string;
  selectedLabel: string;
  onSelect: (person: Person) => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

const PersonSearchCombobox: React.FC<PersonSearchComboboxProps> = ({
  label,
  placeholder = 'Search by name or code…',
  selectedPersonNo,
  selectedLabel,
  onSelect,
  onClear,
  disabled,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selectedLabel);
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel, selectedPersonNo]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const rows = await personService.searchPersons(query.trim(), 10);
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div className={cn('space-y-1', className)} ref={containerRef}>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 h-9"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim() && onClear) onClear();
          }}
        />
        {open && query.trim().length >= 2 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
            {loading && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
            )}
            {!loading && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
            )}
            {results.map((person) => (
              <button
                key={person.PERSONNO}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => {
                  onSelect(person);
                  setQuery(person.PERSON_NAME || `${person.FIRSTNAME} ${person.LASTNAME}`.trim());
                  setOpen(false);
                  setResults([]);
                }}
              >
                <span className="font-medium">{person.PERSON_NAME}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  #{person.PERSONNO}
                  {person.PERSONCODE ? ` · ${person.PERSONCODE}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonSearchCombobox;
