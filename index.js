const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); // <-- Add ObjectId here

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

// New route for fetching reviews by user email
app.get('/myreviews/:userEmail', async (req, res) => {
  try {
    const userEmail = decodeURIComponent(req.params.userEmail);

    const database = client.db('local-server');
    const reviewsCollection = database.collection('reviews');

    const userReviews = await reviewsCollection
      .find({ userEmail: userEmail })
      .sort({ reviewDate: -1 })
      .toArray();

    res.json(userReviews);
  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/reviews', async (req, res) => {
  try {
    const review = req.body;

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
      return res.status(201).json({ message: 'Review added successfully!' });
    } else {
      return res.status(500).json({ message: 'Failed to add review!' });
    }
  } catch (error) {
    console.error('Error adding review:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// DELETE route to delete a review by id
app.delete('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const database = client.db('local-server');
    const reviewsCollection = database.collection('reviews');

    const result = await reviewsCollection.deleteOne({ _id: new ObjectId(reviewId) });

    if (result.deletedCount === 1) {
      return res.status(200).json({ message: 'Review deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Review not found' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// PUT route to update a review by id
app.put('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    const updateData = req.body;

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const database = client.db('local-server');
    const reviewsCollection = database.collection('reviews');

    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (result.modifiedCount === 1) {
      return res.status(200).json({ message: 'Review updated successfully' });
    } else {
      return res.status(200).json({ message: 'No changes made to the review' });
    }
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/', (req, res) => res.send('Server is running!'));

const PORT = process.env.PORT || 5000;

run().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
