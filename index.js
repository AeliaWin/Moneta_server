// require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const  {router: expenseRouter} = require("./routes/expense");
const reminderRoute = require("./routes/reminder");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/expenses", expenseRouter);
app.use("/api", reminderRoute);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
