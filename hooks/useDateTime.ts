
import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

const formatDateTime = (date: Date, lang: 'en' | 'fa'): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  
  // For Persian, use the 'fa-IR' locale with the Persian numbering system
  const locale = lang === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US';
  
  let formatted = new Intl.DateTimeFormat(locale, options).format(date);

  // Custom separator for English
  if (lang === 'en') {
      formatted = formatted.replace(' at ', '  |  ');
  }

  return formatted;
};

export const useDateTime = () => {
  const { language } = useContext(AppContext);
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  return formatDateTime(dateTime, language);
};
