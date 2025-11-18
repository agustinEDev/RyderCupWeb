import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * CountryAutocomplete Component
 * Searchable dropdown for country selection
 * Supports search in both English and Spanish
 */
const CountryAutocomplete = ({
  countries = [],
  value = '',
  onChange,
  placeholder = 'Select a country...',
  disabled = false,
  error = false,
  label = 'Country',
  required = false,
  emptyMessage = 'No countries available'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(countries);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Get selected country object
  const selectedCountry = countries.find(c => c.code === value);

  // Filter countries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = countries.filter(country => {
      const nameEn = country.name_en?.toLowerCase() || '';
      const nameEs = country.name_es?.toLowerCase() || '';
      const code = country.code?.toLowerCase() || '';

      return nameEn.includes(query) ||
             nameEs.includes(query) ||
             code.includes(query);
    });

    setFilteredCountries(filtered);
  }, [searchQuery, countries]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSelect = (country) => {
    onChange(country.code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected value / trigger */}
      <div
        onClick={handleToggle}
        className={`w-full px-4 py-3 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-between ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-primary/50'}`}
      >
        <span className={selectedCountry ? 'text-gray-900' : 'text-gray-400'}>
          {selectedCountry ? selectedCountry.name_en : placeholder}
        </span>

        <div className="flex items-center gap-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
          </div>

          {/* Countries list */}
          <div className="overflow-y-auto max-h-60">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No countries match your search' : emptyMessage}
              </div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={country.code}
                  onClick={() => handleSelect(country)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    country.code === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{country.name_en}</span>
                    <span className="text-xs text-gray-400 ml-2">{country.code}</span>
                  </div>
                  {country.name_es !== country.name_en && (
                    <div className="text-xs text-gray-500 mt-0.5">{country.name_es}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryAutocomplete;
