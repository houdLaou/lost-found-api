const express = require("express");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(express.json());

// Validate report fields
function validateItem(body) {
  const { title, description, location, status, contact } = body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof location !== "string" ||
    !location.trim() ||
    typeof contact !== "string" ||
    !contact.trim() ||
    !["lost", "found"].includes(status)
  ) {
    return false;
  }

  return true;
}

// Home route
app.get("/", (req, res) => {
  res.json({ message: "Lost & Found API is running" });
});

// Create a report
app.post("/items", (req, res) => {
  if (!validateItem(req.body)) {
    return res.status(400).json({
      error:
        "Provide title, description, location, contact, and a valid status (lost or found).",
    });
  }

  const { title, description, location, status, contact } = req.body;

  const result = db
    .prepare(
      `
        INSERT INTO items (title, description, location, status, contact)
        VALUES (?, ?, ?, ?, ?)
    `,
    )
    .run(
      title.trim(),
      description.trim(),
      location.trim(),
      status,
      contact.trim(),
    );

  const item = db
    .prepare("SELECT * FROM items WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(item);
});

// List reports, optionally filtered by status
app.get("/items", (req, res) => {
  const { status } = req.query;

  if (status && !["lost", "found"].includes(status)) {
    return res.status(400).json({
      error: "Status must be lost or found.",
    });
  }

  const items = status
    ? db
        .prepare("SELECT * FROM items WHERE status = ? ORDER BY id DESC")
        .all(status)
    : db.prepare("SELECT * FROM items ORDER BY id DESC").all();

  res.json(items);
});

// Get one report
app.get("/items/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid item ID." });
  }

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

  if (!item) {
    return res.status(404).json({ error: "Item not found." });
  }

  res.json(item);
});

// Update a report
app.put("/items/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid item ID." });
  }

  if (!validateItem(req.body)) {
    return res.status(400).json({
      error: "Provide all required fields and a valid status.",
    });
  }

  const { title, description, location, status, contact } = req.body;

  const result = db
    .prepare(
      `
        UPDATE items
        SET title = ?, description = ?, location = ?,
            status = ?, contact = ?
        WHERE id = ?
    `,
    )
    .run(
      title.trim(),
      description.trim(),
      location.trim(),
      status,
      contact.trim(),
      id,
    );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Item not found." });
  }

  res.json(db.prepare("SELECT * FROM items WHERE id = ?").get(id));
});

// Delete a report
app.delete("/items/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid item ID." });
  }

  const result = db.prepare("DELETE FROM items WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Item not found." });
  }

  res.status(204).send();
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
