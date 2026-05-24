const mongoose = require('mongoose');

const debatePostSchema = new mongoose.Schema(
    {
        debate: { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        parentPost: { type: mongoose.Schema.Types.ObjectId, ref: 'DebatePost', default: null },
        stance: { type: String, enum: ['Support', 'Challenge'], required: true },
        content: { type: String, required: true, trim: true },
        upvotes: { type: Number, default: 0, min: 0 },
        downvotes: { type: Number, default: 0, min: 0 },
        votes: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('DebatePost', debatePostSchema);
