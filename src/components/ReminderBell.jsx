import { useState, useEffect } from 'preact/hooks';
import { showNotification } from '../utils/notifications';

export function ReminderBell({ events, darkTheme, onDismiss, mute }) {
  const [activeReminders, setActiveReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);

  useEffect(() => {
    // Check for events that need reminders. Use functional updates to avoid
    // reading stale state and prevent effect re-creation loops.
      const checkReminders = () => {
      const now = new Date();
      events.forEach(event => {
        if (event.reminderTime && !event.dismissed) {
          const reminderTime = new Date(event.reminderTime);
          if (now >= reminderTime) {
            setActiveReminders(prev => {
                if (prev.find(r => r.id === event.id)) return prev;
                const newReminder = { ...event, acknowledged: false };
                // Keep current reminder as-is (show oldest first). Only set if none
                setCurrentReminder(curr => curr || newReminder);
                setShowModal(true);
                // attempt to show a system notification (warned at create time)
                try {
                  if (!mute) {
                    showNotification(event.title || 'Reminder', {
                      body: event.description || '',
                      tag: `reminder-${event.id}`
                    });
                  }
                } catch (e) {
                  // ignore
                }
                return [...prev, newReminder];
            });
          }
        }
      });
    };

    // Run immediately and then poll every second.
    checkReminders();
    const interval = setInterval(checkReminders, 1000);
    return () => clearInterval(interval);
  }, [events]);

  // Keep activeReminders in sync with events prop: if an event was removed
  // from storage (e.g. dismissed via RemindersModal), ensure we clear it
  // from the active list and hide the bell/modal when appropriate.
  useEffect(() => {
    if (!events || events.length === 0) {
      setActiveReminders([]);
      setCurrentReminder(null);
      setShowModal(false);
      return;
    }
    const ids = new Set(events.map(e => e.id));
    setActiveReminders(prev => {
      const filtered = prev.filter(r => ids.has(r.id));
      if (filtered.length === 0) {
        setCurrentReminder(null);
        setShowModal(false);
      } else {
        setCurrentReminder(curr => {
          if (!curr) return filtered[0];
          if (!ids.has(curr.id)) return filtered[0];
          return curr;
        });
      }
      return filtered;
    });
  }, [events]);

  const handleOk = () => {
    if (currentReminder) {
      setActiveReminders(prev =>
        prev.map(r => r.id === currentReminder.id ? { ...r, acknowledged: true } : r)
      );
    }
    setShowModal(false);
  };

  const handleDismiss = () => {
    if (!currentReminder) return;

    // remove from internal active list
    setActiveReminders(prev => {
      const remaining = prev.filter(r => r.id !== currentReminder.id);
      // inform parent to remove from storage/state
      if (typeof onDismiss === 'function') onDismiss(currentReminder.id);

      if (remaining.length > 0) {
        // advance to next reminder and keep modal shown
        setCurrentReminder(remaining[0]);
        setShowModal(true);
      } else {
        // no more active reminders -> clear and hide
        setCurrentReminder(null);
        setShowModal(false);
      }
      return remaining;
    });
  };

  const handleBellClick = () => {
    if (activeReminders.length > 0) {
      setCurrentReminder(activeReminders[0]);
      setShowModal(true);
    }
  };

  const hasActiveReminders = activeReminders.length > 0;

  // If there are no active reminders and we're not muted, don't render the bell at all
  if (!hasActiveReminders && !mute) return null;

  const bellClass = darkTheme ? 'bell-dark' : 'bell-light';

  // compute a friendly display time for the current reminder
  let displayTime = '';
  if (currentReminder) {
    if (currentReminder.reminderTime) {
      const d = new Date(currentReminder.reminderTime);
      displayTime = d.toLocaleString();
    } else if (currentReminder.startDate && currentReminder.startTime) {
      try {
        const [y, m, d] = currentReminder.startDate.split('-').map(Number);
        const [hh, mm] = currentReminder.startTime.split(':').map(Number);
        const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
        displayTime = dt.toLocaleString();
      } catch (e) {
        displayTime = `${currentReminder.startDate} ${currentReminder.startTime}`;
      }
    } else {
      displayTime = currentReminder.startDate || currentReminder.startTime || '';
    }
  }

  return (
    <>
      <button 
        className={`btn position-relative ${bellClass}`}
        onClick={handleBellClick}
        title={hasActiveReminders ? 'Reminders' : 'No active reminders'}
        disabled={!hasActiveReminders}
      >
        <i className={`bi ${mute ? 'bi-bell-slash-fill' : (hasActiveReminders ? 'bi-bell-fill' : 'bi-bell')}`}></i>
      </button>

      {showModal && currentReminder && (
        <div className="modal show d-block modal-overlay" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reminder</h5>
              </div>
              <div className="modal-body">
                <h6>{currentReminder.title}</h6>
                <p>{currentReminder.description}</p>
                {displayTime && (
                  <p className="text-muted">
                    <small>{displayTime}</small>
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleOk}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={handleDismiss}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
