const { Router } = require("express");

const Blog = require("../models/blog");
const User = require("../models/user");

const router = Router();

router.get("/profile/:id", async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id).select("-password -salt");

    if (!profileUser) {
      return res.redirect("/");
    }

    const blogs = await Blog.find({ createdBy: req.params.id })
      .sort({ createdAt: -1 })
      .populate("createdBy");

    return res.render("profile", {
      user: req.user,
      profileUser,
      blogs,
    });
  } catch (error) {
    return res.redirect("/");
  }
});

module.exports = router;