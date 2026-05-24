import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../axiosConfig';
import { Link } from 'react-router-dom';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/auth/login', formData);
      login(response.data);
      navigate('/debates');
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  return (
    <main className="auth-shell">
      <form onSubmit={handleSubmit} className="auth-card">
        <span className="logo-tile">D</span>
        <h1>Welcome to DebateHub</h1>
        <p>Join structured academic debates, support claims with evidence, and vote on arguments.</p>
        <label>Email</label>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <label>Password</label>
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <button type="submit" className="button button-primary button-wide">
          Sign in
        </button>
        <Link to="/register" className="button button-secondary button-wide">Create account</Link>
        <small>Role-aware access: participants and admins</small>
      </form>
    </main>
  );
};

export default Login;
