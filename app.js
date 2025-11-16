const express = require("express");
const app = express();
const port = process.env.PORT || 8080;
const path = require("path");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/application");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "/public/CSS")));
app.use(express.static(path.join(__dirname, "/public/image")));
app.use(express.static(path.join(__dirname, "/public/uploads")));

// Authentication routes
app.use("/api/auth", authRoutes);

// Application routes
app.use("/api", applicationRoutes);

// Profile routes
app.use("/api/profile", profileRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.render("index.ejs");
});
app.get("/login.html", (req, res) => {
  res.render("login.ejs");
});
app.get("/login.ejs", (req, res) => {
  res.render("login.ejs");
});
app.get("/signup.html", (req, res) => {
  res.render("signup.ejs");
});
app.get("/signup.ejs", (req, res) => {
  res.render("signup.ejs");
});
app.get("/viewjob.html", (req, res) => {
  res.render("viewjob.ejs");
});
app.get("/profile.html", (req, res) => {
  res.render("profile.ejs");
});
app.get("/profile.ejs", (req, res) => {
  res.render("profile.ejs");
});
app.get("/admin.html", (req, res) => {
  res.render("admin.ejs");
});
app.get("/admin.ejs", (req, res) => {
  res.render("admin.ejs");
});
app.get("/index.ejs", (req, res) => {
  res.render("index.ejs");
});

app.listen(port, () => {
  console.log(`Listening on port :${port}`);
});

