const { Router } = require("express");
const multer = require("multer");

const Blog = require("../models/blog");
const Comment = require("../models/comment");
const { ensureAuthenticated } = require("../middlewares/authGuard");
const { generateBlogSummary } = require("../services/ai");
const { storage } = require("../services/cloudinary");

const router = Router();

const upload = multer({ storage });

function isRichTextEmpty(value) {
  return !String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

router.get("/add-new", ensureAuthenticated, (req, res) => {
  return res.render("addBlog", {
    user: req.user,
  });
});

router.get("/edit/:id", ensureAuthenticated, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog || blog.createdBy.toString() !== req.user._id) {
      return res.redirect("/");
    }

    return res.render("editBlog", {
      user: req.user,
      blog,
    });
  } catch (error) {
    return res.redirect("/");
  }
});

router.get("/summary/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const summary = await generateBlogSummary(blog.title, blog.body);
    return res.json({ summary });
  } catch (error) {
    console.error("Blog summary route failed:", error);
    return res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");

    if (!blog) {
      return res.redirect("/");
    }

    const comments = await Comment.find({ blogId: req.params.id }).populate(
      "createdBy"
    );

    return res.render("blog", {
      user: req.user,
      blog,
      comments,
    });
  } catch (error) {
    return res.redirect("/");
  }
});

router.post("/comment/:blogId", ensureAuthenticated, async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

router.post(
  "/edit/:id",
  ensureAuthenticated,
  upload.single("coverImage"),
  async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);

      if (!blog || blog.createdBy.toString() !== req.user._id) {
        return res.redirect("/");
      }

      const updateData = {
        title: req.body.title,
        body: req.body.body,
      };

      if (!updateData.title || isRichTextEmpty(updateData.body)) {
        return res.render("editBlog", {
          user: req.user,
          blog,
          error: "Title and body are required",
        });
      }

      if (req.file) {
        updateData.coverImageURL = req.file.path;
      }

      await Blog.findByIdAndUpdate(req.params.id, updateData, {
        runValidators: true,
      });
      return res.redirect(`/blog/${req.params.id}`);
    } catch (error) {
      return res.redirect("/");
    }
  }
);

router.post("/delete/:id", ensureAuthenticated, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog || blog.createdBy.toString() !== req.user._id) {
      return res.redirect("/");
    }

    await Comment.deleteMany({ blogId: req.params.id });
    await Blog.findByIdAndDelete(req.params.id);
    return res.redirect("/");
  } catch (error) {
    return res.redirect("/");
  }
});

router.post(
  "/",
  ensureAuthenticated,
  upload.single("coverImage"),
  async (req, res) => {
    try {
      const { title, body } = req.body;

      if (!title || isRichTextEmpty(body)) {
        return res.render("addBlog", {
          user: req.user,
          error: "Title and body are required",
        });
      }

      const blog = await Blog.create({
        body,
        title,
        createdBy: req.user._id,
        coverImageURL: req.file ? req.file.path : "/images/default.png",
      });
      return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
      return res.render("addBlog", {
        user: req.user,
        error: "Unable to create blog. Please check your input and try again.",
      });
    }
  }
);

module.exports = router;
