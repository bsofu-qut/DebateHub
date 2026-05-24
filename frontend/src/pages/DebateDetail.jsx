import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../axiosConfig';
import { useAuth } from '../context/AuthContext';

const PostModal = ({ mode, debateTitle, parentPost, onClose, onSubmit }) => {
  const [content, setContent] = useState('');
  const isReply = Boolean(parentPost);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(content);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card post-modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>x</button>
        <div className="screen-header compact-header">
          <span className="logo-tile">D</span>
          <div>
            <h1>{debateTitle}</h1>
            <p>
              {isReply
                ? `You are replying to ${parentPost.author?.name || 'this post'}`
                : `You are posting an argument ${mode.toLowerCase()}ing this idea.`}
            </p>
          </div>
        </div>
        {isReply && (
          <blockquote className="reply-context">
            {parentPost.content}
          </blockquote>
        )}
        <form className="post-form" onSubmit={handleSubmit}>
          <textarea
            autoFocus
            placeholder="Type your argument here"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
          />
          <div className="card-actions">
            <button type="submit" className="button button-primary">Post</button>
            <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
};

const VoteButtons = ({ post, onVote }) => (
  <>
    <button
      className={`vote-pill ${post.currentUserVote === 'upvote' ? 'vote-pill-active' : ''}`}
      onClick={() => onVote(post._id, 'upvote')}
      type="button"
    >
      ▲ {post.upvotes || 0}
    </button>
    <button
      className={`vote-pill ${post.currentUserVote === 'downvote' ? 'vote-pill-active' : ''}`}
      onClick={() => onVote(post._id, 'downvote')}
      type="button"
    >
      ▼ {post.downvotes || 0}
    </button>
  </>
);

const DebatePost = ({ post, onReply, onVote, canReply }) => {
  return (
    <article className={`discussion-card ${post.stance === 'Challenge' ? 'challenge-card' : ''}`}>
      <span className={`vertical-chip ${post.stance === 'Challenge' ? 'chip-warn' : 'chip-open'}`}>
        {post.stance}
      </span>
      <p>
        <strong>{post.author?.name || 'Participant'}:</strong> {post.content}
      </p>
      <div className="card-actions">
        <VoteButtons post={post} onVote={onVote} />
        <button className="button button-secondary" onClick={() => onReply(post)} disabled={!canReply}>Reply</button>
      </div>
      {!!post.replies?.length && (
        <div className="reply-thread">
          {post.replies.map((reply) => (
            <article key={reply._id} className="reply-card">
              <span className={`status-pill ${reply.stance === 'Challenge' ? 'status-closing-soon' : 'status-open'}`}>
                Reply - {reply.stance}
              </span>
              <p>
                <strong>{reply.author?.name || 'Participant'}:</strong> {reply.content}
              </p>
              <div className="card-actions">
                <VoteButtons post={reply} onVote={onVote} />
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
};

const DebateDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debate, setDebate] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDebate = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`/api/debates/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setDebate(response.data.debate);
        setPosts(response.data.posts);
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to load debate.');
        navigate('/debates');
      } finally {
        setLoading(false);
      }
    };

    fetchDebate();
  }, [id, navigate, user]);

  const replaceVotedPost = (currentPosts, updatedPost) => {
    return currentPosts.map((post) => {
      if (post._id === updatedPost._id) {
        return { ...post, ...updatedPost, replies: post.replies || [] };
      }

      return {
        ...post,
        replies: (post.replies || []).map((reply) =>
          reply._id === updatedPost._id ? { ...reply, ...updatedPost } : reply
        ),
      };
    });
  };

  const handleVote = async (postId, voteType) => {
    try {
      const response = await axiosInstance.post(`/api/debates/${id}/posts/${postId}/vote`, { voteType }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setPosts((currentPosts) => replaceVotedPost(currentPosts, response.data));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record vote.');
    }
  };

  const handlePostSubmit = async (content) => {
    const payload = {
      content,
      stance: modalState.mode,
      parentPost: modalState.parentPost?._id,
    };

    try {
      const response = await axiosInstance.post(`/api/debates/${id}/posts`, payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (payload.parentPost) {
        setPosts((currentPosts) =>
          currentPosts.map((post) =>
            post._id === payload.parentPost
              ? { ...post, replies: [...(post.replies || []), response.data] }
              : post
          )
        );
      } else {
        setPosts((currentPosts) => [...currentPosts, response.data]);
      }
      setModalState(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to post argument.');
    }
  };

  if (loading) {
    return <main className="content-column detail-column"><div className="loading-state">Loading debate...</div></main>;
  }

  if (!debate) return null;
  const isClosed = debate.status === 'Closed';

  const supportTotal = posts.filter((post) => post.stance === 'Support').length;
  const challengeTotal = posts.filter((post) => post.stance === 'Challenge').length;
  const totalPosts = supportTotal + challengeTotal;
  const supportPercent = totalPosts ? Math.round((supportTotal / totalPosts) * 100) : 0;
  const challengePercent = totalPosts ? 100 - supportPercent : 0;

  return (
    <main className="detail-column">
      <header className="screen-header">
        <span className="logo-tile">D</span>
        <div>
          <h1>{debate.title}</h1>
          <p>Live debate - closes {new Date(debate.scheduledFor).toLocaleDateString('en-AU')}</p>
        </div>
      </header>

      <section className="debate-focus-card">
        <span className={`vertical-chip ${debate.status === 'Closing soon' ? 'chip-danger' : 'chip-open'}`}>
          {debate.status}
        </span>
        <h2>{debate.topic || debate.title}</h2>
        <p>{debate.description}</p>
        <div className="position-metrics">
          <span className="metric-bubble support-bubble">{supportPercent}% Support</span>
          <span className="metric-bubble challenge-bubble">{challengePercent}% Challenge</span>
        </div>
        <div className="card-actions">
          <button className="button button-primary" onClick={() => setModalState({ mode: 'Support' })} disabled={isClosed}>
            Support this!
          </button>
          <button className="button button-secondary" onClick={() => setModalState({ mode: 'Challenge' })} disabled={isClosed}>
            Challenge this!
          </button>
        </div>
        {isClosed && <p className="closed-note">This debate is closed, so new support and challenge posts are disabled.</p>}
      </section>

      <section className="discussion-list">
        {posts.length ? (
          posts.map((post) => (
            <DebatePost
              key={post._id}
              post={post}
              onReply={(parentPost) => {
                if (!isClosed) setModalState({ mode: parentPost.stance, parentPost });
              }}
              onVote={handleVote}
              canReply={!isClosed}
            />
          ))
        ) : (
          <div className="empty-state">
            {isClosed ? 'No posts were added before this debate closed.' : 'No posts yet. Start the discussion with support or challenge.'}
          </div>
        )}
      </section>

      <Link to="/debates" className="button button-secondary back-link">Back to debates</Link>

      {modalState && (
        <PostModal
          mode={modalState.mode}
          parentPost={modalState.parentPost}
          debateTitle={debate.title}
          onClose={() => setModalState(null)}
          onSubmit={handlePostSubmit}
        />
      )}
    </main>
  );
};

export default DebateDetail;
