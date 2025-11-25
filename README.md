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

This will install all required packages listed in `package.json`:
- express
- mongoose
- ejs
- jsonwebtoken
- cookie-parser
- multer
- dotenv
- nodemon (for development)

### Step 2: Set Up MongoDB

You have two options:

#### Option A: MongoDB Atlas (Cloud - Recommended for beginners)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier is fine)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
6. Replace `<password>` with your database password
7. Replace `<dbname>` with your database name (e.g., `blogify`)

#### Option B: Local MongoDB

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - **Windows**: MongoDB should start automatically as a service
   - **Mac/Linux**: Run `mongod` in terminal
3. Your connection string will be: `mongodb://localhost:27017/blogify`

### Step 3: Create Environment Variables File

Create a file named `.env` in the root directory of your project:

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# Or create manually in your editor
```

Add the following content to `.env`:

```env
MONGO_URL=your_mongodb_connection_string_here
PORT=8000
```

**Example for MongoDB Atlas:**
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/blogify
PORT=8000
```

**Example for Local MongoDB:**
```env
MONGO_URL=mongodb://localhost:27017/blogify
PORT=8000
```

### Step 4: Verify Project Structure

Make sure you have these folders:
- `public/uploads/` - for storing uploaded blog images
- `public/images/` - for default images (already exists)

If `public/uploads/` doesn't exist, create it:
```bash
# Windows PowerShell
New-Item -Path "public\uploads" -ItemType Directory
```

### Step 5: Start the Application

#### For Development (with auto-restart):
```bash
npm run dev
```

#### For Production:
```bash
npm start
```

### Step 6: Access the Application

Open your browser and go to:
```
http://localhost:8000
```

You should see the Blogify homepage!

## Troubleshooting

### Issue: "MongoDB Connected" not showing
- **Solution**: Check your `MONGO_URL` in `.env` file
- Make sure MongoDB is running (if using local)
- Verify your MongoDB Atlas connection string is correct

### Issue: Port already in use
- **Solution**: Change `PORT` in `.env` to a different number (e.g., 3000, 5000)

### Issue: Cannot find module errors
- **Solution**: Run `npm install` again

### Issue: File upload not working
- **Solution**: Make sure `public/uploads/` folder exists and has write permissions

## First Time Usage

1. **Create an Account**: Click "Create Account" or go to `/user/signup`
2. **Sign In**: Use your credentials at `/user/signin`
3. **Add a Blog**: Click "Add Blog" (only visible when logged in)
4. **View Blogs**: Click on any blog card to view details
5. **Add Comments**: Logged-in users can comment on blogs

## Development Tips

- Use `npm run dev` for development (auto-restarts on file changes)
- Check browser console for client-side errors
- Check terminal for server-side errors
- MongoDB data persists between restarts

