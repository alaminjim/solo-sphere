const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
  MongoClient,
  ServerApiVersion,
  Collection,
  ObjectId,
} = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster4.7llpb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster4`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobCollection = client.db("job-portal").collection("jobs");
    const bidCollection = client.db("job-portal").collection("bids");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, "token", { expiresIn: "1d" });
      res.send(token);
    });

    // add jobs

    app.post("/add-job", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get data by a email

    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    // delete

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    // update

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const job = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          job,
        },
      };
      const options = { upsert: true };
      const result = await jobCollection.updateOne(query, update, options);
      res.send(result);
    });

    // bid collection

    app.post("/bid-job", async (req, res) => {
      const bid = req.body;

      // if a user placed a bid already in this job

      const query = { email: bid.email, jobId: bid.jobId };
      const alreadyExist = await bidCollection.findOne(query);
      if (alreadyExist) {
        return res.status(400).send("You Have Al Ready Exist");
      }

      const result = await bidCollection.insertOne(bid);

      // bid counts
      const filter = { _id: new ObjectId(bid.jobId) };
      const update = {
        $inc: { bid_count: 1 },
      };

      const updateBid = await jobCollection.updateOne(filter, update);

      res.send(result);
    });

    app.get("/bids/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bid-request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { buyer: email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bid-status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: { status },
      };
      const result = await bidCollection.updateOne(filter, update);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
