import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Church } from '../../types';
import { hasActiveChurchLicense } from '../../utils/developerStorage';
import {
  Search,
  Building2,
  Check,
  X,
  ChevronDown,
  MapPin,
  User,
  Hash,
  Sparkles,
  Plus,
  BadgeCheck,
} from 'lucide-react';

interface ChurchSearchSelectorProps {
  churches: Church[];
  selectedChurchId: string;
  onSelectChurch: (churchId: string) => void;
  onOpenCreateChurch?: () => void;
  label?: string;
  placeholder?: string;
  id?: string;
  helperText?: string;
  variant?: 'combobox' | 'list' | 'compact';
}

export const ChurchSearchSelector: React.FC<ChurchSearchSelectorProps> = ({
  churches,
  selectedChurchId,
  onSelectChurch,
  onOpenCreateChurch,
  label = 'Chwazi Legliz Ou A',
  placeholder = 'Chache pa non legliz, ID (eg. CH001), kòd, pastè oswa vil...',
  id = 'church-search-selector',
  helperText,
  variant = 'combobox',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedChurch = useMemo(
    () => churches.find((c) => c.id === selectedChurchId) || churches[0],
    [churches, selectedChurchId]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto focus search input when opening combobox
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scalable search filtering for thousands of churches
  const filteredChurches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return churches;

    return churches.filter((church) => {
      const matchId = (church.id || '').toLowerCase().includes(query);
      const matchCode = (church.code || '').toLowerCase().includes(query);
      const matchName = (church.name || '').toLowerCase().includes(query);
      const matchPastor = (church.pastor || '').toLowerCase().includes(query);
      const matchCity = (church.city || '').toLowerCase().includes(query);
      const matchAddress = (church.address || '').toLowerCase().includes(query);

      return (
        matchId ||
        matchCode ||
        matchName ||
        matchPastor ||
        matchCity ||
        matchAddress
      );
    });
  }, [churches, searchQuery]);

  const handleSelect = (churchId: string) => {
    onSelectChurch(churchId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // 1. COMPACT VARIANT (Used in headers or tight spaces)
  if (variant === 'compact') {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={`${id}-compact-trigger`}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="max-w-[95px] xs:max-w-[140px] sm:max-w-[190px]">
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-amber-300 block leading-none truncate">
              ID: {selectedChurch?.id || '—'}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-white truncate flex items-center gap-1">
              <span className="truncate">{selectedChurch?.name || 'Chwazi Legliz'}</span>
              {selectedChurch && hasActiveChurchLicense(selectedChurch.id) && (
                <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" title="Legliz verifye ak lisans ofisyèl" />
              )}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 p-3 z-50 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Chanje Espas Legliz ({churches.length})
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {filteredChurches.length} jwenn
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                id={`${id}-compact-search-input`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chache pa ID oswa Non legliz..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredChurches.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Pa gen okenn legliz ki jwenn ak &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredChurches.map((c) => {
                  const isSelected = c.id === selectedChurchId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      id={`${id}-option-${c.id}`}
                      onClick={() => handleSelect(c.id)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'hover:bg-slate-700/80 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold truncate flex items-center gap-1.5">
                          <span className="truncate">{c.name}</span>
                          {hasActiveChurchLicense(c.id) && (
                            <BadgeCheck
                              className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-950 fill-slate-950/20' : 'text-sky-400'}`}
                              title="Legliz verifye ak lisans ofisyèl"
                            />
                          )}
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                              isSelected
                                ? 'bg-slate-950 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {c.id}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {c.pastor} • {c.city || 'Ayiti'}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-slate-950 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick Action to Register New Church */}
            {onOpenCreateChurch && (
              <div className="pt-2 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCreateChurch();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kreye / Anrejistre Yon Nouvo Legliz</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 2. COMBOBOX VARIANT (Full Interactive Searchable Select for Login Screen)
  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={`${id}-trigger`}
            className="block text-xs font-bold uppercase tracking-wider text-amber-300"
          >
            {label} *
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {churches.length} Legliz nan Sistèm nan
          </span>
        </div>
      )}

      {/* TRIGGER BUTTON SHOWING CURRENTLY SELECTED CHURCH */}
      <button
        type="button"
        id={`${id}-trigger`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700 hover:border-amber-400/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-left transition-all cursor-pointer shadow-inner group"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 group-hover:bg-amber-400/20 transition-colors">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm truncate flex items-center gap-1">
                <span className="truncate">{selectedChurch ? selectedChurch.name : 'Chwazi yon legliz...'}</span>
                {selectedChurch && hasActiveChurchLicense(selectedChurch.id) && (
                  <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" title="Legliz verifye ak lisans ofisyèl" />
                )}
              </span>
              {selectedChurch && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold">
                  ID: {selectedChurch.id}
                </span>
              )}
            </div>
            {selectedChurch && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Pastè: {selectedChurch.pastor} • Kòd: {selectedChurch.code} • {selectedChurch.city || 'Ayiti'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <span className="text-[10px] text-amber-400 uppercase font-bold hidden sm:inline-block">
            Chanje
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-amber-400' : ''
            }`}
          />
        </div>
      </button>

      {/* DROPDOWN POPOVER WITH LIVE SEARCH */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700/90 p-3 sm:p-4 z-50 space-y-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* SEARCH INPUT BAR */}
          <div className="relative">
            <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              id={`${id}-search-input`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-medium text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                id={`${id}-clear-search`}
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* RESULTS SUMMARY BAR */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span>
              {searchQuery ? (
                <>
                  Rezilta pou &ldquo;<strong className="text-amber-300">{searchQuery}</strong>&rdquo;:
                </>
              ) : (
                'Lis tout legliz ki disponib nan rezo a:'
              )}
            </span>
            <span className="font-mono font-bold text-amber-400">
              {filteredChurches.length} legliz
            </span>
          </div>

          {/* SCROLLABLE LIST OF CHURCHES */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredChurches.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  Pa gen okenn legliz ki koresponn ak &ldquo;{searchQuery}&rdquo;.
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Eseye chache pa <strong>ID Legliz</strong> (eg. CH001), <strong>Kòd</strong> (eg. TG-01), oswa non Pastè a.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 mt-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Efase Rechèch</span>
                  </button>
                )}
              </div>
            ) : (
              filteredChurches.map((church) => {
                const isSelected = church.id === selectedChurchId;
                return (
                  <button
                    key={church.id}
                    type="button"
                    id={`${id}-option-${church.id}`}
                    onClick={() => handleSelect(church.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-start justify-between gap-3 border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-semibold'
                        : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs sm:text-sm flex items-center gap-1.5 ${isSelected ? 'text-slate-950' : 'text-white'}`}>
                          <span className="truncate">{church.name}</span>
                          {hasActiveChurchLicense(church.id) && (
                            <BadgeCheck
                              className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-950 fill-slate-950/20' : 'text-sky-400'}`}
                              title="Legliz verifye ak lisans ofisyèl"
                            />
                          )}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                            isSelected
                              ? 'bg-slate-950 text-amber-300'
                              : 'bg-slate-800 text-amber-300 border border-slate-700'
                          }`}
                        >
                          ID: {church.id}
                        </span>
                        {church.code && (
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                              isSelected
                                ? 'bg-slate-900/40 text-slate-950'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            {church.code}
                          </span>
                        )}
                      </div>

                      <div
                        className={`mt-1 flex items-center gap-3 text-[11px] flex-wrap ${
                          isSelected ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 opacity-80" />
                          <span>Pastè: <strong>{church.pastor}</strong></span>
                        </span>
                        {church.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 opacity-80" />
                            <span>{church.city}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-bold shadow">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 group-hover:text-white">
                          Chwazi
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick Create Church Footer in Combobox */}
          {onOpenCreateChurch && (
            <div className="pt-2 border-t border-slate-700/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateChurch();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-300/20 hover:from-amber-500/30 hover:to-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Ou vle anrejistre yon nouvo legliz ? Klike la a</span>
              </button>
            </div>
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-400 px-1">{helperText}</p>
      )}
    </div>
  );
};
