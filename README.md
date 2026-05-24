# DebateHub

DebateHub is a full-stack MERN debate platform for structured academic discussion. Users can explore debates, follow topics, post support or challenge arguments, reply to other participants, and vote on posts. Admin users can create, edit, close, and delete debate topics through a dedicated management dashboard.

## Features

- User registration and JWT-based login
- Role-aware experience for regular users and admins
- Admin dashboard for debate management
- Debate create, read, update, and delete workflows
- Debate status support: `Open`, `Closing soon`, and `Closed`
- User dashboard showing followed debates only
- Explore debates page with search and status filters
- Follow and unfollow debates
- Debate detail page with support and challenge posts
- Nested replies under existing posts
- Upvote and downvote support with one active vote per user per post
- Closed debates remain readable but disable new posts and replies
- MongoDB-backed persistence for users, debates, posts, replies, follows, and votes
- GitHub Actions CI for install, test, and frontend build

## Tech Stack

**Frontend**

- React 18
- React Router
- Axios
- Create React App
- Tailwind base setup with custom CSS
- Inter font via Google Fonts

**Backend**

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens
- bcryptjs
- Mocha smoke tests

## Project Structure

```text
debateHub/
├── .github/workflows/ci.yml
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   └── package.json
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB connection string, local or hosted

### Installation

Clone the repository and install root, backend, and frontend dependencies:

```bash
npm run install-all
```

### Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
MONGO_URI=<YOUR MONGODB CONNECTION STRING>
MONGO_DB_NAME=debateHub
JWT_SECRET=<YOUR JWT SECRET>
PORT=5001
```

`MONGO_DB_NAME` is used so the database appears as `debateHub` instead of MongoDB's default `test` database.

### Run Locally

Start both the backend API and frontend development server:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5001`

## Available Scripts

From the project root:

```bash
npm run install-all
npm run dev
npm start
npm test
npm run build
```

| Script | Description |
| --- | --- |
| `npm run install-all` | Installs dependencies for root, backend, and frontend |
| `npm run dev` | Runs backend with Nodemon and frontend dev server together |
| `npm start` | Runs backend production start and frontend dev server together |
| `npm test` | Runs backend and frontend smoke tests |
| `npm run build` | Builds the React frontend for production |

## User Roles

### Regular User

Regular users can:

- Register through the app
- Log in
- Explore all debates
- Follow or unfollow debates
- View followed debates on their dashboard
- View debate details
- Post support or challenge arguments on open debates
- Reply to existing posts
- Upvote or downvote posts and replies

### Admin User

Admin users can:

- Log in through the same login screen
- Access the admin dashboard
- Create debates
- Edit debates
- Change debate status
- Delete debates
- View the regular debate list

Admin accounts cannot be self-registered through the registration page.

Development admin credentials:

```text
Email: burak.sofu@gmail.com
Password: burak.sofu@gmail.com
```

## Core Workflows

### Debate Lifecycle

1. An admin creates a debate.
2. The debate is created with `Open` status.
3. Users can follow the debate and participate.
4. Admins can update the status to `Closing soon` or `Closed`.
5. Closed debates remain visible but no longer accept new posts or replies.

### Voting

Each user can have one active vote per post or reply:

- Clicking upvote once increases the upvote count.
- Clicking upvote again does not increase the count again.
- Switching from upvote to downvote removes the upvote and adds a downvote.
- Switching from downvote to upvote does the reverse.

## API Overview

Base URL in development:

```text
http://localhost:5001
```

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a regular user |
| `POST` | `/api/auth/login` | Log in user or admin |
| `GET` | `/api/auth/profile` | Get authenticated user profile |
| `PUT` | `/api/auth/profile` | Update authenticated user profile |

### Debates

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/debates` | List debates with argument and vote counts |
| `POST` | `/api/debates` | Create debate |
| `GET` | `/api/debates/:id` | Get debate detail with posts and replies |
| `PUT` | `/api/debates/:id` | Update debate |
| `DELETE` | `/api/debates/:id` | Delete debate |
| `POST` | `/api/debates/:id/join` | Toggle follow or unfollow |
| `POST` | `/api/debates/:id/posts` | Create post or reply |
| `POST` | `/api/debates/:id/posts/:postId/vote` | Upvote or downvote a post |

Protected routes require:

```http
Authorization: Bearer <token>
```

## Testing

Run all smoke tests:

```bash
npm test
```

Current coverage includes backend app loading and frontend app component smoke checks.

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`.

The workflow:

1. Checks out the code
2. Sets up Node.js
3. Installs all dependencies
4. Runs tests
5. Builds the frontend

## Notes

- The frontend uses Create React App, which may emit maintenance warnings during test/build commands.
- The app uses `bcryptjs` instead of native `bcrypt` to avoid native build issues on Windows development machines.
- The remote repository is configured as `https://github.com/bsofu-qut/DebateHub.git`.

## License

ISC
