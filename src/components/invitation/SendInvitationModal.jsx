import { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';

const SendInvitationModalContent = ({ onClose, onSend, onSendByUserId, onSearchUsers, isProcessing, t }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [email, setEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchTimerRef = useRef(null);
  const onSearchUsersRef = useRef(onSearchUsers);
  const highlightedIndexRef = useRef(highlightedIndex);
  const showDropdownRef = useRef(showDropdown);
  const searchResultsRef = useRef(searchResults);
  onSearchUsersRef.current = onSearchUsers;
  highlightedIndexRef.current = highlightedIndex;
  showDropdownRef.current = showDropdown;
  searchResultsRef.current = searchResults;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown (document-level to avoid focus issues)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showDropdownRef.current || searchResultsRef.current.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        setHighlightedIndex(prev => (prev < len - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : len - 1));
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
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const el = document.getElementById(`search-option-${highlightedIndex}`);
      if (el?.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await onSearchUsersRef.current(trimmed);
        setSearchResults(results);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('errors.invalidEmail'));
      return;
    }

    onSend(trimmedEmail, personalMessage.trim() || null);
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError(t('send.noUserSelected'));
      return;
    }

    onSendByUserId(selectedUser.id, personalMessage.trim() || null);
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('send.title')}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200" data-testid="invitation-tabs">
          <button
            type="button"
            onClick={() => handleTabChange('search')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-search-user"
          >
            {t('send.tabSearchUser')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('email')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-by-email"
          >
            {t('send.tabByEmail')}
          </button>
        </div>

        {/* Search User Tab */}
        {activeTab === 'search' && (
          <form onSubmit={handleUserSubmit} className="p-4 space-y-4">
            <div>
              {selectedUser ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md" data-testid="selected-user-chip">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
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
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setError(''); }}
                      placeholder={t('send.searchPlaceholder')}
                      disabled={isProcessing}
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      data-testid="user-search-input"
                      role="combobox"
                      aria-expanded={showDropdown && searchResults.length > 0}
                      aria-haspopup="listbox"
                      aria-controls="user-search-listbox"
                      aria-activedescendant={highlightedIndex >= 0 ? `search-option-${highlightedIndex}` : undefined}
                    />
                    {isSearching && (
                      <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Search hint */}
                  {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                    <p className="text-xs text-gray-400 mt-1">{t('send.searchMinChars')}</p>
                  )}

                  {/* Results dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div id="user-search-listbox" className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto" data-testid="search-results-dropdown" role="listbox">
                      {searchResults.map((user, index) => (
                        <button
                          key={user.id}
                          id={`search-option-${index}`}
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
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No results */}
                  {showDropdown && searchResults.length === 0 && searchQuery.trim().length >= 2 && !isSearching && (
                    <p className="text-xs text-gray-500 mt-1" data-testid="no-users-found">{t('send.noUsersFound')}</p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div>
              <label htmlFor="invitation-message-search" className="block text-sm font-medium text-gray-700 mb-1">
                {t('send.personalMessage')}
              </label>
              <textarea
                id="invitation-message-search"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={t('send.personalMessagePlaceholder')}
                disabled={isProcessing}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 resize-none"
                data-testid="invitation-message-input"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {personalMessage.length}/500
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {t('cancel', { ns: 'schedule' })}
              </button>
              <button
                type="submit"
                disabled={isProcessing || !selectedUser}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="send-invitation-button"
              >
                {isProcessing ? t('send.sending') : t('send.send')}
              </button>
            </div>
          </form>
        )}

        {/* By Email Tab */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="p-4 space-y-4">
            <div>
              <label htmlFor="invitation-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('send.emailLabel')}
              </label>
              <input
                id="invitation-email"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder={t('send.emailPlaceholder')}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                data-testid="invitation-email-input"
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div>
              <label htmlFor="invitation-message-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('send.personalMessage')}
              </label>
              <textarea
                id="invitation-message-email"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={t('send.personalMessagePlaceholder')}
                disabled={isProcessing}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 resize-none"
                data-testid="invitation-message-input"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {personalMessage.length}/500
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {t('cancel', { ns: 'schedule' })}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="send-invitation-button"
              >
                {isProcessing ? t('send.sending') : t('send.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const SendInvitationModal = ({ isOpen, onClose, onSend, onSendByUserId, onSearchUsers, isProcessing, t }) => {
  if (!isOpen) return null;
  return (
    <SendInvitationModalContent
      onClose={onClose}
      onSend={onSend}
      onSendByUserId={onSendByUserId}
      onSearchUsers={onSearchUsers}
      isProcessing={isProcessing}
      t={t}
    />
  );
};

export default SendInvitationModal;
