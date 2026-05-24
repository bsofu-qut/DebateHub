const Debate = require('../models/Debate');
const DebatePost = require('../models/DebatePost');

const canManageDebate = (debate, user) => {
    return user.role === 'admin' || debate.createdBy.toString() === user.id;
};

const serializePostForUser = (post, userId) => {
    const postObject = post.toObject ? post.toObject() : post;
    const vote = (postObject.votes || []).find((item) => item.user.toString() === userId);
    return {
        ...postObject,
        currentUserVote: vote ? vote.voteType : null,
    };
};

const attachActivityCounts = async (debates) => {
    const debateIds = debates.map((debate) => debate._id);
    const activity = await DebatePost.aggregate([
        { $match: { debate: { $in: debateIds } } },
        {
            $group: {
                _id: '$debate',
                argumentCount: { $sum: 1 },
                voteCount: { $sum: { $add: ['$upvotes', '$downvotes'] } },
            },
        },
    ]);

    const activityByDebate = activity.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
    }, {});

    return debates.map((debate) => {
        const debateObject = debate.toObject();
        const counts = activityByDebate[debate.id] || { argumentCount: 0, voteCount: 0 };
        return {
            ...debateObject,
            argumentCount: counts.argumentCount,
            voteCount: counts.voteCount,
        };
    });
};

const getDebates = async (req, res) => {
    try {
        const debates = await Debate.find({})
            .populate('createdBy', 'name email role')
            .populate('participants', 'name email')
            .populate('followers', 'name email')
            .sort({ scheduledFor: 1 });

        res.json(await attachActivityCounts(debates));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createDebate = async (req, res) => {
    try {
        const debate = await Debate.create({
            ...req.body,
            status: 'Open',
            createdBy: req.user.id,
            participants: [],
            followers: [],
        });

        const populatedDebate = await debate.populate('createdBy', 'name email role');
        res.status(201).json(populatedDebate);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getDebate = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('participants', 'name email')
            .populate('followers', 'name email');

        if (!debate) return res.status(404).json({ message: 'Debate not found' });

        const posts = await DebatePost.find({ debate: debate.id })
            .populate('author', 'name email')
            .sort({ createdAt: 1 });

        const repliesByParent = posts.reduce((groups, post) => {
            if (!post.parentPost) return groups;
            const parentId = post.parentPost.toString();
            return {
                ...groups,
                [parentId]: [...(groups[parentId] || []), post],
            };
        }, {});

        const discussion = posts
            .filter((post) => !post.parentPost)
            .map((post) => ({
                ...serializePostForUser(post, req.user.id),
                replies: (repliesByParent[post.id] || []).map((reply) => serializePostForUser(reply, req.user.id)),
            }));

        const argumentCount = posts.length;
        const voteCount = posts.reduce((total, post) => total + post.upvotes + post.downvotes, 0);

        res.json({
            debate: {
                ...debate.toObject(),
                argumentCount,
                voteCount,
            },
            posts: discussion,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateDebate = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.id);
        if (!debate) return res.status(404).json({ message: 'Debate not found' });
        if (!canManageDebate(debate, req.user)) return res.status(403).json({ message: 'Not authorized' });

        const updatedDebate = await Debate.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
            .populate('createdBy', 'name email role')
            .populate('participants', 'name email')
            .populate('followers', 'name email');

        res.json(updatedDebate);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteDebate = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.id);
        if (!debate) return res.status(404).json({ message: 'Debate not found' });
        if (!canManageDebate(debate, req.user)) return res.status(403).json({ message: 'Not authorized' });

        await DebatePost.deleteMany({ debate: debate.id });
        await debate.deleteOne();
        res.json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const joinDebate = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.id);
        if (!debate) return res.status(404).json({ message: 'Debate not found' });
        if (!['Open', 'Closing soon'].includes(debate.status)) {
            return res.status(400).json({ message: 'This debate is not open for registration' });
        }
        const followers = debate.followers || [];
        const existingFollowerIndex = followers.findIndex((followerId) => followerId.toString() === req.user.id);

        if (existingFollowerIndex >= 0) {
            debate.followers.splice(existingFollowerIndex, 1);
        } else {
            if (followers.length >= debate.maxParticipants) {
                return res.status(400).json({ message: 'This debate is full' });
            }
            debate.followers.push(req.user.id);
        }
        const updatedDebate = await debate.save();
        await updatedDebate.populate('createdBy', 'name email role');
        await updatedDebate.populate('participants', 'name email');
        await updatedDebate.populate('followers', 'name email');

        res.json(updatedDebate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createDebatePost = async (req, res) => {
    try {
        const debate = await Debate.findById(req.params.id);
        if (!debate) return res.status(404).json({ message: 'Debate not found' });
        if (debate.status === 'Closed') {
            return res.status(400).json({ message: 'This debate is closed for new posts' });
        }

        const { stance, content, parentPost } = req.body;
        if (parentPost) {
            const parent = await DebatePost.findOne({ _id: parentPost, debate: debate.id });
            if (!parent) return res.status(404).json({ message: 'Parent post not found' });
        }

        const post = await DebatePost.create({
            debate: debate.id,
            author: req.user.id,
            stance,
            content,
            parentPost: parentPost || null,
        });

        debate.argumentCount += 1;
        await debate.save();

        const populatedPost = await post.populate('author', 'name email');
        res.status(201).json({ ...serializePostForUser(populatedPost, req.user.id), replies: [] });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const voteOnDebatePost = async (req, res) => {
    try {
        const { voteType } = req.body;
        if (!['upvote', 'downvote'].includes(voteType)) {
            return res.status(400).json({ message: 'Invalid vote type' });
        }

        const post = await DebatePost.findOne({ _id: req.params.postId, debate: req.params.id });
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const existingVote = post.votes.find((vote) => vote.user.toString() === req.user.id);

        if (!existingVote) {
            post.votes.push({ user: req.user.id, voteType });
            if (voteType === 'upvote') {
                post.upvotes += 1;
            } else {
                post.downvotes += 1;
            }
        } else if (existingVote.voteType !== voteType) {
            if (existingVote.voteType === 'upvote') {
                post.upvotes = Math.max(post.upvotes - 1, 0);
                post.downvotes += 1;
            } else {
                post.downvotes = Math.max(post.downvotes - 1, 0);
                post.upvotes += 1;
            }
            existingVote.voteType = voteType;
        }

        const updatedPost = await post.save();
        await updatedPost.populate('author', 'name email');
        res.json(serializePostForUser(updatedPost, req.user.id));
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getDebates,
    getDebate,
    createDebate,
    updateDebate,
    deleteDebate,
    joinDebate,
    createDebatePost,
    voteOnDebatePost,
};
