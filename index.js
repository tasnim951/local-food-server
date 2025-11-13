const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://local-server:xyKaziuHWWNlkxES@cluster0.fez2prt.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

//          -------- ROUTES ---------


app.get('/reviews', async (req, res) => {
  try {
    const reviews = await client.db('local-server').collection('reviews')
      .find({}).sort({ reviewDate: -1 }).toArray();
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/allreviews', async (req, res) => {
  try {
    const reviews = await client.db('local-server').collection('alldata')
      .find({})
      .sort({ reviewDate: -1 })
      .toArray();
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch all reviews:', error);
    res.status(500).json({ message: 'Internal Server Error!' });
  }
});


app.get('/my-reviews/:userEmail', async (req, res) => {
  try {
    const userEmail = decodeURIComponent(req.params.userEmail);
    const reviews = await client.db('local-server').collection('reviews')
      .find({ userEmail }).sort({ reviewDate: -1 }).toArray();
    res.json(reviews);
  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get('/reviews/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await client.db('local-server').collection('reviews').findOne({ _id: new ObjectId(id) });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Failed to fetch review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.post('/reviews', async (req, res) => {
  try {
    const review = req.body;
    if (!review.foodName || !review.foodImage || !review.restaurantName || 
        !review.location || !review.starRating || !review.reviewText || !review.userEmail) {
      return res.status(400).json({ message: 'Missing required review fields' });
    }
    review.reviewDate = new Date();
    const result = await client.db('local-server').collection('reviews').insertOne(review);
    if (result.insertedId) return res.status(201).json({ message: 'Review added successfully!' });
    res.status(500).json({ message: 'Failed to add review!' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


const FAVORITES_COLLECTION = 'my-favorites';


app.post('/my-favorites', async (req, res) => {
  try {
    const { userEmail, reviewId } = req.body;
    if (!userEmail || !reviewId) {
      return res.status(400).json({ message: 'Missing userEmail or reviewId' });
    }

    const favoritesCollection = client.db('local-server').collection(FAVORITES_COLLECTION);
    const alldataCollection = client.db('local-server').collection('alldata');

    
    const existing = await favoritesCollection.findOne({ userEmail, reviewId });
    if (existing) {
      return res.status(409).json({ message: 'Already in favorites' });
    }

    const review = await alldataCollection.findOne({ _id: new ObjectId(reviewId) });
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const favoriteDoc = { userEmail, reviewId, review };
    const result = await favoritesCollection.insertOne(favoriteDoc);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ message: 'Server error while adding favorite' });
  }
});


app.get('/my-favorites/:userEmail', async (req, res) => {
  try {
    const userEmail = decodeURIComponent(req.params.userEmail);
    const favoritesCollection = client.db('local-server').collection(FAVORITES_COLLECTION);
    const alldataCollection = client.db('local-server').collection('alldata');

    const favorites = await favoritesCollection.find({ userEmail }).toArray();

    const populated = await Promise.all(favorites.map(async (fav) => {
      const review = await alldataCollection.findOne({ _id: new ObjectId(fav.reviewId) });
      return { ...fav, review };
    }));

    res.json(populated);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.delete('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;
    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const result = await client.db('local-server').collection('reviews').deleteOne({ _id: new ObjectId(reviewId) });

    if (result.deletedCount === 1) {
      return res.json({ message: 'Review deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Review not found' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.put('/reviews/:id', async (req, res) => {
  try {
    const reviewId = req.params.id;

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const updatedData = { ...req.body };
    
    
    delete updatedData._id;

   

    const result = await client.db('local-server').collection('reviews').updateOne(
      { _id: new ObjectId(reviewId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.delete('/my-favorites/:id', async (req, res) => {
  try {
    const favoriteId = req.params.id;
    if (!ObjectId.isValid(favoriteId)) return res.status(400).json({ message: 'Invalid favorite ID' });

    const result = await client.db('local-server').collection(FAVORITES_COLLECTION)
      .deleteOne({ _id: new ObjectId(favoriteId) });

    if (result.deletedCount === 1) return res.json({ message: 'Favorite removed successfully' });
    res.status(404).json({ message: 'Favorite not found' });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ message: 'Internal Server Error!' });
  }
});



app.get('/details/:foodName', async (req, res) => {
  try {
    const foodName = decodeURIComponent(req.params.foodName);
    const details = await client.db('local-server').collection('details').findOne({ foodName });
    if (!details) {
      return res.status(404).json({ message: 'Details not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Error fetching details:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


const PORT = process.env.PORT || 5000;

run().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
