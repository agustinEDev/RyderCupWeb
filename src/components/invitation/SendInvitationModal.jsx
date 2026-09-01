import { useState, useEffect, useRef, useCallback } from 'react';
import { nombreRealSiAporta, nombreVisible } from '../../utils/nombreVisible';
import { X, Search, Loader } from 'lucide-react';
import Avatar from '../ui/Avatar';

const SendInvitationModalContent = ({ onClose, onSend, onSendByUserId, onSearchUsers, isProcessing, t }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [email, setEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [error, setError] = useState('');
  // Booleano, no el texto traducido: `t` viene por props y meterlo en las
  // dependencias del efecto de busqueda relanzaria la peticion.
  const [searchFailed, setSearchFailed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchTimerRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const onSearchUsersRef = useRef(onSearchUsers);
  const highlightedIndexRef = useRef(highlightedIndex);
  const showDropdownRef = useRef(showDropdown);
  const searchResultsRef = useRef(searchResults);
  // A que busqueda pertenecen los resultados que hay en memoria
  const resultsQueryRef = useRef('');
  // eslint-disable-next-line react-hooks/refs -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
  onSearchUsersRef.current = onSearchUsers;

  // El resaltado se mueve SIEMPRE por aqui, y la ref se escribe a la vez que
  // el estado. Copiarla en el cuerpo del componente la dejaba al dia solo
  // DESPUES de re-renderizar: un `Enter` pisandole los talones al `ArrowDown`
  // la leia todavia en -1 y no seleccionaba a nadie. El listener se registra
  // una sola vez, asi que la ref es su unica fuente. Mismo fallo que FE #440
  // en AddFriendModal, del que este modal es copia.
  const highlight = useCallback((next) => {
    highlightedIndexRef.current = next;
    setHighlightedIndex(next);
  }, []);

  // Igual que `highlight`: el teclado las lee por ref, asi que se escriben en
  // el momento y no al re-renderizar. Copiadas en el cuerpo del componente el
  // hueco era mas estrecho, pero seguia ahi.
  const openDropdown = useCallback((next) => {
    showDropdownRef.current = next;
    setShowDropdown(next);
  }, []);

  // La pestana activa, legible desde el efecto de busqueda sin meterla en sus
  // dependencias; y la busqueda cuyo desplegable cerro el propio usuario.
  const activeTabRef = useRef('search');
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);
  const descartadaRef = useRef('');
  // La busqueda que fallo mientras el usuario estaba en la otra pestana
  const falloPendienteRef = useRef('');

  const putResults = useCallback((next, deQuery = '') => {
    searchResultsRef.current = next;
    resultsQueryRef.current = deQuery;
    setSearchResults(next);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Pulsar una pestana NO es descartar el desplegable: su `mousedown`
        // llega antes que su `click`, asi que contarlo como tal impedia
        // devolver los resultados al volver.
        // Descartar es pulsar Escape o el fondo. Pinchar en el mensaje, en la
        // barra de pestanas o en cualquier otro sitio del propio formulario es
        // seguir usandolo: cierra el desplegable, pero no cuenta como que el
        // usuario lo haya descartado, o la restauracion al volver de la otra
        // pestana no llegaba a ocurrir nunca en el camino mas normal.
        if (showDropdownRef.current && !modalRef.current?.contains(event.target)) {
          descartadaRef.current = resultsQueryRef.current;
        }
        openDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Keyboard navigation for dropdown (document-level to avoid focus issues)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape el PRIMERO de todos: es la unica tecla que cierra el
      // desplegable, y tiene que funcionar aunque el foco se haya ido al
      // mensaje —se llega tabulando, sin ningun clic que lo cierre— y aunque la
      // busqueda no haya devuelto a nadie, que deja el desplegable abierto con
      // el aviso y la guarda de mas abajo pide lista con elementos.
      if (e.key === 'Escape' && showDropdownRef.current) {
        descartadaRef.current = resultsQueryRef.current;
        openDropdown(false);
        highlight(-1);
        return;
      }

      // El listener es de `document` a proposito, para que las flechas
      // funcionen sin tener que enfocar el desplegable. Pero eso mismo hacia
      // que se comiera las flechas y el Enter de quien estaba escribiendo el
      // mensaje: si el foco esta en otro campo de escritura, el teclado es
      // suyo, no del desplegable.
      const enfocado = document.activeElement;
      const escribiendoEnOtroSitio =
        enfocado &&
        enfocado !== searchInputRef.current &&
        (enfocado.tagName === 'TEXTAREA' ||
          enfocado.tagName === 'INPUT' ||
          enfocado.isContentEditable);
      if (escribiendoEnOtroSitio) return;

      if (!showDropdownRef.current || searchResultsRef.current.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        const prev = highlightedIndexRef.current;
        highlight(prev < len - 1 ? prev + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const len = searchResultsRef.current.length;
        const prev = highlightedIndexRef.current;
        highlight(prev > 0 ? prev - 1 : len - 1);
      } else if (e.key === 'Enter') {
        const idx = highlightedIndexRef.current;
        if (idx >= 0 && idx < searchResultsRef.current.length) {
          e.preventDefault();
          const user = searchResultsRef.current[idx];
          setSelectedUser(user);
          setSearchQuery('');
          openDropdown(false);
          setError('');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [highlight, openDropdown]);

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
      // Invalida lo que este en vuelo: sin esto, una respuesta tardia
      // aterrizaba sobre el campo ya vacio —la buena reabriendo resultados de
      // una busqueda que ya no se lee, y la mala plantando el aviso rojo bajo
      // un buscador en blanco—.
      searchRequestIdRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      putResults([]);
      openDropdown(false);
      setIsSearching(false);
      setSearchFailed(false);
      // Como en el camino de error: sin esto el `aria-activedescendant` se
      // queda apuntando a una opcion que ya no esta en el DOM.
      highlight(-1);
      return;
    }

    setIsSearching(true);
    setSearchFailed(false);
    falloPendienteRef.current = '';
    searchRequestIdRef.current += 1;
    const currentRequestId = searchRequestIdRef.current;
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await onSearchUsersRef.current(trimmed);
        if (currentRequestId !== searchRequestIdRef.current) return;
        putResults(results, trimmed);
        // Una busqueda nueva borra el descarte anterior: guardarlo por texto y
        // no limpiarlo dejaba esa cadena envenenada para siempre —quien pulso
        // Escape una vez sobre «Jo» ya no podia recuperar ningun «Jo» futuro
        // al volver de la otra pestana—.
        descartadaRef.current = '';
        // Solo si seguimos en la busqueda: si el usuario ya se fue a la pestana
        // de correo, abrirlo aqui resucita el listener de `document` y le come
        // el Enter del formulario —y le selecciona a alguien sin decirselo—.
        openDropdown(activeTabRef.current === 'search');
        highlight(-1);
      } catch {
        if (currentRequestId !== searchRequestIdRef.current) return;
        // Cerrado, no «vacio»: dejarlo abierto enseñaba el aviso de «no se ha
        // encontrado a nadie» para lo que en realidad fue un error de red. Y
        // con un mensaje propio, que si no la pantalla se queda igual que si
        // nunca hubieras buscado y lo natural es reescribir y volver a fallar.
        // Si el usuario ya se fue a la otra pestana, el aviso no se pinta ahi
        // —le saltaria a la cara denunciando una busqueda que dejo atras—,
        // pero se guarda: al volver se levanta, que si no se queda el campo
        // escrito y sin lista, sin aviso y sin error, que es justo el silencio
        // que este cambio viene a quitar.
        const enBusqueda = activeTabRef.current === 'search';
        falloPendienteRef.current = enBusqueda ? '' : trimmed;
        setSearchFailed(enBusqueda);
        putResults([]);
        openDropdown(false);
        // Simetrico con el camino de exito: sin esto el `aria-activedescendant`
        // se queda apuntando a una opcion que ya no esta en el DOM, y un lector
        // de pantalla anuncia algo que no existe.
        highlight(-1);
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
  }, [searchQuery, highlight, openDropdown, putResults]);

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
    openDropdown(false);
    setError('');
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    putResults([]);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    highlight(-1);
    activeTabRef.current = tab;
    if (tab !== 'search') {
      // Al salir de la busqueda hay que cerrar el desplegable: su marcado
      // desaparece con la pestana pero su estado no, y el listener de teclado
      // es de `document`, asi que en la pestana de correo se tragaba el Enter y
      // las flechas del mensaje.
      openDropdown(false);
      return;
    }
    // Al volver se recupera lo que ya se habia encontrado —sigue en memoria, no
    // hace falta repetir la peticion—, porque el campo conservaba el texto y no
    // habia forma de ver los resultados otra vez sin editarlo. Con dos
    // condiciones: que el usuario no lo hubiera cerrado el mismo, y que la
    // lista sea de la busqueda que se lee ahora en el campo —si la cambio y hay
    // una peticion en vuelo, resucitar la anterior le ofreceria a alguien que
    // no ha buscado—.
    // Se devuelve lo que corresponda a lo que se lee en el campo —vacio
    // tambien, que entonces toca el aviso de «no se ha encontrado a nadie»,
    // que depende de esto mismo—, salvo que el usuario cerrara el desplegable
    // de esa misma busqueda: eso si se respeta.
    const consulta = searchQuery.trim();
    if (falloPendienteRef.current === consulta && consulta.length >= 2) {
      falloPendienteRef.current = '';
      setSearchFailed(true);
    }
    openDropdown(
      consulta.length >= 2 &&
        resultsQueryRef.current === consulta &&
        descartadaRef.current !== consulta
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md">
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
                  <Avatar userId={selectedUser.id} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {nombreVisible(selectedUser)}
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
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setError(''); }}
                      placeholder={t('send.searchPlaceholder')}
                      disabled={isProcessing}
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                                    ref={searchInputRef}
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
                          onMouseEnter={() => highlight(index)}
                          className={`w-full px-3 py-2 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                            index === highlightedIndex ? 'bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                          role="option"
                          aria-selected={index === highlightedIndex}
                          data-testid={`search-result-${user.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar userId={user.id} size="sm" />
                            {/* `truncate` no basta en un hijo de flex: sin `min-w-0`
                                su ancho mínimo es el del contenido, así que un
                                nombre largo desborda en vez de recortarse */}
                            {/* Gemelo de AddFriendModal: los dos consumen la
                                misma busqueda, que desde BE #239 casa tambien
                                por alias. Sin el nombre real debajo, una
                                busqueda por apodo devuelve filas donde no
                                aparece por ningun lado lo que se escribio */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {nombreVisible(user)}
                              </p>
                              {nombreRealSiAporta(user) && (
                                <p className="text-xs text-gray-500 truncate">
                                  {nombreRealSiAporta(user)}
                                </p>
                              )}
                            </div>
                          </div>
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

              {searchFailed && (
                <p role="alert" className="text-sm text-red-600 mt-1" data-testid="search-error">{t('send.searchFailed')}</p>
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
