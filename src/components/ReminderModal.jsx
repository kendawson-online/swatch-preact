import { useState, useEffect } from 'preact/hooks';
import { normalizeBeats } from '../utils/swatchTime';
import { computeReminderDate } from '../utils/reminderTime';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

export function ReminderModal({ onEventSave, modalRef, selectedEvent }) {
  const [reminderData, setReminderData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '', // can be either standard time or Swatch time
    swatchTime: '' // for direct Swatch input
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Must have a date
    if (!reminderData.startDate) newErrors.startDate = 'Please choose a date for the reminder.';

    // Must have either a startTime or swatchTime
    if (!reminderData.startTime && !reminderData.swatchTime) {
      newErrors.time = 'Enter a clock time or a Swatch (@beats) value.';
    }

    // Compute reminder date to validate it's in the future using shared util
    const reminderDate = computeReminderDate(reminderData);
    if (!reminderDate) {
      newErrors.time = newErrors.time || 'Could not determine a valid reminder time.';
    } else if (reminderDate <= new Date()) {
      newErrors.time = 'Reminder must be scheduled in the future.';
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Request notification permission proactively when the user schedules a reminder.
    // This ensures the permission prompt appears when the reminder is created, not when it fires.
    try {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        try {
          showNotification('Reminder scheduled', {
            body: reminderData.title || 'Your reminder has been scheduled.',
            tag: `reminder-scheduled-${Date.now()}`
          });
        } catch (e) {
          // ignore notification failures
        }
      }
    } catch (e) {
      // ignore permission errors
    }

    if (typeof onEventSave === 'function') onEventSave(reminderData);

    // After successful save, hide this modal and re-open the Reminders modal.
    try {
      const el = modalRef && modalRef.current;
      if (el && window.bootstrap && window.bootstrap.Modal) {
        const inst = window.bootstrap.Modal.getOrCreateInstance(el);
        inst.hide();
      }
      setTimeout(() => {
        try {
          const parentEl = document.getElementById('remindersModal');
          if (parentEl && window.bootstrap && window.bootstrap.Modal) {
            const pinst = window.bootstrap.Modal.getOrCreateInstance(parentEl);
            pinst.show();
          }
        } catch (e) {}
      }, 120);
    } catch (e) {}
    // Reset form
    setReminderData({
      title: '',
      description: '',
      startDate: '',
      startTime: '',
      swatchTime: '',
    });
  };

  useEffect(() => {
    if (selectedEvent && selectedEvent.id) {
      // populate for edit
      setReminderData({
        title: selectedEvent.title || '',
        description: selectedEvent.description || '',
        startDate: selectedEvent.startDate || '',
        startTime: selectedEvent.startTime || '',
        swatchTime: selectedEvent.swatchTime || '',
        id: selectedEvent.id
      });
    } else {
      setReminderData({ title: '', description: '', startDate: '', startTime: '', swatchTime: '' });
    }
    // no special hidden handler needed when using Bootstrap toggle attributes
    return undefined;
  }, [selectedEvent]);

  const handleChange = (field, value) => {
    setReminderData({ ...reminderData, [field]: value });
  };

  return (
    <div ref={modalRef} className="modal fade" id="reminderModal" tabIndex="-1" aria-labelledby="reminderModalLabel" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="reminderModalLabel">Create Reminder</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={reminderData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  value={reminderData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                ></textarea>
              </div>
              <div className="mb-3">
                <label className="form-label">Start Date *</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={reminderData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
                {errors.startDate && (
                  <div className="text-danger small mt-1">{errors.startDate}</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Start Time *</label>
                <input 
                  type="time" 
                  className="form-control mb-2"
                  value={reminderData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  required={!reminderData.swatchTime}
                />
                {errors.time && (
                  <div className="text-danger small mt-1">{errors.time}</div>
                )}
                <div className="form-text mb-2">Or enter Swatch Internet Time (@beats):</div>
                <div className="input-group">
                  <span className="input-group-text" id="reminder-beats-addon">@</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 544 or 544.35"
                    aria-describedby="reminder-beats-addon"
                    value={reminderData.swatchTime}
                    onChange={(e) => handleChange('swatchTime', normalizeBeats(e.target.value))}
                    required={!reminderData.startTime}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#remindersModal">Cancel</button>
              <button type="submit" className="btn btn-primary">Create Reminder</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
