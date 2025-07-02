require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dns = require("dns");
const url = require("url");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// In-memory storage for URLs
const urlDatabase = {};
let urlCounter = 1;

// URL validation function
function isValidUrl(urlString) {
  try {
    const parsedUrl = new URL(urlString);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (err) {
    return false;
  }
}

// Function to validate URL with DNS lookup
function validateUrlWithDns(urlString, callback) {
  if (!isValidUrl(urlString)) {
    return callback(false);
  }

  const parsedUrl = new URL(urlString);
  const hostname = parsedUrl.hostname;

  dns.lookup(hostname, (err) => {
    if (err) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// POST endpoint to create short URL
app.post("/api/shorturl", function (req, res) {
  const originalUrl = req.body.url;

  if (!originalUrl) {
    return res.json({ error: "invalid url" });
  }

  validateUrlWithDns(originalUrl, (isValid) => {
    if (!isValid) {
      return res.json({ error: "invalid url" });
    }

    // Check if URL already exists
    for (let id in urlDatabase) {
      if (urlDatabase[id] === originalUrl) {
        return res.json({
          original_url: originalUrl,
          short_url: parseInt(id),
        });
      }
    }

    // Store new URL
    const shortUrl = urlCounter++;
    urlDatabase[shortUrl] = originalUrl;

    res.json({
      original_url: originalUrl,
      short_url: shortUrl,
    });
  });
});

// GET endpoint to redirect to original URL
app.get("/api/shorturl/:short_url", function (req, res) {
  const shortUrl = req.params.short_url;

  // Check if short_url is a valid number
  if (!/^\d+$/.test(shortUrl)) {
    return res.json({ error: "invalid url" });
  }

  const originalUrl = urlDatabase[parseInt(shortUrl)];

  if (originalUrl) {
    res.redirect(originalUrl);
  } else {
    res.json({ error: "No short URL found for the given input" });
  }
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
