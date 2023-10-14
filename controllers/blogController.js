const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const verifyAndExtractUserFromToken = async (token) => {
  const decodedtoken = jwt.verify(token, process.env.SECRET);
  if (!decodedtoken.id) {
    return response
      .status(401)
      .json({ error: "Unauthorised : Token is invalid" });
  }
  const user = await User.findById(decodedtoken.id);
  return user;
};

blogsRouter.get("/", async (request, response, next) => {
  try {
    const blogs = await Blog.find({}).populate("user", {
      username: 1,
      name: 1,
    });
    response.json(blogs);
  } catch (error) {
    next(error);
  }
});

blogsRouter.post("/", async (request, response, next) => {
  try {
    const user = await verifyAndExtractUserFromToken(request.token);

    if (!request.body.title || !request.body.url) {
      return response
        .status(400)
        .json({ error: "Title and URL cannot be empty" });
    }

    const blog = new Blog({
      title: request.body.title,
      author: request.body.author,
      url: request.body.url,
      likes: request.body.likes || 0,
      user: user.id,
    });

    const savedBlog = await blog.save();
    user.blogs = user.blogs.concat(savedBlog._id);
    await user.save();
    response.status(201).json(savedBlog);
  } catch (error) {
    next(error);
  }
});

blogsRouter.delete("/:id", async (request, response, next) => {
  try {
    const user = await verifyAndExtractUserFromToken(request.token);    
    const blog = await Blog.findById(request.params.id);

    if (!blog) {
      response.status(400).json({ error: "Id doesnot exist" });
    }

    if (blog.user.toString() === user.id.toString()) {
      await Blog.findByIdAndRemove(request.params.id);
      response.status(204).end();
    } else {
      response
        .status(400)
        .json({ error: "User doesnot have the right to delete this blog" });
    }
  } catch (error) {
    next(error);
  }
});

blogsRouter.put("/:id", async (request, response, next) => {
  const updatedBlog = {
    likes: request.body.likes,
  };

  try {
    const res = await Blog.findByIdAndUpdate(request.params.id, updatedBlog, {
      new: true,
    });
    if (res) response.status(200).json(res);
    response.status(400).json("Invalid Id");
  } catch (error) {
    next(error);
  }
});

module.exports = blogsRouter;
