const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'debatehub-test-secret';

const app = require('../server');
const User = require('../models/User');
const Debate = require('../models/Debate');
const DebatePost = require('../models/DebatePost');

chai.use(chaiHttp);
const { expect } = chai;

const tokenFor = (id = 'user-1') => jwt.sign({ id }, process.env.JWT_SECRET);

const authenticateAs = (overrides = {}) => {
    const user = {
        id: overrides.id || 'user-1',
        _id: overrides.id || 'user-1',
        name: overrides.name || 'Student User',
        email: overrides.email || 'student@example.com',
        role: overrides.role || 'student',
    };

    sinon.stub(User, 'findById').returns({
        select: sinon.stub().withArgs('-password').resolves(user),
    });

    return user;
};

describe('DebateHub API automation tests', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('exports an Express app instance for automated API testing', () => {
        expect(app).to.have.property('listen').that.is.a('function');
    });

    it('prevents the reserved admin email from registering as a normal user', async () => {
        const findUser = sinon.stub(User, 'findOne');

        const res = await chai.request(app)
            .post('/api/auth/register')
            .send({
                name: 'Burak Sofu',
                email: 'burak.sofu@gmail.com',
                password: 'burak.sofu@gmail.com',
            });

        expect(res).to.have.status(403);
        expect(res.body.message).to.equal('Admin accounts cannot be registered');
        expect(findUser.notCalled).to.equal(true);
    });

    it('allows the reserved admin user to log in and receive an admin token', async () => {
        sinon.stub(User, 'findOne').resolves(null);
        const createUser = sinon.stub(User, 'create').callsFake(async (payload) => ({
            id: 'admin-1',
            ...payload,
        }));

        const res = await chai.request(app)
            .post('/api/auth/login')
            .send({
                email: 'burak.sofu@gmail.com',
                password: 'burak.sofu@gmail.com',
            });

        expect(res).to.have.status(200);
        expect(res.body).to.include({
            id: 'admin-1',
            name: 'Burak Sofu',
            email: 'burak.sofu@gmail.com',
            role: 'admin',
        });
        expect(res.body.token).to.be.a('string');
        expect(createUser.calledOnceWithMatch({ role: 'admin' })).to.equal(true);
    });

    it('creates new debates in Open status even when another status is submitted', async () => {
        const admin = authenticateAs({ id: 'admin-1', role: 'admin' });
        let createdPayload;

        sinon.stub(Debate, 'create').callsFake(async (payload) => {
            createdPayload = payload;
            const debate = {
                id: 'debate-1',
                _id: 'debate-1',
                ...payload,
            };
            debate.populate = sinon.stub().resolves(debate);
            return debate;
        });

        const res = await chai.request(app)
            .post('/api/debates')
            .set('Authorization', `Bearer ${tokenFor(admin.id)}`)
            .send({
                title: 'AI in assessment',
                topic: 'Should AI tools be allowed in university assessment?',
                category: 'Academic',
                description: 'A structured debate about academic integrity and AI.',
                scheduledFor: '2026-06-15T09:00:00.000Z',
                maxParticipants: 8,
                status: 'Closed',
            });

        expect(res).to.have.status(201);
        expect(createdPayload.status).to.equal('Open');
        expect(createdPayload.createdBy).to.equal(admin.id);
        expect(createdPayload.participants).to.deep.equal([]);
        expect(createdPayload.followers).to.deep.equal([]);
    });

    it('rejects posts on closed debates', async () => {
        const student = authenticateAs({ id: 'student-1' });
        sinon.stub(Debate, 'findById').resolves({
            id: 'debate-1',
            _id: 'debate-1',
            status: 'Closed',
        });
        const createPost = sinon.stub(DebatePost, 'create');

        const res = await chai.request(app)
            .post('/api/debates/debate-1/posts')
            .set('Authorization', `Bearer ${tokenFor(student.id)}`)
            .send({
                stance: 'Support',
                content: 'Closed debates should be read-only.',
            });

        expect(res).to.have.status(400);
        expect(res.body.message).to.equal('This debate is closed for new posts');
        expect(createPost.notCalled).to.equal(true);
    });

    it('allows one vote per user and switches vote direction without double counting', async () => {
        const student = authenticateAs({ id: 'student-1' });
        const post = {
            id: 'post-1',
            _id: 'post-1',
            author: student.id,
            upvotes: 0,
            downvotes: 0,
            votes: [],
            save: sinon.stub().callsFake(async function savePost() {
                return this;
            }),
            populate: sinon.stub().resolves(),
        };

        sinon.stub(DebatePost, 'findOne').resolves(post);

        const firstVote = await chai.request(app)
            .post('/api/debates/debate-1/posts/post-1/vote')
            .set('Authorization', `Bearer ${tokenFor(student.id)}`)
            .send({ voteType: 'upvote' });

        const duplicateVote = await chai.request(app)
            .post('/api/debates/debate-1/posts/post-1/vote')
            .set('Authorization', `Bearer ${tokenFor(student.id)}`)
            .send({ voteType: 'upvote' });

        const switchedVote = await chai.request(app)
            .post('/api/debates/debate-1/posts/post-1/vote')
            .set('Authorization', `Bearer ${tokenFor(student.id)}`)
            .send({ voteType: 'downvote' });

        expect(firstVote).to.have.status(200);
        expect(firstVote.body.upvotes).to.equal(1);
        expect(firstVote.body.downvotes).to.equal(0);
        expect(firstVote.body.currentUserVote).to.equal('upvote');

        expect(duplicateVote).to.have.status(200);
        expect(duplicateVote.body.upvotes).to.equal(1);
        expect(duplicateVote.body.downvotes).to.equal(0);
        expect(duplicateVote.body.currentUserVote).to.equal('upvote');

        expect(switchedVote).to.have.status(200);
        expect(switchedVote.body.upvotes).to.equal(0);
        expect(switchedVote.body.downvotes).to.equal(1);
        expect(switchedVote.body.currentUserVote).to.equal('downvote');
    });
});
