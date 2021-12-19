const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
require("./models/user");
require("./models/post");

mongoose.connect(process.env.MONGODB_URL, () =>
  console.log("Connected to MongoDB")
);

app.use(cors());
app.use(express.json());
app.use(require("./routes/auth"));
app.use(require("./routes/post"));
app.use(require("./routes/user"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running at Port ${PORT}`));
