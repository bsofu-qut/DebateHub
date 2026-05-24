const express = require('express');
const {
    getDebates,
    getDebate,
    createDebate,
    updateDebate,
    deleteDebate,
    joinDebate,
    createDebatePost,
    voteOnDebatePost,
} = require('../controllers/debateController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getDebates).post(protect, createDebate);
router.get('/:id', protect, getDebate);
router.route('/:id').put(protect, updateDebate).delete(protect, deleteDebate);
router.post('/:id/join', protect, joinDebate);
router.post('/:id/posts', protect, createDebatePost);
router.post('/:id/posts/:postId/vote', protect, voteOnDebatePost);

module.exports = router;
