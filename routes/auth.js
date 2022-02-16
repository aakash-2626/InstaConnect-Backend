const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const User = mongoose.model("User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");

const transporter = nodemailer.createTransport(
  sendGridTransport({
    auth: {
      api_key: process.env.SENDGRID_API,
    },
  })
);

router.post("/signup", async (req, res) => {
  const { name, email, password, image } = req.body;
  if (!name || !email || !password) {
    return res.status(422).json({ error: "Please fill all the fields." });
  }

  let user = await User.findOne({ email });
  if (user) {
    return res.status(422).json({ error: "Email already registered." });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  user = new User({
    name,
    email,
    password: hashedPassword,
    image,
  });

  await user.save();
  transporter.sendMail({
    to: user.email,
    from: "no.reply.instaconnect@gmail.com",
    subject: "InstaConnect - Sign Up Successful !!",
    html: `<h2>Hi ${user.name},<h2><h3>Welcome to InstaConnect.</h3>`,
  });
  return res.json({
    message: "Signed up Successfully. Please Sign in to continue.",
  });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ error: "Please fill all the fields." });
  }

  let user = await User.findOne({ email });
  if (!user) {
    return res.status(422).json({ error: "Wrong Email or Password" });
  }

  const passMatch = await bcrypt.compare(password, user.password);
  if (!passMatch) {
    return res.status(422).json({ error: "Wrong Email or Password" });
  }

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  const { _id, name, followers, following, image } = user;
  return res.json({
    token,
    user: { _id, name, email, followers, following, image },
  });
});

router.post("/reset-password", (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return;
    }

    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        return res
          .status(422)
          .json({ error: "Check your email to reset your password." });
      }
      user.resetToken = token;
      user.expireToken = Date.now() + 3600000; // 1 hr
      user.save().then((result) => {
        transporter
          .sendMail({
            to: user.email,
            from: "no.reply.instaconnect@gmail.com",
            subject: "InstaConnect - Reset Password",
            html: `
          <h2>Hi ${user.name},<h2><h3>Click <a href="${process.env.FRONTEND_LINK}/resetPassword/${token}">here</a> to reset your password.</h3><h4>This link is valid only for 1 hour.</h4>
          `,
          })
          return res.json({
            message: "Check your email to reset your password.",
          });
      });
    });
  });
});

router.post("/new-password", (req, res) => {
  const newPassword = req.body.password;
  const sentToken = req.body.token;
  User.findOne({ resetToken: sentToken, expireToken: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        return res
          .status(422)
          .json({ error: "Session Expired. Please try again." });
      }
      bcrypt.hash(newPassword, 12).then((hashedPassword) => {
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.expireToken = undefined;
        user.save().then((result) => {
          return res.json({
            message:
              "Password updated successfully. Please sign in to continue.",
          });
        });
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

module.exports = router;
