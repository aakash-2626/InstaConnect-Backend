const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  // authorization === Bearer 'token'
  if (!authorization) {
    return res.status(401).json({ error: "Please log in to continue." });
  }

  const token = authorization.replace("Bearer ", "");
  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(401).json({ error: "Please log in to continue." });
    }

    const { _id } = payload;
    req.user = await User.findById(_id);
    next();
  });
};
