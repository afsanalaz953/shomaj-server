import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
app.use(express.json());
const PORT = 5000


const client = new MongoClient(process.env.MONGO_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
 
const mongoClient = await connectToMongoDB()
const db = mongoClient.db("project-express")
 const allEventsCollections = db.collection("allEvents");
app.get('/', (req, res) => {

  res.send('Hello World!')
})
// upcomming events
app.get('/upcomming', async(req, res) => {
  

const result= await allEventsCollections.find().toArray()
res.json(result);
console.log( "AllEvents in server", result)
 })


// upcomming end

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
})