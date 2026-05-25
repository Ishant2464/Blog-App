# Blogify — LLM Code View

> **Purpose:** Single-file snapshot of the Blogify codebase for LLM context (no zip upload needed).  
> **Generated:** 2026-05-25  
> **Excluded:** `node_modules/`, `venv/`, `.env` (secrets), `package-lock.json`, binary assets (`public/images/default.png`, `public/uploads/*`).

---

## Project structure

```
Blogify/
├── app.js                      # Express entry point
├── package.json
├── .gitignore
├── README.md
├── middlewares/
│   └── authentication.js       # JWT cookie middleware
├── models/
│   ├── user.js
│   ├── blog.js
│   └── comment.js
├── routes/
│   ├── user.js                 # signup, signin, logout
│   └── blog.js                 # CRUD, comments, multer uploads
├── services/
│   └── authentication.js       # JWT create/validate
├── views/
│   ├── home.ejs
│   ├── blog.ejs
│   ├── addBlog.ejs
│   ├── signin.ejs
│   ├── signup.ejs
│   └── partials/
│       ├── head.ejs
│       ├── nav.ejs
│       └── scripts.ejs
└── public/
    ├── images/
    │   └── default.png         # default profile image (binary, not inlined)
    └── uploads/                # user-uploaded blog cover images (runtime)
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20.x |
| Server | Express 4 |
| DB | MongoDB via Mongoose 6 |
| Views | EJS |
| Auth | JWT in HTTP-only-style cookie (`token`) |
| Passwords | HMAC-SHA256 + per-user salt |
| Uploads | Multer → `public/uploads/` |
| UI | Bootstrap 5 (CDN) |

---

## Environment variables (template — do not commit real values)

Create `.env` in project root:

```env
MONGO_URL=mongodb://localhost:27017/blogify
PORT=8000
JWT_SECRET=your_jwt_secret_here
```

---

## Dependencies (`package.json`)

```json
{
  "name": "blog-app",
  "version": "1.0.0",
  "author": "",
  "license": "ISC",
  "engines": {
    "node": "20.x"
  },
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.0.3",
    "ejs": "^3.1.8",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^6.9.1",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

---

## `.gitignore`

```
.env
node_modules/
venv/
```

---

## Routes overview

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/` | List all blogs → `home.ejs` | Optional |
| GET | `/user/signin` | Sign-in form | — |
| POST | `/user/signin` | Login, set `token` cookie | — |
| GET | `/user/signup` | Sign-up form | — |
| POST | `/user/signup` | Create user, redirect `/` | — |
| GET | `/user/logout` | Clear cookie | — |
| GET | `/blog/add-new` | Add blog form | `req.user` expected |
| POST | `/blog` | Create blog + cover upload | `req.user` expected |
| GET | `/blog/:id` | Blog detail + comments | Optional |
| POST | `/blog/comment/:blogId` | Add comment | `req.user` expected |

**Note:** Blog routes do not enforce auth middleware on `POST /blog` or `GET /blog/add-new`; protection relies on UI (`locals.user`) only.

---

## Source files

### `app.js`

```javascript
require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookiePaser = require("cookie-parser");

const Blog = require("./models/blog");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");

const {
  checkForAuthenticationCookie,
} = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGO_URL)
  .then((e) => console.log("MongoDB Connected"));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookiePaser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

app.get("/", async (req, res) => {
  const allBlogs = await Blog.find({});
  res.render("home", {
    user: req.user,
    blogs: allBlogs,
  });
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
```

---

### `middlewares/authentication.js`

```javascript
const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName) {
  return (req, res, next) => {
    const tokenCookieValue = req.cookies[cookieName];
    if (!tokenCookieValue) {
      return next();
    }

    try {
      const userPayload = validateToken(tokenCookieValue);
      req.user = userPayload;
    } catch (error) {}

    return next();
  };
}

module.exports = {
  checkForAuthenticationCookie,
};
```

---

### `services/authentication.js`

```javascript
require("dotenv").config();
const JWT = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

function createTokenForUser(user) {
  const payload = {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    profileImageURL: user.profileImageURL,
    role: user.role,
  };

  return JWT.sign(payload, secret);
}

function validateToken(token) {
  return JWT.verify(token, secret);
}

module.exports = {
  createTokenForUser,
  validateToken,
};
```

---

### `models/user.js`

```javascript
const { createHmac, randomBytes } = require("crypto");
const { Schema, model } = require("mongoose");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profileImageURL: {
      type: String,
      default: "/images/default.png",
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  const user = this;

  if (!user.isModified("password")) return;

  const salt = randomBytes(16).toString();
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  this.salt = salt;
  this.password = hashedPassword;

  next();
});

userSchema.static(
  "matchPasswordAndGenerateToken",
  async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found!");

    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvidedHash = createHmac("sha256", salt)
      .update(password)
      .digest("hex");

    if (hashedPassword !== userProvidedHash)
      throw new Error("Incorrect Password");

    const token = createTokenForUser(user);
    return token;
  }
);

const User = model("user", userSchema);

module.exports = User;
```

---

### `models/blog.js`

```javascript
const { Schema, model } = require("mongoose");

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    coverImageURL: {
      type: String,
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

const Blog = model("blog", blogSchema);

module.exports = Blog;
```

---

### `models/comment.js`

```javascript
const { Schema, model } = require("mongoose");

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    blogId: {
      type: Schema.Types.ObjectId,
      ref: "blog",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

const Comment = model("comment", commentSchema);

module.exports = Comment;
```

---

### `routes/user.js`

```javascript
const { Router } = require("express");
const User = require("../models/user");

const router = Router();

router.get("/signin", (req, res) => {
  return res.render("signin");
});

router.get("/signup", (req, res) => {
  return res.render("signup");
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await User.matchPasswordAndGenerateToken(email, password);

    return res.cookie("token", token).redirect("/");
  } catch (error) {
    return res.render("signin", {
      error: "Incorrect Email or Password",
    });
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("token").redirect("/");
});

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  await User.create({
    fullName,
    email,
    password,
  });
  return res.redirect("/");
});

module.exports = router;
```

---

### `routes/blog.js`

```javascript
const { Router } = require("express");
const multer = require("multer");
const path = require("path");

const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(`./public/uploads/`));
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

router.get("/add-new", (req, res) => {
  return res.render("addBlog", {
    user: req.user,
  });
});

router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate("createdBy");
  const comments = await Comment.find({ blogId: req.params.id }).populate(
    "createdBy"
  );

  return res.render("blog", {
    user: req.user,
    blog,
    comments,
  });
});

router.post("/comment/:blogId", async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

router.post("/", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;
  const blog = await Blog.create({
    body,
    title,
    createdBy: req.user._id,
    coverImageURL: `/uploads/${req.file.filename}`,
  });
  return res.redirect(`/blog/${blog._id}`);
});

module.exports = router;
```

---

### `views/partials/head.ejs`

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css"
  rel="stylesheet"
  integrity="sha384-GLhlTQ8iRABdZLl6O3oVMWSktQOp6b7In1Zl3/Jr59b6EGGoI1aFkw7cmDA6j6gD"
  crossorigin="anonymous"
/>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

### `views/partials/nav.ejs`

```html
<nav
  class="navbar navbar-expand-lg bg-body-tertiary bg-dark"
  data-bs-theme="dark"
>
  <div class="container-fluid">
    <a class="navbar-brand" href="/">Blogify</a>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNavDropdown"
      aria-controls="navbarNavDropdown"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNavDropdown">
      <ul class="navbar-nav">
        <li class="nav-item">
          <a class="nav-link active" aria-current="page" href="/">Home</a>
        </li>
        <% if (locals.user) { %>
        <li class="nav-item">
          <a class="nav-link" href="/blog/add-new">Add Blog</a>
        </li>
        <li class="nav-item dropdown">
          <a
            class="nav-link dropdown-toggle"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <%= locals.user.fullName %>
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/user/logout">Logout</a></li>
          </ul>
        </li>
        <% } else {%>
        <li class="nav-item">
          <a class="nav-link" href="/user/signup">Sign Up</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="/user/signin">Sign In</a>
        </li>
        <% } %>
      </ul>
    </div>
  </div>
</nav>

<% if (locals.error) { %>
<div class="container mt-4">
  <div class="alert alert-danger" role="alert"><%= locals.error %></div>
</div>
<% } %>
```

---

### `views/partials/scripts.ejs`

```html
<script
  src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"
  integrity="sha384-w76AqPfDkMBDXo30jS1Sgez6pr3x5MlQ1ZAGC+nuZB+EYdgRZgiwxhTBTkF7CXvN"
  crossorigin="anonymous"
></script>
```

---

### `views/home.ejs`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <%- include('./partials/head') %>
    <title>Homepage</title>
  </head>
  <body>
    <%- include('./partials/nav') %>

    <div class="container mt-3">
      <div class="row row-cols-4">
        <% blogs.forEach(blog => { %>
        <div class="col">
          <div class="card col" style="width: 18rem">
            <img src="<%= blog.coverImageURL %>" class="card-img-top" />
            <div class="card-body">
              <h5 class="card-title"><%= blog.title %></h5>
              <a href="/blog/<%= blog._id %>" class="btn btn-primary">View</a>
            </div>
          </div>
        </div>
        <% }) %>
      </div>
    </div>

    <%- include('./partials/scripts') %>
  </body>
</html>
```

---

### `views/blog.ejs`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <%- include('./partials/head') %>
    <title>Blog</title>
  </head>
  <body>
    <%- include('./partials/nav') %>

    <div class="container mt-4">
      <h1><%= blog.title %></h1>
      <img src="<%= blog.coverImageURL %>" width="700px" />
      <pre class="mt-3"><%= blog.body %></pre>
    </div>

    <div class="container mt-4">
      <img src="<%= blog.createdBy.profileImageURL %>" width="50px" /> <%=
      blog.createdBy.fullName %>
    </div>

    <div class="container mt-3">
      <h1>Comments (<%= comments.length %>)</h1>
      <% if (locals.user) { %>
      <form action="/blog/comment/<%= blog._id %>" method="post">
        <div class="mb-3">
          <input
            type="text"
            name="content"
            class="form-control"
            placeholder="Enter your comment"
          />
          <button class="btn btn-sm btn-primary" type="submit">Add</button>
        </div>
      </form>

      <% } %>
      <div class="mt-3">
        <% comments.forEach(comment => { %>
        <div>
          <img src="<%= comment.createdBy.profileImageURL %>" width="50px" />
          <%= comment.createdBy.fullName %>
          <pre><%= comment.content %></pre>
        </div>
        <% }) %>
      </div>
    </div>

    <%- include('./partials/scripts') %>
  </body>
</html>
```

---

### `views/addBlog.ejs`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <%- include('./partials/head') %>
    <title>Add New Blog</title>
  </head>
  <body>
    <%- include('./partials/nav') %>

    <div class="container mt-3">
      <form action="/blog" method="post" enctype="multipart/form-data">
        <div class="mb-3">
          <label for="coverImage" class="form-label">Cover Image</label>
          <input
            type="file"
            class="form-control"
            id="coverImage"
            name="coverImage"
            aria-describedby="coverImage"
          />
        </div>
        <div class="mb-3">
          <label for="title" class="form-label">Title</label>
          <input
            type="text"
            class="form-control"
            id="title"
            name="title"
            aria-describedby="title"
          />
        </div>
        <div class="mb-3">
          <label for="body">Body</label>
          <textarea name="body" class="form-control" id="body"></textarea>
        </div>
        <div class="mb-3">
          <button class="btn btn-primary">Submit</button>
        </div>
      </form>
    </div>

    <%- include('./partials/scripts') %>
  </body>
</html>
```

---

### `views/signin.ejs`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <%- include('./partials/head') %>
    <title>Signin</title>
  </head>
  <body>
    <%- include('./partials/nav') %>

    <div class="container mt-4">
      <form action="/user/signin" method="post">
        <div class="mb-3">
          <label for="exampleInputEmail1" class="form-label"
            >Email address</label
          >
          <input
            type="email"
            name="email"
            class="form-control"
            id="exampleInputEmail1"
            aria-describedby="emailHelp"
          />
          <div id="emailHelp" class="form-text">
            We'll never share your email with anyone else.
          </div>
        </div>
        <div class="mb-3">
          <label for="exampleInputPassword1" class="form-label">Password</label>
          <input
            name="password"
            type="password"
            class="form-control"
            id="exampleInputPassword1"
          />
        </div>

        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    </div>

    <%- include('./partials/scripts') %>
  </body>
</html>
```

---

### `views/signup.ejs`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <%- include('./partials/head') %>
    <title>Signup</title>
  </head>
  <body>
    <%- include('./partials/nav') %>

    <div class="container mt-4">
      <form action="/user/signup" method="post">
        <div class="mb-3">
          <label for="fullName" class="form-label">Full Name</label>
          <input
            type="text"
            class="form-control"
            id="fullName"
            name="fullName"
            aria-describedby="fullName"
          />
        </div>
        <div class="mb-3">
          <label for="exampleInputEmail1" class="form-label"
            >Email address</label
          >
          <input
            type="email"
            name="email"
            class="form-control"
            id="exampleInputEmail1"
            aria-describedby="emailHelp"
          />
          <div id="emailHelp" class="form-text">
            We'll never share your email with anyone else.
          </div>
        </div>
        <div class="mb-3">
          <label for="exampleInputPassword1" class="form-label">Password</label>
          <input
            name="password"
            type="password"
            class="form-control"
            id="exampleInputPassword1"
          />
        </div>

        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    </div>

    <%- include('./partials/scripts') %>
  </body>
</html>
```

---

## README (setup reference)

```markdown
# Blogify - Local Setup Guide

## Prerequisites

Before starting, make sure you have installed:
- **Node.js** (version 16.0.0 or higher)
- **MongoDB** (local installation OR MongoDB Atlas account for cloud database)
- **npm** (comes with Node.js)

## Step-by-Step Setup

### Step 1: Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

### Step 2: Set Up MongoDB

Use MongoDB Atlas or local `mongodb://localhost:27017/blogify`.

### Step 3: Create `.env`

```env
MONGO_URL=your_mongodb_connection_string_here
PORT=8000
```

(Add `JWT_SECRET` — required by `services/authentication.js` but not documented in original README.)

### Step 4: Ensure `public/uploads/` exists

### Step 5: Run

```bash
npm run dev   # development
npm start     # production
```

### Step 6: Open http://localhost:8000
```

---

## How to use this file with an LLM

1. Copy the entire `llm_code_view.md` into the chat, or attach it if the tool supports file upload.
2. For very large context windows, you can paste only the **Source files** section plus **Routes overview**.
3. Never paste your real `.env` — use the template above.
4. Re-generate this file after major refactors so the snapshot stays current.

---

*End of LLM code view.*
