const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        topic: { type: String, required: true, trim: true },
        category: {
            type: String,
            enum: ['Academic', 'Civics', 'Education', 'Ethics', 'Policy'],
            default: 'Policy',
        },
        description: { type: String, required: true, trim: true },
        position: { type: String, enum: ['Affirmative', 'Negative', 'Open'], default: 'Open' },
        format: { type: String, enum: ['Oxford', 'Lincoln-Douglas', 'Parliamentary', 'Panel'], default: 'Oxford' },
        scheduledFor: { type: Date, required: true },
        venue: { type: String, default: 'Online' },
        status: { type: String, enum: ['Open', 'Closing soon', 'Closed'], default: 'Open' },
        argumentCount: { type: Number, default: 0, min: 0 },
        voteCount: { type: Number, default: 0, min: 0 },
        maxParticipants: { type: Number, default: 8, min: 2 },
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Debate', debateSchema);
