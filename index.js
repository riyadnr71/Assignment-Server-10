// server.js
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());


const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1 },
});
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("myDatabase");
    const collection = db.collection("artworks");
    const artworksCollection = db.collection("artworks");
    const favoritesCollection = db.collection("favorites");

    app.get("/", (req, res) => {
      res.send("Server is running!");
    });

// Public artist profile
app.get("/artist-profile/:email", async (req, res) => {
  const email = req.params.email;

  const artworks = await artworksCollection
    .find({ artistEmail: email })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  res.send(artworks);
});

    // GET all artworks
    app.get("/artworks", async (req, res) => {
      try {
        const artworks = await collection.find().sort({ createdAt: -1 }).toArray();
        res.send(artworks);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // POST new artwork
    app.post("/artworks", async (req, res) => {
      try {
        const newArtwork = { ...req.body, createdAt: new Date() };
        const result = await collection.insertOne(newArtwork);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

    // UPDATE artwork
app.patch("/artworks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


    // DELETE artwork
app.delete("/artworks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

    // GET artwork by id
    app.get("/artworks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id)
        const artwork = await collection.findOne({ _id: new ObjectId(id) });
        if (!artwork) return res.status(404).send({ error: "Artwork not found" });
        res.send(artwork);
      } catch (err) {
        res.status(500).send({ error: err.message });
      }
    });

// MyGallery
  app.get("/my-artworks", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({ error: "Email is required" });
    }

    const result = await collection
      .find({ artistEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// home page card

app.get("/artworks/featuredArtworks", async (req, res) => {
  try {
    const artworks = await collection
      .find({})
      .sort({ _id: -1 })
      .limit(6)
      .toArray();

    res.send(artworks);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});




// Aggregation for Top Artists
app.get("/top-artists", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$artistEmail",
          artistName: { $first: "$artistName" },
          artistPhoto: { $first: "$artistPhoto" },
          totalArtworks: { $sum: 1 },
          totalLikes: { $sum: { $ifNull: ["$likes", 0] } },
        },
      },
      { $sort: { totalLikes: -1 } }, // Most liked first
      { $limit: 4 }, // Top 5 artists
    ];

    const topArtists = await collection.aggregate(pipeline).toArray();
    res.send(topArtists);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


// trending artworks
app.get("/trending-artworks", async (req, res) => {
  try {
    const artworks = await collection
      .find({}) 
      .sort({ likes: -1 })
      .limit(3)
      .toArray();

    res.send(artworks);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});




// Like Artwork
app.get("/artworks", async (req, res) => {
  const result = await artworksCollection.find().toArray();
  res.send(result);
});


// Like Artwork
app.patch("/artworks/like/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({ message: "User email required" });
    }

    const artwork = await collection.findOne({ _id: new ObjectId(id) });

    // already liked check
    if (artwork?.likedBy?.includes(email)) {
      return res.status(400).send({ message: "You already liked this artwork" });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { likes: 1 },
        $push: { likedBy: email },
      }
    );

    res.send({ success: true });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


app.post("/favorites", async (req, res) => {
  try {
    const { artworkId, userEmail, title, image, category, artistName } = req.body;

    if (!userEmail) return res.status(400).send({ message: "User email required" });

    const exists = await favoritesCollection.findOne({ artworkId, userEmail });
    if (exists) return res.status(400).send({ message: "Already in favorites" });

    const result = await favoritesCollection.insertOne({
      artworkId,
      userEmail,
      title,
      image,
      artistName
     
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Get my favorites
app.get("/favorites", async (req, res) => {
  try {
    const email = req.query.email;
    const favorites = await favoritesCollection.find({ userEmail: email }).toArray();
    res.send(favorites);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Delete favorite
app.delete("/favorites/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});





    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);
