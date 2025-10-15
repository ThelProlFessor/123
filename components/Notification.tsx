
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/AppContext';

const Notification: React.FC = () => {
  const { notification } = useContext(AppContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 4700); // Start fade out 300ms before it's removed
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  if (!notification) return null;

  const baseClasses = "fixed bottom-5 right-5 p-4 rounded-lg shadow-2xl text-white transition-all duration-300 ease-in-out z-50";
  const typeClasses = notification.type === 'success' ? 'bg-success' : 'bg-danger';
  const visibilityClasses = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <div className={`${baseClasses} ${typeClasses} ${visibilityClasses}`}>
      <div className="flex items-center">
        <span className="font-semibold">{notification.type === 'success' ? 'Success' : 'Error'}:</span>
        <p className="ml-2">{notification.message}</p>
      </div>
    </div>
  );
};

export default Notification;
