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
    res.status(500).json({ error: 'Server error!Try again.'});
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
    res.status(500).json({ message: 'Internal Server Error!' });
  }
});
run();


app.get('/', (req, res) => res.send('Server is running!'));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
