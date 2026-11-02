import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';


const app = express();
app.use(express.json());
const PORT = 5000
app.use(cors())

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
 const oldEventsCollections = db.collection("oldEvents");
 const createCollections = db.collection("createEvents")
app.get('/', (req, res) => {

  res.send('Hello World!')
})
// upcomming events
// 1)For create
app.post('/create', async(req, res)=> {
  const createData = req.body
  const result = await allEventsCollections.insertOne(createData)
  console.log("servercreatedata", result)
  res.send({message: "create api working"})
})
// 2)create end

app.get('/upcomming', async(req, res) => {
const result= await allEventsCollections.find().sort({ _id: -1 }).toArray()
res.json(result);
console.log( "AllEvents in server", result)
 })

 app.get('/featured', async(req, res) =>{
const result = await allEventsCollections.find().sort({ _id: -1 }).limit(6).toArray()
res.json(result);
 })

// 3)upcomming end
// oldEvents for Gallery
 app.get('/gallery', async(req, res) =>{
const result = await oldEventsCollections.find().toArray()
res.json(result);
 })
// oldEvents for Gallery





app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
})