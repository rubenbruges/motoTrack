/**
 * Limpia caché y almacenamiento no utilizado de la aplicación
 */
export const clearUnusedCache = async (): Promise<void> => {
  try {
    // Limpiar caché del navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Limpiar localStorage no utilizado (mantener solo datos esenciales)
    const essentialKeys = [
      'supabase.auth.token',
      'sb-' // Prefijo de Supabase
    ];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !essentialKeys.some(essential => key.includes(essential))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limpiar sessionStorage completamente (datos temporales)
    sessionStorage.clear();

    console.log('Cache y almacenamiento no utilizado limpiado exitosamente');
  } catch (error) {
    console.error('Error al limpiar cache:', error);
  }
};

/**
 * Limpia solo el caché del navegador
 */
export const clearBrowserCache = async (): Promise<void> => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
};