require("dotenv").config();
const express = require("express");
const cors = require("cors");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api", notificationRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
