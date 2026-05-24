import { useState, useEffect } from 'react';
import axiosInstance from '../axiosConfig';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Tasks = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [debates, setDebates] = useState([]);
  const [editingDebate, setEditingDebate] = useState(null);
  const [deletingDebate, setDeletingDebate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard');

  useEffect(() => {
    const fetchDebates = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await axiosInstance.get('/api/debates', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setDebates(response.data);
      } catch (error) {
        alert('Failed to fetch debates.');
      } finally {
        setLoading(false);
      }
    };

    fetchDebates();
  }, [user]);

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="logo-tile">D</span>
          <h1>Welcome to DebateHub</h1>
          <p>Join structured academic debates, support claims with evidence, and vote on arguments.</p>
          <Link to="/login" className="button button-primary button-wide">Sign in</Link>
          <Link to="/register" className="button button-secondary button-wide">Create account</Link>
        </section>
      </main>
    );
  }

  const isFollowingDebate = (debate) => {
    const creatorId = debate.createdBy?._id || debate.createdBy;
    const followers = Array.isArray(debate.followers) ? debate.followers : debate.participants || [];
    return creatorId !== user.id && followers.some((follower) => follower._id === user.id || follower === user.id);
  };
  const isAdmin = user.role === 'admin';
  const showAdminPanel = isAdmin && viewMode === 'dashboard';
  const showUserDashboard = !isAdmin && viewMode === 'dashboard';

  const visibleDebates = debates.filter((debate) => {
    const matchesView = showUserDashboard ? isFollowingDebate(debate) : true;
    const matchesStatus = status === 'All' || debate.status === status;
    const matchesSearch = debate.title.toLowerCase().includes(search.toLowerCase())
      || debate.description.toLowerCase().includes(search.toLowerCase())
      || debate.category.toLowerCase().includes(search.toLowerCase());
    return matchesView && matchesStatus && matchesSearch;
  });

  const closeDebateModal = () => {
    setEditingDebate(null);
    setShowCreateModal(false);
  };

  const handleDeleteDebate = async () => {
    if (!deletingDebate) return;

    try {
      await axiosInstance.delete(`/api/debates/${deletingDebate._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setDebates((currentDebates) => currentDebates.filter((debate) => debate._id !== deletingDebate._id));
      setDeletingDebate(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete debate.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="app-layout">
      <aside className="side-rail">
        <h2>DebateHub</h2>
        <button type="button" className={`rail-link rail-button ${viewMode === 'dashboard' ? 'active' : ''}`} onClick={() => setViewMode('dashboard')}>
          Dashboard
        </button>
        <button type="button" className={`rail-link rail-button ${viewMode === 'debates' ? 'active' : ''}`} onClick={() => setViewMode('debates')}>
          Debates
        </button>
        <button type="button" className="rail-link rail-button" onClick={handleLogout}>Logout</button>
      </aside>

      <section className={showAdminPanel ? 'admin-content' : 'content-column'}>
        <header className="screen-header">
          <span className="logo-tile">D</span>
          <div>
            <h1>
              {showAdminPanel
                ? 'Admin Panel - Debate Management'
                : showUserDashboard
                  ? 'User Dashboard'
                  : 'Explore debates'}
            </h1>
            <p>
              {showAdminPanel
                ? 'You can manage debates here'
                : showUserDashboard
                  ? 'You can see debates you are following below.'
                  : 'Find active topics and join the discussion.'}
            </p>
          </div>
        </header>

        {!showAdminPanel && (
          <section className="filter-panel">
            <label>Search debates</label>
            <input
              type="search"
              placeholder="AI ethics, climate policy..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="chip-filters">
              {['All', 'Open', 'Closing soon', 'Closed'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`filter-chip ${status === filter ? 'selected' : ''}`}
                  onClick={() => setStatus(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </section>
        )}

        {showAdminPanel ? (
          <>
            <section className="debate-list-panel">
              <div className="list-toolbar">
                <div>
                  <h2>Debate list</h2>
                  <p>Each debate is listed as a table row. Edit opens the existing edit form.</p>
                </div>
                <button className="button button-secondary" onClick={() => setShowCreateModal(true)}>+ Create debate</button>
              </div>
              {loading ? (
                <div className="loading-state">Loading debates...</div>
              ) : (
                <TaskList
                  debates={visibleDebates}
                  setDebates={setDebates}
                  setEditingDebate={setEditingDebate}
                  setDeletingDebate={setDeletingDebate}
                  variant="admin"
                />
              )}
            </section>
          </>
        ) : (
          <section className="debate-list-panel clear-panel">
            {loading ? (
              <div className="loading-state">Loading debates...</div>
            ) : (
              <TaskList debates={visibleDebates} setDebates={setDebates} setEditingDebate={setEditingDebate} />
            )}
          </section>
        )}

        {showAdminPanel && (showCreateModal || editingDebate) && (
          <div className="modal-backdrop" role="presentation" onMouseDown={closeDebateModal}>
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="debate-form-title" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeDebateModal}>x</button>
              <TaskForm
                debates={debates}
                setDebates={setDebates}
                editingDebate={editingDebate}
                setEditingDebate={setEditingDebate}
                onClose={closeDebateModal}
              />
            </section>
          </div>
        )}

        {showAdminPanel && deletingDebate && (
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeletingDebate(null)}>
            <section className="modal-card modal-card-small" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDeletingDebate(null)}>x</button>
              <div className="modal-preview">
                <span className="vertical-chip chip-danger">Delete</span>
                <h2 id="delete-title">Delete debate?</h2>
                <p>
                  This will permanently remove "{deletingDebate.title}", its arguments, votes and reports from the system.
                  This action cannot be undone.
                </p>
                <div className="card-actions">
                  <button className="button button-secondary" onClick={() => setDeletingDebate(null)}>Cancel</button>
                  <button className="button button-danger" onClick={handleDeleteDebate}>Delete topic</button>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
};

export default Tasks;
