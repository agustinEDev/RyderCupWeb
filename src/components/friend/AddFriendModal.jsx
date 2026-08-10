import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';
import Avatar from '../ui/Avatar';

const AddFriendModalContent = ({ onClose, onSend, onSearchUsers, isProcessing, t }) => {
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const onSearchUsersRef = useRef(onSearchUsers);
  const onCloseRef = useRef(onClose);
  const isProcessingRef = useRef(isProcessing);
  const highlightedIndexRef = useRef(highlightedIndex);
  const showDropdownRef = useRef(showDropdown);
  const searchResultsRef = useRef(searchResults);
  useEffect(() => { onSearchUsersRef.current = onSearchUsers; });
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => { isProcessingRef.current = isProcessing; });
  useEffect(() => { highlightedIndexRef.current = highlightedIndex; });
  useEffect(() => { showDropdownRef.current = showDropdown; });
  useEffect(() => { searchResultsRef.current = searchResults; });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDropdownRef.current) {
          setShowDropdown(false);
          setHighlightedIndex(-1);
        } else if (!isProcessingRef.current) {
          onCloseRef.current();
        }
        return;
      }

      if (!showDropdownRef.current || searchResultsRef.current.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        setHighlightedIndex((prev) => (prev < len - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : len - 1));
      } else if (e.key === 'Enter') {
        const idx = highlightedIndexRef.current;
        if (idx >= 0 && idx < searchResultsRef.current.length) {
          e.preventDefault();
          const user = searchResultsRef.current[idx];
          setSelectedUser(user);
          setSearchQuery('');
          setShowDropdown(false);
          setError('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchRequestIdRef.current += 1;
    const currentRequestId = searchRequestIdRef.current;
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await onSearchUsersRef.current(trimmed);
        if (currentRequestId !== searchRequestIdRef.current) return;
        setSearchResults(results);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch {
        if (currentRequestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError(t('add.noUserSelected'));
      return;
    }

    onSend(selectedUser.id);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchQuery('');
    setShowDropdown(false);
    setError('');
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-friend-modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id="add-friend-modal-title" className="text-lg font-semibold text-gray-900">{t('add.title')}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            {selectedUser ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md" data-testid="selected-user-chip">
                <Avatar userId={selectedUser.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearUser}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  data-testid="clear-selected-user"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setError(''); }}
                    placeholder={t('add.searchPlaceholder')}
                    disabled={isProcessing}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                    data-testid="user-search-input"
                    role="combobox"
                    aria-expanded={showDropdown && searchResults.length > 0}
                    aria-haspopup="listbox"
                    aria-controls="friend-search-listbox"
                    aria-activedescendant={highlightedIndex >= 0 ? `friend-search-option-${highlightedIndex}` : undefined}
                  />
                  {isSearching && (
                    <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>

                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <p className="text-xs text-gray-400 mt-1">{t('add.searchMinChars')}</p>
                )}

                {showDropdown && searchResults.length > 0 && (
                  <div id="friend-search-listbox" className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto" data-testid="search-results-dropdown" role="listbox">
                    {searchResults.map((user, index) => (
                      <button
                        key={user.id}
                        id={`friend-search-option-${index}`}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full px-3 py-2 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                          index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                        role="option"
                        aria-selected={index === highlightedIndex}
                        data-testid={`search-result-${user.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar userId={user.id} size="sm" />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
                  <p className="text-xs text-gray-500 mt-1" data-testid="no-users-found">{t('add.noUsersFound')}</p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {t('cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={isProcessing || !selectedUser}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="send-request-button"
            >
              {isProcessing ? t('add.sending') : t('add.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddFriendModal = ({ isOpen, onClose, onSend, onSearchUsers, isProcessing, t }) => {
  if (!isOpen) return null;
  return (
    <AddFriendModalContent
      onClose={onClose}
      onSend={onSend}
      onSearchUsers={onSearchUsers}
      isProcessing={isProcessing}
      t={t}
    />
  );
};

export default AddFriendModal;
