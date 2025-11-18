'use client';

import { createContext, useContext, ReactNode } from 'react';

type Messages = Record<string, any>;

const I18nContext = createContext<{ locale: string; messages: Messages }>({
  locale: 'en',
  messages: {},
});

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const { messages } = useContext(I18nContext);
  
  return (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const keys = fullKey.split('.');
    let value: any = messages;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return fullKey;
      }
    }
    
    return typeof value === 'string' ? value : fullKey;
  };
}

export function useLocale() {
  const { locale } = useContext(I18nContext);
  return locale;
}

