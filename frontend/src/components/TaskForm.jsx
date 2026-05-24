import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

const blankDebate = {
  title: '',
  topic: '',
  category: 'Education',
  description: '',
  scheduledFor: '',
  status: 'Open',
};

const TaskForm = ({ debates, setDebates, editingDebate, setEditingDebate, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(blankDebate);

  useEffect(() => {
    if (editingDebate) {
      setFormData({
        title: editingDebate.title || '',
        topic: editingDebate.topic || editingDebate.title || '',
        category: editingDebate.category || 'Education',
        description: editingDebate.description || '',
        scheduledFor: editingDebate.scheduledFor ? editingDebate.scheduledFor.slice(0, 10) : '',
        status: editingDebate.status || 'Open',
      });
    } else {
      setFormData(blankDebate);
    }
  }, [editingDebate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      topic: formData.title,
      status: editingDebate ? formData.status : 'Open',
    };

    try {
      if (editingDebate) {
        const response = await axiosInstance.put(`/api/debates/${editingDebate._id}`, payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setDebates(debates.map((debate) => (debate._id === response.data._id ? response.data : debate)));
      } else {
        const response = await axiosInstance.post('/api/debates', payload, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setDebates([...debates, response.data]);
      }
      setEditingDebate(null);
      setFormData(blankDebate);
      if (onClose) onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save debate.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="panel-form">
      <span className={`vertical-chip ${editingDebate ? 'chip-warn' : 'chip-primary'}`}>
        {editingDebate ? 'Edit' : 'New'}
      </span>
      <h2>{editingDebate ? 'Edit debate' : 'Create debate'}</h2>
      <p className="form-hint">
        {editingDebate
          ? 'Pre-filled fields update the topic information after creation.'
          : 'Guide users toward a structured debate.'}
      </p>
      <input
        type="text"
        placeholder="Topic question"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <div className="form-row">
        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
          <option>Academic</option>
          <option>Civics</option>
          <option>Education</option>
          <option>Ethics</option>
          <option>Policy</option>
        </select>
        <input
          type="date"
          value={formData.scheduledFor}
          onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
          required
        />
      </div>
      {editingDebate && (
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
          <option>Open</option>
          <option>Closing soon</option>
          <option>Closed</option>
        </select>
      )}
      <textarea
        placeholder="Add background, rules, and evidence expectations..."
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
      />
      <button type="submit" className="button button-primary button-wide">
        {editingDebate ? 'Save changes' : 'Publish debate'}
      </button>
      {editingDebate && (
        <button type="button" className="button button-secondary button-wide" onClick={() => {
          setEditingDebate(null);
          if (onClose) onClose();
        }}>
          Cancel
        </button>
      )}
    </form>
  );
};

export default TaskForm;
