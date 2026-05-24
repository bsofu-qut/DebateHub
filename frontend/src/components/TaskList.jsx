import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';
import { Link } from 'react-router-dom';

const formatDate = (date) => {
  if (!date) return 'No closing date';
  return new Date(date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getActivity = (debate) => {
  const argumentsTotal = debate.argumentCount || 0;
  const votesTotal = debate.voteCount || 0;
  return `${argumentsTotal} args - ${votesTotal} votes`;
};

const getFollowers = (debate) => {
  return Array.isArray(debate.followers) ? debate.followers : debate.participants || [];
};

const getStatusChipClass = (status) => {
  if (status === 'Closed') return 'chip-danger';
  if (status === 'Closing soon') return 'chip-warn';
  return 'chip-open';
};

const TaskList = ({ debates, setDebates, setEditingDebate, setDeletingDebate, variant = 'cards' }) => {
  const { user } = useAuth();

  const handleFollow = async (debateId) => {
    try {
      const response = await axiosInstance.post(`/api/debates/${debateId}/join`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setDebates((currentDebates) =>
        currentDebates.map((debate) => (debate._id === response.data._id ? response.data : debate))
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update follow status.');
    }
  };

  if (!debates.length) {
    return <div className="empty-state">No debates match this view yet.</div>;
  }

  if (variant === 'admin') {
    return (
      <div className="admin-table">
        <div className="admin-table-row table-head">
          <span>Debate title</span>
          <span>Category</span>
          <span>Status</span>
          <span>Activity</span>
          <span>Actions</span>
        </div>
        {debates.map((debate) => (
          <div key={debate._id} className="admin-table-row">
            <div>
              <strong>{debate.title}</strong>
              <small>Closes: {formatDate(debate.scheduledFor)}</small>
            </div>
            <span>{debate.category}</span>
            <span className={`status-pill status-${debate.status.toLowerCase().replaceAll(' ', '-')}`}>
              {debate.status}
            </span>
            <span>{getActivity(debate)}</span>
            <div className="table-actions">
              <button onClick={() => setEditingDebate(debate)} className="button button-secondary">Edit</button>
              <button onClick={() => setDeletingDebate(debate)} className="button button-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="debate-list">
      {debates.map((debate) => {
        const creatorId = debate.createdBy?._id || debate.createdBy;
        const hasJoined = creatorId !== user.id && getFollowers(debate).some((follower) => follower._id === user.id || follower === user.id);

        return (
          <article key={debate._id} className="debate-card">
            <div className="card-topline">
              <span className={`vertical-chip ${getStatusChipClass(debate.status)}`}>
                {debate.status}
              </span>
              <span className="activity-text">{getActivity(debate)}</span>
            </div>
            <h3>{debate.title}</h3>
            <p>{debate.description}</p>
            <div className="card-actions">
              <Link to={`/debates/${debate._id}`} className="button button-primary">View debate</Link>
              {user.role !== 'admin' && (
                <button
                  onClick={() => handleFollow(debate._id)}
                  className="button button-secondary"
                  disabled={debate.status === 'Closed'}
                >
                  {hasJoined ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default TaskList;
