const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const User = require("./model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  "sdjkfh8923yhjdksbfma@#*(&@*!^#&@bhjb2qiuhesdbhjdsfg839ujkdhfjk";

mongoose.connect(
  "mongodb+srv://admin:admin@cluster0.sflgbif.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  }
);

const app = express();
app.use(bodyParser.json());

app.post("/api/register", async (req, res) => {
  const { username, password: plainTextPassword, email } = req.body;

  if (!username || typeof username !== "string") {
    return res.json({ status: "error", error: "Invalid username" });
  }

  if (!plainTextPassword || typeof plainTextPassword !== "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (!email || typeof email !== "string") {
    return res.json({ status: "error", error: "Invalid email" });
  }

  if (plainTextPassword.length < 5) {
    return res.json({
      status: "error",
      error: "Password too small. Should be atleast 6 characters",
    });
  }

  const password = await bcrypt.hash(plainTextPassword, 10);

  try {
    const response = await User.create({
      username,
      password,
      email,
    });
    console.log("User created successfully: ", response);
  } catch (error) {
    console.log(error);
    if (error.code === 11000) {
      // duplicate key
      return res.json({
        status: "error",
        error: "Username/Email already in use",
      });
    }
    throw error;
  }

  res.json({ status: "success" });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).lean();

  if (!user) {
    return res.json({ status: "error", error: "Invalid username/password" });
  }

  if (await bcrypt.compare(password, user.password)) {
    // the username, password combination is successful

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET
    );

    return res.json({ status: "success", auth_token: token });
  }

  res.json({ status: "error", error: "Invalid username/password" });
});

app.post("/api/change-password", async (req, res) => {
  const { token, newpassword: plainTextPassword } = req.body;

  if (!plainTextPassword || typeof plainTextPassword !== "string") {
    return res.json({ status: "error", error: "Invalid password" });
  }

  if (plainTextPassword.length < 5) {
    return res.json({
      status: "error",
      error: "Password too small. Should be atleast 6 characters",
    });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

    const _id = user.id;

    const password = await bcrypt.hash(plainTextPassword, 10);

    await User.updateOne(
      { _id },
      {
        $set: { password },
      }
    );
    res.json({ status: "success" });
  } catch (error) {
    // console.log(error)
    res.json({ status: "error", error: "Invalid Token" });
  }
});

app.post("/api/update-role", async (req, res) => {
  const { username, role } = req.body;

  if (!role || typeof role != "string") {
    return res.json({ status: "error", error: "Invalid Role" });
  }

  try {
    const founduser = await User.findOne({ username }).lean();
    if (!founduser) {
      res.json({ status: "error", error: "User does'nt exist" });
    } else {
      await User.updateOne(
        { username },
        {
          $set: { role },
        }
      );
      res.json({ status: "success" });
    }
  } catch (error) {
    // console.log(error);
    res.json({ status: "error", error: "Error! Unable to update." });
  }
});

app.post("/api/savedposts/save", async (req, res) => {
  const { token, postid } = req.body;
  if (!postid || typeof postid != "string") {
    return res.json({ status: "error", error: "Invalid Post ID." });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

    const _id = user.id;
    const founduser = await User.findOne({ _id }).lean();

    if (!founduser) {
      res.json({ status: "error", error: "User does'nt exist" });
    } else {
      const savedposts = founduser.savedposts;
      savedposts.push(postid);
      await User.updateOne(
        { _id },
        {
          $set: { savedposts },
        }
      );
      res.json({ status: "success" });
    }
  } catch (error) {
    // console.log(error);
    res.json({ status: "error", error: "Invalid Token" });
  }
});

app.post("/api/savedposts/unsave", async (req, res) => {
  const { token, postid } = req.body;
  if (!postid || typeof postid != "string") {
    return res.json({ status: "error", error: "Invalid Post ID." });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

    const _id = user.id;
    const founduser = await User.findOne({ _id }).lean();
    if (!founduser) {
      res.json({ status: "error", error: "User does'nt exist" });
    } else {
      const oldsavedposts = founduser.savedposts;
      const savedposts = oldsavedposts.filter((item) => {
        return item != postid;
      });
      await User.updateOne(
        { _id },
        {
          $set: { savedposts },
        }
      );
      res.json({ status: "success" });
    }
  } catch (error) {
    // console.log(error);
    res.json({ status: "error", error: "Invalid Token" });
  }
});

app.listen(80, () => {
  console.log("Server is up");
});
