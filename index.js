const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://local-server:xyKaziuHWWNlkxES@cluster0.fez2prt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// GET detail for a specific food name
app.get('/details/:foodName', async (req, res) => {
  try {
    const foodName = req.params.foodName;
    const detail = await client
      .db('local-server')
      .collection('details')
      .findOne({ foodName: foodName });

    if (!detail) {
      console.log('No details found for:', foodName);
      return res.status(404).json({ message: 'Details not found' });
    }

    res.json(detail);
  } catch (error) {
    console.error('Error fetching detail:', error);
    res.status(500).json({ error: 'Server error! Try again.' });
  }
});

// GET all reviews (sorted descending by reviewDate)
app.get('/allreviews', async (req, res) => {
  try {
    const database = client.db('local-server');
    const allReviewsCollection = database.collection('alldata');
    const reviews = await allReviewsCollection
      .find({})
      .sort({ reviewDate: -1 })
      .toArray();

    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch all reviews:', error);
    res.status(500).json({ message: 'Internal Server Error!' });
  }
});

// GET all reviews (generic)
app.get('/reviews', async (req, res) => {
  try {
    const database = client.db('local-server');
    const reviewsCollection = database.collection('reviews');
    const reviews = await reviewsCollection.find({}).toArray();
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    res.status(500).json({ message: 'Internal Server Error!' });
  }
});

// *** ADD THIS POST /reviews ROUTE ***
app.post('/reviews', async (req, res) => {
  try {
    const review = req.body;

    // Basic validation
    if (
      !review.foodName ||
      !review.foodImage ||
      !review.restaurantName ||
      !review.location ||
      !review.starRating ||
      !review.reviewText ||
      !review.userEmail
    ) {
      return res.status(400).json({ message: 'Missing required review fields' });
    }

    const database = client.db('local-server');
    const reviewsCollection = database.collection('reviews');

    const result = await reviewsCollection.insertOne(review);

    if (result.insertedId) {
      return res.status(201).json({ message: 'Review added successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to add review' });
    }
  } catch (error) {
    console.error('Error adding review:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => res.send('Server is running!'));

// Start server and connect to DB
const PORT = process.env.PORT || 5000;

run().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
