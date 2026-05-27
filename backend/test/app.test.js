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

const createQuery = (result, chainMethods = ['populate', 'sort']) => {
    const query = {
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
        catch: (reject) => Promise.resolve(result).catch(reject),
    };

    chainMethods.forEach((method) => {
        query[method] = sinon.stub().returns(query);
    });

    return query;
};

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

const createDebateDocument = (overrides = {}) => {
    const debate = {
        id: overrides.id || 'debate-1',
        _id: overrides._id || overrides.id || 'debate-1',
        title: overrides.title || 'AI in assessment',
        topic: overrides.topic || 'Should AI tools be allowed in university assessment?',
        category: overrides.category || 'Academic',
        description: overrides.description || 'A structured academic debate.',
        scheduledFor: overrides.scheduledFor || '2026-06-15T09:00:00.000Z',
        status: overrides.status || 'Open',
        maxParticipants: overrides.maxParticipants || 8,
        argumentCount: overrides.argumentCount || 0,
        voteCount: overrides.voteCount || 0,
        participants: overrides.participants || [],
        followers: overrides.followers || [],
        createdBy: overrides.createdBy || 'admin-1',
        populate: sinon.stub().resolvesThis(),
        save: sinon.stub().resolvesThis(),
        deleteOne: sinon.stub().resolves(),
    };

    debate.toObject = sinon.stub().returns({
        id: debate.id,
        _id: debate._id,
        title: debate.title,
        topic: debate.topic,
        category: debate.category,
        description: debate.description,
        scheduledFor: debate.scheduledFor,
        status: debate.status,
        maxParticipants: debate.maxParticipants,
        argumentCount: debate.argumentCount,
        voteCount: debate.voteCount,
        participants: debate.participants,
        followers: debate.followers,
        createdBy: debate.createdBy,
    });

    return debate;
};

const createPostDocument = (overrides = {}) => {
    const post = {
        id: overrides.id || 'post-1',
        _id: overrides._id || overrides.id || 'post-1',
        debate: overrides.debate || 'debate-1',
        author: overrides.author || { id: 'student-1', name: 'Student User', email: 'student@example.com' },
        parentPost: overrides.parentPost || null,
        stance: overrides.stance || 'Support',
        content: overrides.content || 'A clear debate contribution.',
        upvotes: overrides.upvotes || 0,
        downvotes: overrides.downvotes || 0,
        votes: overrides.votes || [],
        createdAt: overrides.createdAt || '2026-06-15T09:00:00.000Z',
        save: sinon.stub().resolvesThis(),
        populate: sinon.stub().resolvesThis(),
    };

    post.toObject = sinon.stub().callsFake(() => ({
        id: post.id,
        _id: post._id,
        debate: post.debate,
        author: post.author,
        parentPost: post.parentPost,
        stance: post.stance,
        content: post.content,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        votes: post.votes,
        createdAt: post.createdAt,
    }));

    return post;
};

describe('DebateHub Automated Test Suite', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('Smoke Check', () => {
        it('exports an Express app instance for automated API testing', () => {
            expect(app).to.have.property('listen').that.is.a('function');
        });
    });

    describe('ID-2, ID-5, ID-42: User Accounts and Access', () => {
        it('ID-2 registers a regular user and returns a student token', async () => {
            sinon.stub(User, 'findOne').resolves(null);
            const createUser = sinon.stub(User, 'create').resolves({
                id: 'regular-2',
                name: 'New Student',
                email: 'new.student@connect.qut.edu.au',
                role: 'student',
            });

            const res = await chai.request(app)
                .post('/api/auth/register')
                .send({
                    name: 'New Student',
                    email: 'new.student@connect.qut.edu.au',
                    password: 'new.student@connect.qut.edu.au',
                });

            expect(res).to.have.status(201);
            expect(res.body).to.include({
                id: 'regular-2',
                name: 'New Student',
                email: 'new.student@connect.qut.edu.au',
                role: 'student',
            });
            expect(res.body.token).to.be.a('string');
            expect(createUser.calledOnceWithMatch({ role: 'student' })).to.equal(true);
        });

        it('ID-2 prevents built-in accounts from registering as normal users', async () => {
            const findUser = sinon.stub(User, 'findOne');

            const res = await chai.request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Admin User',
                    email: 'admin.user@connect.qut.edu.au',
                    password: 'admin.user@connect.qut.edu.au',
                });

            expect(res).to.have.status(403);
            expect(res.body.message).to.equal('Built-in accounts cannot be registered');
            expect(findUser.notCalled).to.equal(true);
        });

        it('ID-5 rejects duplicate regular user registration', async () => {
            sinon.stub(User, 'findOne').resolves({ id: 'existing-user' });
            const createUser = sinon.stub(User, 'create');

            const res = await chai.request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Existing Student',
                    email: 'existing.student@connect.qut.edu.au',
                    password: 'password',
                });

            expect(res).to.have.status(400);
            expect(res.body.message).to.equal('User already exists');
            expect(createUser.notCalled).to.equal(true);
        });

        it('ID-42 allows the built-in admin user to log in and receive an admin token', async () => {
            sinon.stub(User, 'findOne').resolves(null);
            const createUser = sinon.stub(User, 'create').callsFake(async (payload) => ({
                id: 'admin-1',
                ...payload,
            }));

            const res = await chai.request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin.user@connect.qut.edu.au',
                    password: 'admin.user@connect.qut.edu.au',
                });

            expect(res).to.have.status(200);
            expect(res.body).to.include({
                id: 'admin-1',
                name: 'Admin User',
                email: 'admin.user@connect.qut.edu.au',
                role: 'admin',
            });
            expect(res.body.token).to.be.a('string');
            expect(createUser.calledOnceWithMatch({ role: 'admin' })).to.equal(true);
        });

        it('ID-5 allows the built-in regular user to log in and receive a student token', async () => {
            sinon.stub(User, 'findOne').resolves(null);
            const createUser = sinon.stub(User, 'create').callsFake(async (payload) => ({
                id: 'regular-1',
                ...payload,
            }));

            const res = await chai.request(app)
                .post('/api/auth/login')
                .send({
                    email: 'regular.user@connect.qut.edu.au',
                    password: 'regular.user@connect.qut.edu.au',
                });

            expect(res).to.have.status(200);
            expect(res.body).to.include({
                id: 'regular-1',
                name: 'Regular User',
                email: 'regular.user@connect.qut.edu.au',
                role: 'student',
            });
            expect(res.body.token).to.be.a('string');
            expect(createUser.calledOnceWithMatch({ role: 'student' })).to.equal(true);
        });

        it('ID-5 rejects invalid login credentials', async () => {
            sinon.stub(User, 'findOne').resolves(null);

            const res = await chai.request(app)
                .post('/api/auth/login')
                .send({
                    email: 'unknown.user@connect.qut.edu.au',
                    password: 'wrong-password',
                });

            expect(res).to.have.status(401);
            expect(res.body.message).to.equal('Invalid email or password');
        });
    });

    describe('ID-9, ID-12, ID-15, ID-18: Debate Topic CRUD', () => {
        it('ID-9 reads the active debate list with real argument and vote counts', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({ id: 'debate-1', _id: 'debate-1' });

            sinon.stub(Debate, 'find').returns(createQuery([debate]));
            sinon.stub(DebatePost, 'aggregate').resolves([
                { _id: 'debate-1', argumentCount: 3, voteCount: 7 },
            ]);

            const res = await chai.request(app)
                .get('/api/debates')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`);

            expect(res).to.have.status(200);
            expect(res.body).to.have.length(1);
            expect(res.body[0]).to.include({
                id: 'debate-1',
                argumentCount: 3,
                voteCount: 7,
            });
        });

        it('ID-12 creates new debates in Open status even when another status is submitted', async () => {
            const admin = authenticateAs({ id: 'admin-1', role: 'admin' });
            let createdPayload;

            sinon.stub(Debate, 'create').callsFake(async (payload) => {
                createdPayload = payload;
                return createDebateDocument({ id: 'debate-1', ...payload });
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

        it('ID-9 reads a debate detail view with posts, replies, arguments, and votes', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({ id: 'debate-1', _id: 'debate-1' });
            const post = createPostDocument({
                id: 'post-1',
                upvotes: 2,
                downvotes: 1,
                votes: [{ user: 'student-1', voteType: 'upvote' }],
            });
            const reply = createPostDocument({
                id: 'reply-1',
                parentPost: 'post-1',
                stance: 'Challenge',
                upvotes: 1,
                downvotes: 0,
            });

            sinon.stub(Debate, 'findById').returns(createQuery(debate, ['populate']));
            sinon.stub(DebatePost, 'find').returns(createQuery([post, reply], ['populate', 'sort']));

            const res = await chai.request(app)
                .get('/api/debates/debate-1')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`);

            expect(res).to.have.status(200);
            expect(res.body.debate).to.include({
                id: 'debate-1',
                argumentCount: 2,
                voteCount: 4,
            });
            expect(res.body.posts).to.have.length(1);
            expect(res.body.posts[0].currentUserVote).to.equal('upvote');
            expect(res.body.posts[0].replies).to.have.length(1);
            expect(res.body.posts[0].replies[0].id).to.equal('reply-1');
        });

        it('ID-15 updates a debate when the requester is an admin', async () => {
            const admin = authenticateAs({ id: 'admin-1', role: 'admin' });
            const existingDebate = createDebateDocument({ id: 'debate-1', createdBy: 'other-user' });
            const updatedDebate = createDebateDocument({
                id: 'debate-1',
                title: 'Updated debate title',
                status: 'Closing soon',
            });

            sinon.stub(Debate, 'findById').resolves(existingDebate);
            const updateDebate = sinon.stub(Debate, 'findByIdAndUpdate')
                .returns(createQuery(updatedDebate, ['populate']));

            const res = await chai.request(app)
                .put('/api/debates/debate-1')
                .set('Authorization', `Bearer ${tokenFor(admin.id)}`)
                .send({
                    title: 'Updated debate title',
                    status: 'Closing soon',
                });

            expect(res).to.have.status(200);
            expect(res.body).to.include({
                id: 'debate-1',
                title: 'Updated debate title',
                status: 'Closing soon',
            });
            expect(updateDebate.calledOnceWith('debate-1')).to.equal(true);
        });

        it('ID-15 rejects debate updates from users who do not own the debate', async () => {
            const student = authenticateAs({ id: 'student-1', role: 'student' });
            const existingDebate = createDebateDocument({ id: 'debate-1', createdBy: 'admin-1' });
            sinon.stub(Debate, 'findById').resolves(existingDebate);
            const updateDebate = sinon.stub(Debate, 'findByIdAndUpdate');

            const res = await chai.request(app)
                .put('/api/debates/debate-1')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`)
                .send({ title: 'Unauthorized update' });

            expect(res).to.have.status(403);
            expect(res.body.message).to.equal('Not authorized');
            expect(updateDebate.notCalled).to.equal(true);
        });

        it('ID-18 deletes a debate and its posts when the requester is an admin', async () => {
            const admin = authenticateAs({ id: 'admin-1', role: 'admin' });
            const existingDebate = createDebateDocument({ id: 'debate-1', createdBy: 'admin-1' });
            sinon.stub(Debate, 'findById').resolves(existingDebate);
            const deletePosts = sinon.stub(DebatePost, 'deleteMany').resolves();

            const res = await chai.request(app)
                .delete('/api/debates/debate-1')
                .set('Authorization', `Bearer ${tokenFor(admin.id)}`);

            expect(res).to.have.status(200);
            expect(res.body.id).to.equal('debate-1');
            expect(deletePosts.calledOnceWith({ debate: 'debate-1' })).to.equal(true);
            expect(existingDebate.deleteOne.calledOnce).to.equal(true);
        });
    });

    describe('ID-22, ID-25, ID-28, ID-53: Debate Participation CRUD', () => {
        it('ID-22 follows an open debate when the user is not already following', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({
                id: 'debate-1',
                status: 'Open',
                followers: [],
                maxParticipants: 4,
            });
            sinon.stub(Debate, 'findById').resolves(debate);

            const res = await chai.request(app)
                .post('/api/debates/debate-1/join')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`);

            expect(res).to.have.status(200);
            expect(debate.followers).to.deep.equal(['student-1']);
            expect(debate.save.calledOnce).to.equal(true);
        });

        it('ID-22 unfollows a debate when the user is already following', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({
                id: 'debate-1',
                status: 'Open',
                followers: ['student-1'],
                maxParticipants: 4,
            });
            sinon.stub(Debate, 'findById').resolves(debate);

            const res = await chai.request(app)
                .post('/api/debates/debate-1/join')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`);

            expect(res).to.have.status(200);
            expect(debate.followers).to.deep.equal([]);
            expect(debate.save.calledOnce).to.equal(true);
        });

        it('ID-22 rejects follow attempts on closed debates', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({
                id: 'debate-1',
                status: 'Closed',
                followers: [],
            });
            sinon.stub(Debate, 'findById').resolves(debate);

            const res = await chai.request(app)
                .post('/api/debates/debate-1/join')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`);

            expect(res).to.have.status(400);
            expect(res.body.message).to.equal('This debate is not open for registration');
            expect(debate.save.notCalled).to.equal(true);
        });

        it('ID-25 creates a top-level support post on an open debate', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({
                id: 'debate-1',
                status: 'Open',
                argumentCount: 0,
            });
            const post = createPostDocument({
                id: 'post-1',
                author: student.id,
                stance: 'Support',
                content: 'AI tools can support formative learning.',
            });

            sinon.stub(Debate, 'findById').resolves(debate);
            const createPost = sinon.stub(DebatePost, 'create').resolves(post);

            const res = await chai.request(app)
                .post('/api/debates/debate-1/posts')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`)
                .send({
                    stance: 'Support',
                    content: 'AI tools can support formative learning.',
                });

            expect(res).to.have.status(201);
            expect(res.body).to.include({
                id: 'post-1',
                stance: 'Support',
                content: 'AI tools can support formative learning.',
                currentUserVote: null,
            });
            expect(createPost.calledOnceWithMatch({
                debate: 'debate-1',
                author: 'student-1',
                parentPost: null,
            })).to.equal(true);
            expect(debate.argumentCount).to.equal(1);
            expect(debate.save.calledOnce).to.equal(true);
        });

        it('ID-53 creates a reply under an existing post', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const debate = createDebateDocument({
                id: 'debate-1',
                status: 'Open',
                argumentCount: 1,
            });
            const parentPost = createPostDocument({ id: 'post-1' });
            const reply = createPostDocument({
                id: 'reply-1',
                parentPost: 'post-1',
                stance: 'Challenge',
                content: 'This needs stronger evidence.',
            });

            sinon.stub(Debate, 'findById').resolves(debate);
            sinon.stub(DebatePost, 'findOne').resolves(parentPost);
            const createPost = sinon.stub(DebatePost, 'create').resolves(reply);

            const res = await chai.request(app)
                .post('/api/debates/debate-1/posts')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`)
                .send({
                    stance: 'Challenge',
                    content: 'This needs stronger evidence.',
                    parentPost: 'post-1',
                });

            expect(res).to.have.status(201);
            expect(res.body).to.include({
                id: 'reply-1',
                parentPost: 'post-1',
                stance: 'Challenge',
            });
            expect(createPost.calledOnceWithMatch({ parentPost: 'post-1' })).to.equal(true);
            expect(debate.argumentCount).to.equal(2);
        });

        it('ID-25 rejects posts on closed debates', async () => {
            const student = authenticateAs({ id: 'student-1' });
            sinon.stub(Debate, 'findById').resolves(createDebateDocument({
                id: 'debate-1',
                status: 'Closed',
            }));
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

        it('ID-28 allows one vote per user and switches vote direction without double counting', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const post = createPostDocument({
                id: 'post-1',
                author: student.id,
                upvotes: 0,
                downvotes: 0,
                votes: [],
            });

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

        it('ID-28 rejects invalid vote types', async () => {
            const student = authenticateAs({ id: 'student-1' });
            const findPost = sinon.stub(DebatePost, 'findOne');

            const res = await chai.request(app)
                .post('/api/debates/debate-1/posts/post-1/vote')
                .set('Authorization', `Bearer ${tokenFor(student.id)}`)
                .send({ voteType: 'maybe' });

            expect(res).to.have.status(400);
            expect(res.body.message).to.equal('Invalid vote type');
            expect(findPost.notCalled).to.equal(true);
        });
    });
});
