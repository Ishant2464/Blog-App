require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookiePaser = require("cookie-parser");

const Blog = require("./models/blog");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const profileRoute = require("./routes/profile");

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
  const limit = 8;
  const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const sort = req.query.sort === "oldest" ? "oldest" : "newest";
  const filter = search ? { title: { $regex: search, $options: "i" } } : {};
  const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
  const totalBlogs = await Blog.countDocuments(filter);
  const totalPages = Math.ceil(totalBlogs / limit);
  const currentPage = totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;
  const blogs = await Blog.find(filter)
    .sort(sortOption)
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .populate("createdBy");

  res.render("home", {
    user: req.user,
    blogs,
    currentPage,
    totalPages,
    search,
    sort,
  });
});

app.use("/user", userRoute);
app.use("/user", profileRoute);
app.use("/blog", blogRoute);

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
