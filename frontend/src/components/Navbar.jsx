import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthScreen = ['/', '/login', '/register'].includes(location.pathname) && !user;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <Link to="/" className="brand-mark">
        <span className="brand-icon">DH</span>
        <span>DebateHub</span>
      </Link>
      {!isAuthScreen && (
        <div className="nav-actions">
        {user ? (
          <>
            <span className="view-label">{user.role === 'admin' ? 'Admin View' : 'User View'}</span>
            <button onClick={handleLogout} className="button button-ghost">
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">Login</NavLink>
            <Link to="/register" className="button button-primary">
              Register
            </Link>
          </>
        )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
