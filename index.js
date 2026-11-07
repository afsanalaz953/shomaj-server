import 'dotenv/config'
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
// import { createLocalJWKSet } from 'jose';
// const { createRemoteJWKSet,  createLocalJWKSet } = ('jose-cjs');
// const { jwtVerify } = ('jose-cjs');
import { createRemoteJWKSet, jwtVerify } from 'jose';

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


// verify Token
 const verifyToken = async(req, res, next) =>{
  const authHeader= req?.headers.authorization
  
    if(!authHeader){
    return res.status(401).json({message:
    "Unauthorized"
    });
  }
   console.log (authHeader, "auth")
 const token = authHeader.split(" ")[1];
  console.log(token)
 if(!token){
    return res.status(401).json({message:
       "Unauthorized"
    });
 }
 // verification by JWKS
const JWKS = createRemoteJWKSet(
 new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
  )
// // payload in try catch
 try {
  
    // const JWKS = await getJWKS();   // <---- এই লাইনটি বসবে
 const { payload } = await jwtVerify(token, JWKS) 
   console.log(payload, "payload");
     next()
  } catch (error) {
     console.log(error);
     return res.status(403).json({message:
      "Forbidden"
      });
  }
 };
//  verification end

const mongoClient = await connectToMongoDB()
const db = mongoClient.db("project-express")
 const allEventsCollections = db.collection("allEvents");
 const oldEventsCollections = db.collection("oldEvents");
 const joinedCollections = db.collection("joinEvents")
app.get('/', (req, res) => {

  res.send('Hello World!')
})
// upcomming events
// 1)For create
app.post('/create', verifyToken, async(req, res)=> {
  const createData = req.body
  const result = await allEventsCollections.insertOne(createData)
  console.log("servercreatedata", result)
  res.send({message: "create api working"})
})
// 2)create end

// app.get('/upcoming', async(req, res) => {
// const result= await allEventsCollections.find().sort({ _id: -1 }).toArray()
// res.json(result);
// console.log( "AllEvents in server", result)
//  })

 app.get('/featured', async(req, res) =>{
const result = await allEventsCollections.find().sort({ _id: -1 }).limit(6).toArray()
res.json(result);
 })
//  upcoming search
// app.get('/upcoming', async (req, res) => {
//   console.log("🔍 Full query params:", req.query);
//   try {
//     const { search } = req.query;
//     let query = {};   // ← বেস কোয়েরি অবজেক্ট

//     // নাম অনুযায়ী সার্চ
//     if (search) {
//       query.title = { $regex: search, $options: 'i' };
//      console.log("📝 Search query:", query);
//   }
//     // কোয়েরি এক্সিকিউট
//     const result = await allEventsCollections.find(query).sort({ _id: -1 }).toArray();
//     console.log("✅ Found:", result.length, "upcoming events");
//    res.json(result);   // সব সময় JSON রিটার্ন করবে
//   } catch (error) {
//    console.error('Error in /events:', error);
//      res.status(500).json({ error: 'Internal server error' });
//    }
// });
app.get('/upcoming', async (req, res) => {
  console.log("🔍 Full query params:", req.query);
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();

    const query = {};

    // 🔎 নাম দিয়ে search
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.title = { $regex: safe, $options: 'i' };
    }

    // 📂 category filter (case-insensitive exact match)
    if (category && category !== "all") {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    console.log("📝 Search query:", query);

    const result = await allEventsCollections
      .find(query)
      .sort({ _id: -1 })
      .toArray();

    console.log("✅ Found:", result.length, "upcoming events");
    res.json(result);
  } catch (error) {
    console.error('Error in /upcoming:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3)upcomming end


// DetailsEvents
app.get('/upcoming/:id', async(req,res) =>{
  const {id} =req.params;
  const result = await allEventsCollections.findOne({_id:new ObjectId(id)})
//  console.log(id, 'id')
  res.send(result)
})

// Joined page
// backend a joined info phathano
// app.post('/joined', async(req, res)=> {
//   const joinedData = req.body
//   const result = await joinedCollections.insertOne(joinedData)
//   console.log("serverjoineddata", result)
//   res.send({message: "joined api working"})
// })
//  app.get('/joined/:userId', async(req, res) => {
//    const {userId} = req.params;
//    console.log(userId,"userId for joined")

// const result= await joinedCollections.find({userId:userId}).toArray()
// res.send(result);
//  })
app.post('/joined',  async (req, res) => {
  try {
    // const joinedData = req.body;
     const { _id, ...joinedData } = req.body;
    const { userId, eventId } = joinedData;

    if (!userId || !eventId) {
      return res.status(400).send({ message: 'userId and eventId are required' });
    }

    // 🔍 আগেই join করা কিনা চেক
    const already = await joinedCollections.findOne({ userId, eventId });
    if (already) {
      return res.status(409).send({
        message: 'You have already joined this event',
        alreadyJoined: true,
      });
    }

    const result = await joinedCollections.insertOne({
      ...joinedData,
      joinedAt: joinedData.joinedAt ?? new Date().toISOString(),
    });

    console.log('serverjoineddata', result);
    return res.send({
      message: 'joined api working',
      insertedId: result.insertedId,
    });
  } catch (err) {
    // 🛡️ race condition হলে unique index duplicate key দেবে
    if (err?.code === 11000) {
      return res.status(409).send({
        message: 'You have already joined this event',
        alreadyJoined: true,
      });
    }
    console.error('POST /joined error', err);
    return res.status(500).send({ message: 'Server error' });
  }
});
 app.get('/joined/:userId', verifyToken, async(req, res) => {
   const {userId} = req.params;
   console.log(userId,"userId for joined")

const result= await joinedCollections.find({userId:userId}).toArray()
res.send(result);
 })

// Manage page
 app.get('/manage/:userId', verifyToken, async(req, res) => {
   const {userId} = req.params;
   console.log(userId,"userId for my-event")

const result= await allEventsCollections.find({userId:userId}).toArray()
res.send(result);
 })
// for deleted
app.delete("/manage/:userId", async(req, res) =>{
const {userId } = req.params;
 const result = await  allEventsCollections.deleteOne({_id:new ObjectId(userId)});

res.json(result)

});
// for Update
 app.patch("/manage/:id", async (req, res) => {
const {id} = req.params
const updatedData = req.body
console.log(updatedData, 'server updated data')
const result = await  allEventsCollections.updateOne(
  {_id: new ObjectId(id)},
  {$set: updatedData}
)
res.json(result)
 })


// oldEvents for Gallery
 app.get('/gallery', async(req, res) =>{
const result = await oldEventsCollections.find().toArray()
res.json(result);
 })
// oldEvents for Gallery



app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
})